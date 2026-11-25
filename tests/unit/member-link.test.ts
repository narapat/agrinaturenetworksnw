import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as firebaseAdmin from '@/lib/firebaseAdmin';
import { createAdminSessionToken, sessionDurationFor } from '@/lib/adminSession';
import { hashLinkToken, LINK_CODE_TTL_MS } from '@/lib/memberLink';
import { FakeFirestore } from './helpers/fakeFirestore';
import { POST as createLinkPOST } from '@/app/api/admin/members/[memberId]/link-code/route';
import { POST as linkPOST } from '@/app/api/member/link/route';

/**
 * ลิงก์ผูกบัญชี LINE ครั้งเดียว: แอดมินออกลิงก์ → สมาชิกเก่าเข้าสู่ระบบด้วย LINE ของตัวเอง → ผูกกับบัญชีเดิม
 */

const ADMIN_UID = 'U_ADMIN_LINE_0001';
const OLD_MEMBER_UID = 'U_OLD_FARMER_LINE';

function adminCookie(method: 'line' | 'passcode') {
  const now = Date.now();
  return `nsw_admin_auth_session=${createAdminSessionToken({
    role: 'admin',
    method,
    issuedAt: now,
    expiresAt: now + sessionDurationFor(method),
    lineUserId: method === 'line' ? ADMIN_UID : undefined,
    actorName: 'ป้าแอดมิน',
  })}`;
}

const createReq = (memberId: string, auth: 'line' | 'passcode' | 'none') =>
  new NextRequest(`http://localhost:3000/api/admin/members/${memberId}/link-code`, {
    method: 'POST',
    headers: auth === 'none' ? {} : { cookie: adminCookie(auth) },
  });

const linkReq = (token: unknown, idToken: string | null = 'line-id-token') =>
  new NextRequest('http://localhost:3000/api/member/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ token }),
  });

/** LINE verify ตอบว่า token นี้เป็นของ sub */
function lineSaysUserIs(sub: string) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({ ok: true, json: async () => ({ sub, name: 'x' }) }) as Response);
}

describe('Account link via one-time admin link', () => {
  const originalEnv = process.env;
  let db: FakeFirestore;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars',
      ADMIN_LINE_USER_IDS: ADMIN_UID,
      LINE_CHANNEL_ID: '2011512009',
    };
    db = new FakeFirestore();
    // สมาชิกเก่าที่ไม่เคยผูก LINE
    db.seed('members/mem-old', { fullName: 'ลุงเก่า', status: 'approved', farmId: 'farm-old' });
    db.seed('members/mem-old/private/pii', { phone: '0811111111' });
    db.seed('farms/farm-old', { memberId: 'mem-old', farmName: 'สวนลุง', status: 'approved' });
    db.seed('farms/farm-old/private/contact', { phone: '0811111111' });
    db.seed('products/prod-old', { farmId: 'farm-old', title: 'มะม่วง' });
    // สมาชิกที่ผูกแล้ว + ของคนอื่นที่ต้องไม่ถูกแตะ
    db.seed('members/mem-linked', { fullName: 'คนผูกแล้ว', status: 'approved', ownerUid: 'U_LINKED', lineUserId: 'U_LINKED', farmId: 'farm-linked' });
    db.seed('registrations/U_LINKED', { memberId: 'mem-linked' });
    db.seed('products/prod-other', { farmId: 'farm-linked', ownerUid: 'U_LINKED', title: 'ผัก' });
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(db as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  async function issueLink(memberId = 'mem-old') {
    const res = await createLinkPOST(createReq(memberId, 'line'), { params: { memberId } });
    expect(res.status).toBe(200);
    return (await res.json()).token as string;
  }

  describe('admin: create link', () => {
    it('LINE admin gets a token; only its hash is stored; audit logged', async () => {
      const token = await issueLink();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const stored = db.read(`memberLinkCodes/${hashLinkToken(token)}`);
      expect(stored).toMatchObject({ memberId: 'mem-old' });
      expect(JSON.stringify(db.paths('memberLinkCodes/'))).not.toContain(token);
      expect(db.paths('auditLogs/').map((p) => db.read(p)!.action)).toContain('admin_create_link_code');
    });

    it('passcode admin is refused (403) and nothing is written', async () => {
      const res = await createLinkPOST(createReq('mem-old', 'passcode'), { params: { memberId: 'mem-old' } });
      expect(res.status).toBe(403);
      expect(db.paths('memberLinkCodes/')).toEqual([]);
    });

    it('no admin session → 401', async () => {
      const res = await createLinkPOST(createReq('mem-old', 'none'), { params: { memberId: 'mem-old' } });
      expect(res.status).toBe(401);
    });

    it('refuses for a member who is already linked', async () => {
      const res = await createLinkPOST(createReq('mem-linked', 'line'), { params: { memberId: 'mem-linked' } });
      expect(res.status).toBe(400);
    });

    it('a new link cancels the previous unused one', async () => {
      const first = await issueLink();
      const second = await issueLink();
      expect(db.read(`memberLinkCodes/${hashLinkToken(first)}`)).toBeUndefined();
      expect(db.read(`memberLinkCodes/${hashLinkToken(second)}`)).toBeDefined();
    });
  });

  describe('member: use link', () => {
    it('links the verified LINE account to the old member, farm, products; marks link used', async () => {
      const token = await issueLink();
      lineSaysUserIs(OLD_MEMBER_UID);
      const res = await linkPOST(linkReq(token));
      expect(res.status).toBe(200);
      expect(db.read('members/mem-old')).toMatchObject({ ownerUid: OLD_MEMBER_UID, lineUserId: OLD_MEMBER_UID });
      expect(db.read('members/mem-old/private/pii')).toMatchObject({ ownerUid: OLD_MEMBER_UID, phone: '0811111111' });
      expect(db.read('farms/farm-old')).toMatchObject({ ownerUid: OLD_MEMBER_UID });
      expect(db.read('farms/farm-old/private/contact')).toMatchObject({ ownerUid: OLD_MEMBER_UID, phone: '0811111111' });
      expect(db.read('products/prod-old')).toMatchObject({ ownerUid: OLD_MEMBER_UID });
      expect(db.read(`registrations/${OLD_MEMBER_UID}`)).toMatchObject({ memberId: 'mem-old' });
      expect(db.read(`memberLinkCodes/${hashLinkToken(token)}`)).toMatchObject({ usedByLineUserId: OLD_MEMBER_UID });
      expect(db.read('products/prod-other')?.ownerUid).toBe('U_LINKED');
      expect(db.paths('auditLogs/').map((p) => db.read(p)!.action)).toContain('member_link_line_account');
    });

    it('link works only once', async () => {
      const token = await issueLink();
      lineSaysUserIs(OLD_MEMBER_UID);
      expect((await linkPOST(linkReq(token))).status).toBe(200);
      lineSaysUserIs('U_SOMEONE_ELSE');
      const again = await linkPOST(linkReq(token));
      expect(again.status).toBe(410);
      expect(db.read('members/mem-old')?.ownerUid).toBe(OLD_MEMBER_UID);
    });

    it('expired link is refused and writes nothing', async () => {
      const token = await issueLink();
      db.seed(`memberLinkCodes/${hashLinkToken(token)}`, { memberId: 'mem-old', expiresAt: Date.now() - 1 });
      lineSaysUserIs(OLD_MEMBER_UID);
      expect((await linkPOST(linkReq(token))).status).toBe(410);
      expect(db.read('members/mem-old')?.ownerUid).toBeUndefined();
    });

    it('a LINE account that already belongs to a member cannot take the old account', async () => {
      const token = await issueLink();
      lineSaysUserIs('U_LINKED');
      const res = await linkPOST(linkReq(token));
      expect(res.status).toBe(409);
      expect(db.read('members/mem-old')?.ownerUid).toBeUndefined();
      expect(db.read(`memberLinkCodes/${hashLinkToken(token)}`)?.usedAt).toBeUndefined();
    });

    it('a LINE account with a pending registration is refused', async () => {
      db.seed('registrations/U_NEW_APPLICANT', { memberId: 'mem-new-app' });
      const token = await issueLink();
      lineSaysUserIs('U_NEW_APPLICANT');
      expect((await linkPOST(linkReq(token))).status).toBe(409);
    });

    it('unknown / malformed token → refused', async () => {
      lineSaysUserIs(OLD_MEMBER_UID);
      expect((await linkPOST(linkReq('x'.repeat(43)))).status).toBe(404);
      expect((await linkPOST(linkReq('short'))).status).toBe(400);
    });

    it('no LINE login → 401; LINE rejects the token → 401', async () => {
      const token = await issueLink();
      expect((await linkPOST(linkReq(token, null))).status).toBe(401);
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({ ok: false, status: 400, json: async () => ({}) }) as Response);
      expect((await linkPOST(linkReq(token))).status).toBe(401);
      expect(db.read('members/mem-old')?.ownerUid).toBeUndefined();
    });

    it('link expires after 48 hours by design', () => {
      expect(LINK_CODE_TTL_MS).toBe(48 * 60 * 60 * 1000);
    });
  });
});
