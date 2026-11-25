import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/auth/route';
import * as firebaseAdmin from '@/lib/firebaseAdmin';
import { FakeFirestore } from './helpers/fakeFirestore';
import { MEMBER_COOKIE_NAME, MEMBER_SESSION_MS, createMemberSessionToken } from '@/lib/memberSession';
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/adminSession';

/**
 * แอดมินที่ล็อกอิน LINE ไว้แล้ว (มี session cookie ของสมาชิก) ต้องเข้าศูนย์แอดมินได้อัตโนมัติ
 * แม้หน้าเว็บจะยังไม่มี LIFF ID Token (LIFF ยังโหลดไม่เสร็จ / token หมดอายุ)
 */
const ADMIN = 'U11111111111111111111111111111111';
const FARMER = 'U99999999999999999999999999999999';

const getReq = (cookie?: string) =>
  new NextRequest('http://localhost:3000/api/admin/auth', { headers: cookie ? { cookie } : {} });

const adminCookieFrom = (res: Response) => {
  const m = (res.headers.get('set-cookie') || '').match(new RegExp(`${ADMIN_COOKIE_NAME}=([^;]+)`));
  return m ? verifyAdminSessionToken(m[1]) : null;
};

describe('Admin auto-login from the member session cookie', () => {
  const originalEnv = process.env;
  let db: FakeFirestore;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_PASSCODE: 'pass',
      ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars',
      ADMIN_LINE_USER_IDS: ADMIN,
    };
    db = new FakeFirestore();
    db.seed('members/mem-admin', { fullName: 'นรภัทร', ownerUid: ADMIN, status: 'approved' });
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(db as any);
    // ไม่ควรต้องเรียก LINE เลยในเคสนี้
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('LINE should not be called'));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('GET: whitelisted admin with a member session gets a LINE admin session (no ID token needed)', async () => {
    const { token } = createMemberSessionToken(ADMIN);
    const res = await GET(getReq(`${MEMBER_COOKIE_NAME}=${token}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ authenticated: true, method: 'line', actorName: 'นรภัทร' });
    expect(adminCookieFrom(res)).toMatchObject({ method: 'line', lineUserId: ADMIN });
  });

  it('POST: same, without a passcode', async () => {
    const { token } = createMemberSessionToken(ADMIN);
    const res = await POST(
      new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        headers: { cookie: `${MEMBER_COOKIE_NAME}=${token}` },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(200);
    expect(adminCookieFrom(res)?.lineUserId).toBe(ADMIN);
  });

  it('a normal member session is NOT admin', async () => {
    const { token } = createMemberSessionToken(FARMER);
    const res = await GET(getReq(`${MEMBER_COOKIE_NAME}=${token}`));
    expect(res.status).toBe(401);
    expect(adminCookieFrom(res)).toBeNull();
  });

  it('an expired or forged member session is NOT admin', async () => {
    const { token: expired } = createMemberSessionToken(ADMIN, Date.now() - MEMBER_SESSION_MS - 1000);
    expect((await GET(getReq(`${MEMBER_COOKIE_NAME}=${expired}`))).status).toBe(401);

    const forgedPayload = Buffer.from(
      JSON.stringify({ kind: 'member', sub: ADMIN, issuedAt: Date.now(), expiresAt: Date.now() + 1000 })
    ).toString('base64url');
    expect((await GET(getReq(`${MEMBER_COOKIE_NAME}=${forgedPayload}.not-a-real-signature`))).status).toBe(401);
  });

  it('an admin removed from ADMIN_LINE_USER_IDS loses access even with a member session', async () => {
    process.env.ADMIN_LINE_USER_IDS = 'U22222222222222222222222222222222';
    const { token } = createMemberSessionToken(ADMIN);
    expect((await GET(getReq(`${MEMBER_COOKIE_NAME}=${token}`))).status).toBe(401);
  });
});
