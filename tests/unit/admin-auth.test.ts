import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { POST, GET, DELETE } from '@/app/api/admin/auth/route';
import { NextRequest } from 'next/server';
import * as firebaseAdmin from '@/lib/firebaseAdmin';
import { FakeFirestore } from './helpers/fakeFirestore';
import { IP_MAX_FAILURES, GLOBAL_MAX_FAILURES, LOCK_MS } from '@/lib/passcodeRateLimit';

/** จำลองให้ LINE OAuth2 verify ตอบว่า token เป็นของ `sub` นี้ */
function mockLineVerify(sub: string) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ sub, name: 'Test User' }),
  } as Response);
}

describe('Admin Authentication & HMAC-SHA256 Security Tests', () => {
  const originalEnv = process.env;
  let fakeDb: FakeFirestore;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_PASSCODE: 'test-admin-secret-passcode',
      ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars',
      ADMIN_LINE_USER_IDS: 'U11111111111111111111111111111111,U22222222222222222222222222222222',
    };
    fakeDb = new FakeFirestore();
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(fakeDb as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('1. POST /api/admin/auth with valid passcode should authenticate and issue secure cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode: 'test-admin-secret-passcode', actorName: 'ป้าแอดมิน' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.role).toBe('admin');

    // Check cookie
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('nsw_admin_auth_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie?.toLowerCase()).toContain('samesite=strict');
  });

  it('2. POST /api/admin/auth with invalid passcode must be rejected (401)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode: 'wrong-passcode-1234', actorName: 'ป้าแอดมิน' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('3. POST /api/admin/auth with empty or malicious body must be rejected (401)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode: '' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('4. POST /api/admin/auth with a LINE ID Token verified as a whitelisted admin should succeed without passcode', async () => {
    const fetchSpy = mockLineVerify('U11111111111111111111111111111111');
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-line-id-token' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith('https://api.line.me/oauth2/v2.1/verify', expect.anything());

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.role).toBe('admin');
  });

  it('4a. [Bypass regression] POST with a raw whitelisted lineUserId in the body (no verified token) must be rejected', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ lineUserId: 'U11111111111111111111111111111111' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('4b. [Bypass regression] GET with a whitelisted ?lineUserId= query param must NOT issue an admin cookie', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/admin/auth?lineUserId=U11111111111111111111111111111111'
    );

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('4c. A valid LINE ID Token for a NON-whitelisted user must be rejected', async () => {
    mockLineVerify('U_REGULAR_FARMER_9999');
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      headers: { Authorization: 'Bearer valid-but-not-admin' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('4d. A LINE ID Token rejected by LINE (invalid/expired) must be rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'invalid_request', error_description: 'IdToken expired.' }),
    } as Response);
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      headers: { Authorization: 'Bearer forged-or-expired' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('4e. GET with a verified admin LINE ID Token should issue a session cookie', async () => {
    mockLineVerify('U22222222222222222222222222222222');
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      headers: { Authorization: 'Bearer valid-admin-token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('nsw_admin_auth_session=');
  });

  it('5. GET /api/admin/auth with valid session cookie should return authenticated: true', async () => {
    // First login to get cookie
    const loginReq = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode: 'test-admin-secret-passcode', actorName: 'ป้าแอดมิน' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const loginRes = await POST(loginReq);
    const token = loginRes.cookies.get('nsw_admin_auth_session')?.value;
    expect(token).toBeTruthy();

    // Verify via GET
    const verifyReq = new NextRequest('http://localhost:3000/api/admin/auth', {
      headers: {
        cookie: `nsw_admin_auth_session=${token}`,
      },
    });

    const verifyRes = await GET(verifyReq);
    expect(verifyRes.status).toBe(200);
    const json = await verifyRes.json();
    expect(json.authenticated).toBe(true);
    expect(json.role).toBe('admin');
  });

  it('6. GET /api/admin/auth with tampered cookie must be rejected (401)', async () => {
    // Token structure: serializedPayload.hmacSignature
    const fakePayload = Buffer.from(JSON.stringify({
      role: 'admin',
      expiresAt: Date.now() + 1000000,
      issuedAt: Date.now(),
    })).toString('base64url');
    const fakeSignature = 'tampered_signature_attacker';

    const verifyReq = new NextRequest('http://localhost:3000/api/admin/auth', {
      headers: {
        cookie: `nsw_admin_auth_session=${fakePayload}.${fakeSignature}`,
      },
    });

    const verifyRes = await GET(verifyReq);
    expect(verifyRes.status).toBe(401);
    const json = await verifyRes.json();
    expect(json.authenticated).toBe(false);
  });

  it('7. GET /api/admin/auth with expired session must return 401', async () => {
    // Create an expired payload signed with actual secret
    const secret = process.env.ADMIN_SESSION_SECRET!;
    const expiredPayload = {
      role: 'admin',
      expiresAt: Date.now() - 10000, // expired 10 seconds ago
      issuedAt: Date.now() - 20000,
      method: 'passcode',
    };
    const serialized = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(serialized).digest('base64url');

    const verifyReq = new NextRequest('http://localhost:3000/api/admin/auth', {
      headers: {
        cookie: `nsw_admin_auth_session=${serialized}.${signature}`,
      },
    });

    const verifyRes = await GET(verifyReq);
    expect(verifyRes.status).toBe(401);
  });

  it('8. DELETE /api/admin/auth should clear cookie and logout', async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('nsw_admin_auth_session=;');
    expect(setCookie).toContain('Max-Age=0');
  });

  it('9. POST /api/admin/auth without ADMIN_PASSCODE must return 500 and not use hardcoded fallback', async () => {
    delete process.env.ADMIN_PASSCODE;

    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode: 'agrinature2026', actorName: 'x' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain('Server configuration error');
  });

  it('10. POST /api/admin/auth without ADMIN_SESSION_SECRET must return 500 and fail securely', async () => {
    delete process.env.ADMIN_SESSION_SECRET;

    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode: 'test-admin-secret-passcode', actorName: 'ป้าแอดมิน' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain('Server configuration error');
  });
  // ==================== Passcode fallback hardening ====================

  const passcodeReq = (passcode: string, ip = '203.0.113.7', actorName = 'ป้าแอดมิน') =>
    new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode, actorName }),
      headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
    });

  const decodeCookie = (res: Response) => {
    const raw = (res as any).cookies.get('nsw_admin_auth_session')?.value as string;
    return JSON.parse(Buffer.from(raw.split('.')[0], 'base64url').toString('utf-8'));
  };

  it('11. Passcode session must last 3 hours (cookie Max-Age and signed expiry)', async () => {
    const res = await POST(passcodeReq('test-admin-secret-passcode'));
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=10800');
    const payload = decodeCookie(res);
    expect(payload.method).toBe('passcode');
    expect(payload.actorName).toBe('ป้าแอดมิน');
    expect(payload.expiresAt - payload.issuedAt).toBe(3 * 60 * 60 * 1000);
  });

  it('12. LINE session must last 7 days', async () => {
    mockLineVerify('U11111111111111111111111111111111');
    const res = await GET(
      new NextRequest('http://localhost:3000/api/admin/auth', { headers: { Authorization: 'Bearer t' } })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
    expect(decodeCookie(res).method).toBe('line');
  });

  it('13. A forged passcode cookie claiming a 7-day lifetime must be rejected', async () => {
    const secret = process.env.ADMIN_SESSION_SECRET!;
    const now = Date.now();
    const payload = { role: 'admin', method: 'passcode', issuedAt: now, expiresAt: now + 7 * 24 * 3600 * 1000 };
    const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(serialized).digest('base64url');
    const res = await GET(
      new NextRequest('http://localhost:3000/api/admin/auth', {
        headers: { cookie: `nsw_admin_auth_session=${serialized}.${sig}` },
      })
    );
    expect(res.status).toBe(401);
  });

  it('14. Passcode login without an actor name must be rejected (400) and not counted as a failure', async () => {
    const res = await POST(passcodeReq('test-admin-secret-passcode', '203.0.113.7', '   '));
    expect(res.status).toBe(400);
    expect(fakeDb.paths('adminLoginAttempts')).toEqual([]);
  });

  it(`15. [Brute force] ${IP_MAX_FAILURES} wrong guesses from one IP lock that IP — even the correct passcode is refused`, async () => {
    for (let i = 0; i < IP_MAX_FAILURES; i++) {
      expect((await POST(passcodeReq(`wrong-${i}`))).status).toBe(401);
    }
    const locked = await POST(passcodeReq('test-admin-secret-passcode'));
    expect(locked.status).toBe(429);
    expect(locked.headers.get('Retry-After')).toBeTruthy();
    expect(locked.headers.get('set-cookie')).toBeNull();

    // IP อื่นยังเข้าได้
    const other = await POST(passcodeReq('test-admin-secret-passcode', '198.51.100.9'));
    expect(other.status).toBe(200);
  });

  it('16. [Brute force] lock expires after the lock period', async () => {
    const realNow = Date.now();
    for (let i = 0; i < IP_MAX_FAILURES; i++) await POST(passcodeReq(`wrong-${i}`));
    expect((await POST(passcodeReq('test-admin-secret-passcode'))).status).toBe(429);

    vi.spyOn(Date, 'now').mockReturnValue(realNow + LOCK_MS + 1000);
    expect((await POST(passcodeReq('test-admin-secret-passcode'))).status).toBe(200);
  });

  it('17. [Brute force] a successful login resets the IP failure counter', async () => {
    for (let i = 0; i < IP_MAX_FAILURES - 1; i++) await POST(passcodeReq(`wrong-${i}`));
    expect((await POST(passcodeReq('test-admin-secret-passcode'))).status).toBe(200);
    // นับใหม่: ผิดอีก IP_MAX_FAILURES-1 ครั้งต้องยังไม่ล็อก
    for (let i = 0; i < IP_MAX_FAILURES - 1; i++) await POST(passcodeReq(`wrong-again-${i}`));
    expect((await POST(passcodeReq('test-admin-secret-passcode'))).status).toBe(200);
  });

  it(`18. [Brute force] ${GLOBAL_MAX_FAILURES} failures across rotating IPs lock passcode globally, LINE still works`, async () => {
    for (let i = 0; i < GLOBAL_MAX_FAILURES; i++) {
      await POST(passcodeReq(`wrong-${i}`, `10.0.${Math.floor(i / 4)}.${i}`));
    }
    const fresh = await POST(passcodeReq('test-admin-secret-passcode', '192.0.2.200'));
    expect(fresh.status).toBe(429);
    expect((await fresh.json()).message).toContain('LINE');

    mockLineVerify('U11111111111111111111111111111111');
    const lineRes = await POST(
      new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
      })
    );
    expect(lineRes.status).toBe(200);
  });

  it('19. [Fail closed] passcode login must be refused (500) when rate-limit storage is unavailable', async () => {
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(null as any);
    const res = await POST(passcodeReq('test-admin-secret-passcode'));
    expect(res.status).toBe(500);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('20. Raw IPs are not stored as document IDs', async () => {
    await POST(passcodeReq('wrong', '203.0.113.7'));
    const paths = fakeDb.paths('adminLoginAttempts/');
    expect(paths.some((p) => p.includes('203.0.113.7'))).toBe(false);
    expect(paths).toContain('adminLoginAttempts/global');
  });
});
