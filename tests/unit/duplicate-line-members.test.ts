import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as firebaseAdmin from '@/lib/firebaseAdmin';
import { createAdminSessionToken, sessionDurationFor } from '@/lib/adminSession';
import { FakeFirestore } from './helpers/fakeFirestore';
import { pickPrimaryMember } from '@/lib/primaryMember';
import { DELETE as memberDELETE } from '@/app/api/admin/members/[memberId]/route';
import { POST as registerPOST } from '@/app/api/member/register/route';

/**
 * ข้อมูลจริงที่เจอ: บัญชีจริงของแอดมิน (สร้างก่อนมีเอกสาร registrations)
 * และใบสมัครทดสอบที่สมัครทีหลังด้วย LINE เดียวกัน
 */
const PAT = 'U5b707b9529727e51bd908698249178bb';

const adminCookie = () => {
  const now = Date.now();
  return `nsw_admin_auth_session=${createAdminSessionToken({
    role: 'admin', method: 'line', issuedAt: now, expiresAt: now + sessionDurationFor('line'), lineUserId: PAT, actorName: 'Pat',
  })}`;
};
const del = (id: string) =>
  memberDELETE(new NextRequest(`http://localhost:3000/api/admin/members/${id}`, { method: 'DELETE', headers: { cookie: adminCookie() } }), {
    params: { memberId: id },
  });

describe('One LINE account on two members', () => {
  const originalEnv = process.env;
  let db: FakeFirestore;

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars', ADMIN_LINE_USER_IDS: PAT, LINE_CHANNEL_ID: '1' };
    db = new FakeFirestore();
    db.seed('members/mem-real', { fullName: 'นรภัทร', status: 'approved', ownerUid: PAT, lineUserId: PAT, farmId: 'farm-real', createdAt: '2026-09-08' });
    db.seed('farms/farm-real', { memberId: 'mem-real', ownerUid: PAT, farmName: 'โคก หนอง นา ปลาวาฬ', status: 'approved' });
    db.seed('products/prod-real', { farmId: 'farm-real', ownerUid: PAT, title: 'สถานีวัดอากาศ' });
    db.seed('members/mem-test', { fullName: 'ทดสอบ เกษตรกร', status: 'pending', ownerUid: PAT, lineUserId: PAT, farmId: 'farm-test', createdAt: '2026-11-15' });
    db.seed('members/mem-test/private/pii', { ownerUid: PAT, phone: '0899999999' });
    db.seed('farms/farm-test', { memberId: 'mem-test', ownerUid: PAT, farmName: 'แปลงกสิกรรมธรรมชาติ', status: 'pending' });
    db.seed(`registrations/${PAT}`, { ownerUid: PAT, memberId: 'mem-test', farmId: 'farm-test', status: 'pending' });
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(db as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('login picks the approved account, whatever the order', () => {
    const real = { id: 'mem-real', status: 'approved', createdAt: '2026-09-08' };
    const test = { id: 'mem-test', status: 'pending', createdAt: '2026-11-15' };
    expect(pickPrimaryMember([test, real])?.id).toBe('mem-real');
    expect(pickPrimaryMember([real, test])?.id).toBe('mem-real');
  });

  it('admin can delete their own duplicate PENDING application; the real account stays and owns the registration', async () => {
    const res = await del('mem-test');
    expect(res.status).toBe(200);
    expect(db.read('members/mem-test')).toBeUndefined();
    expect(db.read('farms/farm-test')).toBeUndefined();
    expect(db.read('members/mem-test/private/pii')).toBeUndefined();
    // ของจริงไม่ถูกแตะ
    expect(db.read('members/mem-real')?.status).toBe('approved');
    expect(db.read('farms/farm-real')).toBeDefined();
    expect(db.read('products/prod-real')).toBeDefined();
    // registrations ย้ายมาชี้บัญชีจริง (กันสมัครซ้ำต่อไป)
    expect(db.read(`registrations/${PAT}`)).toMatchObject({ memberId: 'mem-real', status: 'approved' });
  });

  it('admin still cannot delete their own APPROVED account', async () => {
    const res = await del('mem-real');
    expect(res.status).toBe(400);
    expect(db.read('members/mem-real')).toBeDefined();
  });

  it('registration is refused when the LINE account already belongs to a member (even without a registrations doc)', async () => {
    db.docs.delete(`registrations/${PAT}`);
    db.docs.delete('members/mem-test');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ sub: PAT, name: 'Pat' }) } as Response);
    const res = await registerPOST(
      new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
        body: JSON.stringify({
          fullName: 'ทดสอบ เกษตรกร', farmName: 'แปลงทดสอบ', district: 'เมืองนครสวรรค์', subdistrict: 'เมือง',
          phone: '0899999999', facePhotoUrl: 'https://example.com/a.jpg', photos: ['https://example.com/b.jpg'], story: 'ทดสอบระบบสมัคร',
        }),
      })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('DUPLICATE_REGISTRATION');
    expect(db.paths('members/').filter((p) => !p.includes('/private'))).toEqual(['members/mem-real']);
  });
});
