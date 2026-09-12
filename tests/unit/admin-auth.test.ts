import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { POST, GET, DELETE } from '@/app/api/admin/auth/route';
import { NextRequest } from 'next/server';

describe('Admin Authentication & HMAC-SHA256 Security Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_PASSCODE: 'test-admin-secret-passcode',
      ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars',
      ADMIN_LINE_USER_IDS: 'U11111111111111111111111111111111,U22222222222222222222222222222222',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('1. POST /api/admin/auth with valid passcode should authenticate and issue secure cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode: 'test-admin-secret-passcode' }),
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
      body: JSON.stringify({ passcode: 'wrong-passcode-1234' }),
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

  it('4. POST /api/admin/auth with whitelisted LINE User ID should succeed without passcode', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ lineUserId: 'U11111111111111111111111111111111' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.role).toBe('admin');
  });

  it('5. GET /api/admin/auth with valid session cookie should return authenticated: true', async () => {
    // First login to get cookie
    const loginReq = new NextRequest('http://localhost:3000/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ passcode: 'test-admin-secret-passcode' }),
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
      body: JSON.stringify({ passcode: 'agrinature2026' }),
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
      body: JSON.stringify({ passcode: 'test-admin-secret-passcode' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain('Server configuration error');
  });
});
