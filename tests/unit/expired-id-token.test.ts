import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as firebaseAdmin from '@/lib/firebaseAdmin';
import * as firebaseAdminAuth from '@/lib/firebaseAdminAuth';
import { FakeFirestore } from './helpers/fakeFirestore';
import { MEMBER_COOKIE_NAME, MEMBER_SESSION_MS, createMemberSessionToken } from '@/lib/memberSession';
import { resolveLineUser } from '@/lib/lineIdToken';
import { POST as authLinePOST } from '@/app/api/auth/line/route';
import { POST as registerPOST } from '@/app/api/member/register/route';
import { POST as auditPOST } from '@/app/api/audit/route';

/**
 * นอกแอป LINE ตัว SDK เก็บ ID Token เดิมไว้ ซึ่งหมดอายุเร็ว ("IdToken expired.")
 * ผู้ใช้ที่ยังมี session cookie (ออกให้หลัง LINE ยืนยันแล้ว อายุ 7 วัน) ต้องใช้งานต่อได้ ไม่เห็นแบนเนอร์ "ฐานข้อมูลล้มเหลว"
 */
const ME = 'U5b707b9529727e51bd908698249178bb';

const lineSaysExpired = () =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status: 400,
    json: async () => ({ error: 'invalid_request', error_description: 'IdToken expired.' }),
  } as Response);

const cookieOf = (sub: string, issuedAt = Date.now()) => `${MEMBER_COOKIE_NAME}=${createMemberSessionToken(sub, issuedAt).token}`;

describe('Expired LIFF ID token, valid member session', () => {
  const originalEnv = process.env;
  let db: FakeFirestore;

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars', ADMIN_LINE_USER_IDS: ME, LINE_CHANNEL_ID: '1' };
    db = new FakeFirestore();
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(db as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('resolveLineUser', () => {
    const req = (headers: Record<string, string>) => new NextRequest('http://localhost:3000/x', { headers });

    it('expired token + valid session → the session user', async () => {
      lineSaysExpired();
      const r = await resolveLineUser(req({ authorization: 'Bearer old', cookie: cookieOf(ME) }));
      expect(r).toMatchObject({ ok: true, sub: ME, via: 'session' });
    });

    it('no token + valid session → the session user', async () => {
      expect(await resolveLineUser(req({ cookie: cookieOf(ME) }))).toMatchObject({ ok: true, sub: ME, via: 'session' });
    });

    it('expired token + no session → 401', async () => {
      lineSaysExpired();
      expect(await resolveLineUser(req({ authorization: 'Bearer old' }))).toMatchObject({ ok: false, status: 401 });
    });

    it('expired session → 401', async () => {
      const r = await resolveLineUser(req({ cookie: cookieOf(ME, Date.now() - MEMBER_SESSION_MS - 1000) }));
      expect(r).toMatchObject({ ok: false, status: 401 });
    });
  });

  describe('POST /api/auth/line { useSession: true }', () => {
    const post = (cookie?: string) =>
      authLinePOST(
        new NextRequest('http://localhost:3000/api/auth/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
          body: JSON.stringify({ useSession: true }),
        })
      );

    it('issues a Firebase token for the session user without calling LINE', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const createCustomToken = vi.fn(async (uid: string) => `tok-${uid}`);
      vi.spyOn(firebaseAdminAuth, 'getAdminAuth').mockReturnValue({ createCustomToken } as any);
      const res = await post(cookieOf(ME));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ success: true, customToken: `tok-${ME}`, role: 'admin', via: 'session' });
      expect(fetchSpy).not.toHaveBeenCalled();
      // ไม่ต่ออายุ session
      expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('401 SESSION_EXPIRED without a valid session', async () => {
      const res = await post();
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe('SESSION_EXPIRED');
    });
  });

  it('audit log works with the session when the token expired', async () => {
    lineSaysExpired();
    const res = await auditPOST(
      new NextRequest('http://localhost:3000/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: 'Bearer old', cookie: cookieOf(ME) },
        body: JSON.stringify({ action: 'member_login', details: 'เข้าสู่ระบบ' }),
      })
    );
    expect(res.status).toBe(200);
    const log = db.paths('auditLogs/').map((p) => db.read(p)!)[0];
    expect(log).toMatchObject({ actorUid: ME, authMethod: 'member_session' });
  });

  it('registration uses the session user, never the body', async () => {
    const OTHER = 'U0000000000000000000000000000abcd';
    const res = await registerPOST(
      new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: cookieOf(OTHER) },
        body: JSON.stringify({
          ownerUid: ME,
          fullName: 'สมหวัง ปลูกผัก', farmName: 'สวนสมหวัง', district: 'เมืองนครสวรรค์', subdistrict: 'เมือง',
          phone: '0812345678', facePhotoUrl: 'https://example.com/a.jpg', photos: ['https://example.com/b.jpg'], story: 'ปลูกผักอินทรีย์',
        }),
      })
    );
    expect(res.status).toBe(201);
    const member = db.paths('members/').filter((p) => !p.includes('/private')).map((p) => db.read(p)!)[0];
    expect(member.ownerUid).toBe(OTHER);
  });
});

describe('liffService.getFreshIdToken', () => {
  it('returns null when the stored ID token has expired, the token otherwise', async () => {
    const { liffService } = await import('@/services/liffService');
    const fake = (expSec: number) => ({ isLoggedIn: () => true, getIDToken: () => 'tok', getDecodedIDToken: () => ({ exp: expSec }) });
    (liffService as any).liffInstance = fake(Math.floor(Date.now() / 1000) - 10);
    expect(liffService.getFreshIdToken()).toBeNull();
    (liffService as any).liffInstance = fake(Math.floor(Date.now() / 1000) + 3600);
    expect(liffService.getFreshIdToken()).toBe('tok');
    (liffService as any).liffInstance = null;
  });
});
