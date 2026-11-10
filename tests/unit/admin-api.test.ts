import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as firebaseAdmin from '@/lib/firebaseAdmin';
import { createAdminSessionToken, sessionDurationFor } from '@/lib/adminSession';
import { FakeFirestore } from './helpers/fakeFirestore';
import { INITIAL_CATEGORY_TAGS, INITIAL_PRACTICE_TAGS } from '@/data/mockData';

import { GET as snapshotGET } from '@/app/api/admin/snapshot/route';
import { POST as memberPOST, DELETE as memberDELETE } from '@/app/api/admin/members/[memberId]/route';
import { POST as assistPOST } from '@/app/api/admin/assist-product/route';
import { POST as categoryPOST } from '@/app/api/admin/categories/route';
import { PATCH as categoryPATCH, DELETE as categoryDELETE } from '@/app/api/admin/categories/[categoryId]/route';
import { POST as practicePOST } from '@/app/api/admin/practices/route';
import { PATCH as practicePATCH, DELETE as practiceDELETE } from '@/app/api/admin/practices/[practiceId]/route';
import { POST as newsPOST } from '@/app/api/admin/news/route';
import { PATCH as newsPATCH, DELETE as newsDELETE } from '@/app/api/admin/news/[newsId]/route';
import { PATCH as productPATCH, DELETE as productDELETE } from '@/app/api/admin/products/[productId]/route';

const ADMIN_UID = 'U_ADMIN_LINE_0001';

function cookieFor(method: 'line' | 'passcode', actorName = 'ป้าแอดมิน') {
  const now = Date.now();
  const token = createAdminSessionToken({
    role: 'admin',
    method,
    issuedAt: now,
    expiresAt: now + sessionDurationFor(method),
    lineUserId: method === 'line' ? ADMIN_UID : undefined,
    actorName,
  });
  return `nsw_admin_auth_session=${token}`;
}

type Auth = 'none' | 'passcode' | 'line';

function req(url: string, method: string, auth: Auth, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth !== 'none') headers.cookie = cookieFor(auth);
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function seedNetwork(db: FakeFirestore) {
  // สมาชิกรออนุมัติ + แปลง + ข้อมูลส่วนตัว
  db.seed('members/mem-p1', { fullName: 'ลุงสมหวัง', status: 'pending', ownerUid: 'U_FARMER_P1', farmId: 'farm-p1' });
  db.seed('members/mem-p1/private/pii', { ownerUid: 'U_FARMER_P1', phone: '0811111111', lineId: 'somwang' });
  db.seed('farms/farm-p1', { memberId: 'mem-p1', ownerUid: 'U_FARMER_P1', farmName: 'สวนสมหวัง', status: 'pending', practices: [] });
  db.seed('farms/farm-p1/private/contact', { ownerUid: 'U_FARMER_P1', phone: '0811111111', internalCoordinates: { lat: 15.7, lng: 100.1 } });
  db.seed('registrations/U_FARMER_P1', { memberId: 'mem-p1' });

  // สมาชิกที่อนุมัติแล้ว มีผลผลิต
  db.seed('members/mem-a1', { fullName: 'ป้าบุญมี', status: 'approved', ownerUid: 'U_FARMER_A1', farmId: 'farm-a1', delegationStatus: 'requested' });
  db.seed('members/mem-a1/private/pii', { ownerUid: 'U_FARMER_A1', phone: '0822222222' });
  db.seed('farms/farm-a1', {
    memberId: 'mem-a1', ownerUid: 'U_FARMER_A1', farmName: 'ไร่บุญมี', status: 'approved',
    district: 'ลาดยาว', subdistrict: 'สร้อยละคร', isPublicPhone: false, isPublicLine: true, lineId: 'boonmee',
    practices: ['โคก หนอง นา', 'เผาถ่านไบโอชาร์'],
  });
  db.seed('farms/farm-a1/private/contact', { ownerUid: 'U_FARMER_A1', phone: '0822222222', internalCoordinates: { lat: 15.8, lng: 100.2 } });
  db.seed('products/prod-a1', { farmId: 'farm-a1', ownerUid: 'U_FARMER_A1', title: 'ถ่าน', skuTagId: 'sku-custom', skuTagName: 'ถ่านพิเศษ', category: 'byproduct' });
  db.seed('products/prod-a2', { farmId: 'farm-a1', ownerUid: 'U_FARMER_A1', title: 'น้ำส้มควันไม้', skuTagId: 'sku-custom', skuTagName: 'ถ่านพิเศษ', category: 'byproduct' });
  db.seed('registrations/U_FARMER_A1', { memberId: 'mem-a1' });

  // ข้อมูลของคนอื่นที่ต้องไม่ถูกแตะ
  db.seed('members/mem-x', { fullName: 'คนอื่น', status: 'approved', ownerUid: 'U_OTHER', farmId: 'farm-x' });
  db.seed('farms/farm-x', { memberId: 'mem-x', ownerUid: 'U_OTHER', farmName: 'แปลงอื่น', status: 'approved', practices: ['โคก หนอง นา'] });
  db.seed('products/prod-x', { farmId: 'farm-x', ownerUid: 'U_OTHER', title: 'ผักบุ้ง', skuTagId: 'sku-other' });

  db.seed('categories/sku-custom', { name: 'ถ่านพิเศษ', category: 'byproduct', icon: '🔥', description: '', isActive: true });
  db.seed('categories/sku-target', { name: 'ถ่านทั่วไป', category: 'byproduct', icon: '🔥', description: '', isActive: true });
  db.seed('practices/practice-a', { name: 'เผาถ่านไบโอชาร์', category: 'energy', categoryName: 'x', icon: '🔥', description: '', isActive: true });
  db.seed('practices/practice-b', { name: 'ไบโอชาร์ใหม่', category: 'energy', categoryName: 'x', icon: '🔥', description: '', isActive: true });
  db.seed('news/news-1', { title: 'เอามื้อ', content: 'มาช่วยกัน', category: 'เอามื้อสามัคคี', date: '1 ธ.ค.', location: 'ศูนย์', district: 'เมือง', coverImage: 'https://x/y.jpg', author: 'แอดมิน', status: 'published' });
}

const auditLogs = (db: FakeFirestore) => db.paths('auditLogs/').map((p) => db.read(p)!);

describe('Admin Server API (Phase 1)', () => {
  const originalEnv = process.env;
  let db: FakeFirestore;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars',
      ADMIN_PASSCODE: 'pass',
      ADMIN_LINE_USER_IDS: ADMIN_UID,
    };
    db = new FakeFirestore();
    seedNetwork(db);
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(db as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // -------------------- Auth gate --------------------

  describe('Authorization gate', () => {
    const cases: Array<[string, () => Promise<Response>]> = [
      ['GET snapshot', () => snapshotGET(req('/api/admin/snapshot', 'GET', 'none'))],
      ['approve', () => memberPOST(req('/api/admin/members/mem-p1', 'POST', 'none', { action: 'approve' }), { params: { memberId: 'mem-p1' } })],
      ['delete member', () => memberDELETE(req('/api/admin/members/mem-p1', 'DELETE', 'none'), { params: { memberId: 'mem-p1' } })],
      ['assist', () => assistPOST(req('/api/admin/assist-product', 'POST', 'none', { memberId: 'mem-a1', skuTagId: 'sku-custom', title: 'xx', price: 1 }))],
      ['add category', () => categoryPOST(req('/api/admin/categories', 'POST', 'none', { name: 'x', category: 'raw' }))],
      ['edit news', () => newsPATCH(req('/api/admin/news/news-1', 'PATCH', 'none', { status: 'hidden' }), { params: { newsId: 'news-1' } })],
    ];

    it.each(cases)('%s without an admin session → 401 and no writes', async (_name, call) => {
      const before = db.paths().join('|');
      const res = await call();
      expect(res.status).toBe(401);
      expect(db.paths().join('|')).toBe(before);
    });

    it('a cookie whose LINE admin was removed from the whitelist is rejected', async () => {
      const cookie = cookieFor('line');
      process.env.ADMIN_LINE_USER_IDS = 'U_SOMEONE_ELSE';
      const r = new NextRequest('http://localhost:3000/api/admin/snapshot', { headers: { cookie } });
      expect((await snapshotGET(r)).status).toBe(401);
    });

    it('returns 500 (not a fake success) when the Admin SDK is unavailable', async () => {
      vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(null as any);
      const res = await snapshotGET(req('/api/admin/snapshot', 'GET', 'passcode'));
      expect(res.status).toBe(500);
    });
  });

  // -------------------- Snapshot --------------------

  describe('GET /api/admin/snapshot', () => {
    it('works for a passcode admin and merges PII only for applicants under review', async () => {
      const res = await snapshotGET(req('/api/admin/snapshot', 'GET', 'passcode'));
      expect(res.status).toBe(200);
      const data = await res.json();

      const pending = data.members.find((m: any) => m.id === 'mem-p1');
      expect(pending.phone).toBe('0811111111');
      const approved = data.members.find((m: any) => m.id === 'mem-a1');
      expect(approved.phone).toBeUndefined();

      const pendingFarm = data.farms.find((f: any) => f.id === 'farm-p1');
      expect(pendingFarm.internalCoordinates).toEqual({ lat: 15.7, lng: 100.1 });
      const approvedFarm = data.farms.find((f: any) => f.id === 'farm-a1');
      expect(approvedFarm.internalCoordinates).toBeUndefined();

      // หมวดมาตรฐานที่ยังไม่อยู่ใน Firestore ต้องมองเห็นด้วย
      expect(data.categories.length).toBeGreaterThan(2);
    });
  });

  // -------------------- Members --------------------

  describe('Approve / reject', () => {
    it('passcode admin can approve: member + farm + audit written in ONE batch', async () => {
      const res = await memberPOST(
        req('/api/admin/members/mem-p1', 'POST', 'passcode', { action: 'approve' }),
        { params: { memberId: 'mem-p1' } }
      );
      expect(res.status).toBe(200);
      expect(db.read('members/mem-p1')!.status).toBe('approved');
      expect(db.read('farms/farm-p1')!.status).toBe('approved');
      expect(db.commits).toBe(1);

      const [log] = auditLogs(db);
      expect(log.action).toBe('approve_member');
      expect(log.authMethod).toBe('admin_passcode');
      expect(log.performedByAdminName).toContain('ป้าแอดมิน');
      expect(log.performedByAdminName).toContain('รหัสผ่านสำรอง');
    });

    it('reject records the reason', async () => {
      await memberPOST(
        req('/api/admin/members/mem-p1', 'POST', 'line', { action: 'reject', reason: 'รูปไม่ชัด' }),
        { params: { memberId: 'mem-p1' } }
      );
      expect(db.read('members/mem-p1')!.status).toBe('rejected');
      expect(auditLogs(db)[0].details).toContain('รูปไม่ชัด');
    });

    it('[Atomic] if the commit fails nothing changes and the client gets an error', async () => {
      db.failNextCommit = true;
      const res = await memberPOST(
        req('/api/admin/members/mem-p1', 'POST', 'passcode', { action: 'approve' }),
        { params: { memberId: 'mem-p1' } }
      );
      expect(res.status).toBe(500);
      expect(db.read('members/mem-p1')!.status).toBe('pending');
      expect(auditLogs(db)).toHaveLength(0);
    });

    it('rejects unknown actions and unknown members', async () => {
      expect((await memberPOST(req('/x', 'POST', 'passcode', { action: 'make_admin' }), { params: { memberId: 'mem-p1' } })).status).toBe(400);
      expect((await memberPOST(req('/x', 'POST', 'passcode', { action: 'approve' }), { params: { memberId: 'mem-nope' } })).status).toBe(404);
      expect((await memberPOST(req('/x', 'POST', 'passcode', { action: 'approve' }), { params: { memberId: '../farms/x' } })).status).toBe(400);
    });
  });

  describe('Permanent delete', () => {
    it('passcode admin is refused (403) and nothing is deleted', async () => {
      const before = db.paths().length;
      const res = await memberDELETE(req('/x', 'DELETE', 'passcode'), { params: { memberId: 'mem-a1' } });
      expect(res.status).toBe(403);
      expect(db.paths().length).toBe(before);
    });

    it('LINE admin deletes EVERYTHING belonging to the member — and nothing else', async () => {
      const res = await memberDELETE(req('/x', 'DELETE', 'line'), { params: { memberId: 'mem-a1' } });
      expect(res.status).toBe(200);

      for (const p of [
        'members/mem-a1', 'members/mem-a1/private/pii',
        'farms/farm-a1', 'farms/farm-a1/private/contact',
        'products/prod-a1', 'products/prod-a2',
        'registrations/U_FARMER_A1',
      ]) {
        expect(db.read(p), p).toBeUndefined();
      }
      // ของคนอื่นยังอยู่ครบ
      expect(db.read('members/mem-x')).toBeTruthy();
      expect(db.read('farms/farm-x')).toBeTruthy();
      expect(db.read('products/prod-x')).toBeTruthy();
      expect(db.read('registrations/U_FARMER_P1')).toBeTruthy();

      const log = auditLogs(db)[0];
      expect(log.action).toBe('delete_member');
      expect(log.authMethod).toBe('admin_line');
      expect(log.actorUid).toBe(ADMIN_UID);
    });
  });

  describe('Permanent delete — safeguards', () => {
    it('an admin cannot delete their own member record', async () => {
      db.seed('members/mem-me', { fullName: 'ตัวแอดมินเอง', status: 'approved', ownerUid: ADMIN_UID, farmId: 'farm-me' });
      db.seed('farms/farm-me', { memberId: 'mem-me', ownerUid: ADMIN_UID, farmName: 'แปลงแอดมิน', status: 'approved' });
      const res = await memberDELETE(req('/x', 'DELETE', 'line'), { params: { memberId: 'mem-me' } });
      expect(res.status).toBe(400);
      expect(db.read('members/mem-me')).toBeTruthy();
      expect(db.read('farms/farm-me')).toBeTruthy();
    });

    it('deleting an approved member removes their products from the public catalog', async () => {
      expect(db.read('members/mem-a1')!.status).toBe('approved');
      const res = await memberDELETE(req('/x', 'DELETE', 'line'), { params: { memberId: 'mem-a1' } });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deleted.products.sort()).toEqual(['prod-a1', 'prod-a2']);
      expect(db.paths('products/')).toEqual(['products/prod-x']);
    });
  });

  // -------------------- Assisted entry --------------------

  describe('Assist add product', () => {
    it('derives farm/owner from the database and only copies contact that the farm made public', async () => {
      const res = await assistPOST(
        req('/api/admin/assist-product', 'POST', 'passcode', {
          memberId: 'mem-a1', skuTagId: 'sku-custom', title: 'ถ่านไบโอชาร์', price: 50,
          ownerUid: 'U_ATTACKER', farmId: 'farm-x', phone: '0899999999',
        })
      );
      expect(res.status).toBe(200);
      const { product } = await res.json();
      const stored = db.read(`products/${product.id}`)!;

      expect(stored.ownerUid).toBe('U_FARMER_A1');
      expect(stored.farmId).toBe('farm-a1');
      expect(stored.phone).toBeUndefined(); // แปลงไม่ได้เปิดเบอร์
      expect(stored.lineId).toBe('boonmee'); // แปลงเปิด LINE
      expect(stored.skuTagName).toBe('ถ่านพิเศษ');
      expect(db.read('members/mem-a1')!.delegationStatus).toBe('completed');
    });

    it('refuses members who are not approved yet', async () => {
      const res = await assistPOST(
        req('/api/admin/assist-product', 'POST', 'passcode', { memberId: 'mem-p1', skuTagId: 'sku-custom', title: 'xx', price: 1 })
      );
      expect(res.status).toBe(400);
    });
  });

  // -------------------- Categories --------------------

  describe('Categories', () => {
    it('create (passcode)', async () => {
      const res = await categoryPOST(req('/api/admin/categories', 'POST', 'passcode', { name: 'ข้าวพื้นบ้าน', category: 'seed' }));
      expect(res.status).toBe(200);
      const { category } = await res.json();
      expect(db.read(`categories/${category.id}`)!.name).toBe('ข้าวพื้นบ้าน');
    });

    it('rename cascades to every product using the SKU (server-side query, not client memory)', async () => {
      const res = await categoryPATCH(
        req('/x', 'PATCH', 'passcode', { name: 'ถ่านไบโอชาร์คุณภาพสูง', category: 'processed' }),
        { params: { categoryId: 'sku-custom' } }
      );
      expect(res.status).toBe(200);
      expect((await res.json()).updatedProductCount).toBe(2);
      expect(db.read('products/prod-a1')!.skuTagName).toBe('ถ่านไบโอชาร์คุณภาพสูง');
      expect(db.read('products/prod-a2')!.categoryName).toBe('แปรรูป');
      expect(db.read('products/prod-x')!.skuTagName).toBeUndefined();
    });

    it('editing a built-in category that is not yet in Firestore creates the document', async () => {
      const snap = await (await snapshotGET(req('/api/admin/snapshot', 'GET', 'passcode'))).json();
      const builtIn = snap.categories.find((c: any) => !db.read(`categories/${c.id}`));
      expect(builtIn).toBeTruthy();

      const res = await categoryPATCH(req('/x', 'PATCH', 'passcode', { isActive: false }), { params: { categoryId: builtIn.id } });
      expect(res.status).toBe(200);
      const stored = db.read(`categories/${builtIn.id}`)!;
      expect(stored.isActive).toBe(false);
      expect(stored.name).toBe(builtIn.name);
    });

    it('delete is LINE-only', async () => {
      const res = await categoryDELETE(req('/x?targetId=sku-target', 'DELETE', 'passcode'), { params: { categoryId: 'sku-custom' } });
      expect(res.status).toBe(403);
      expect(db.read('categories/sku-custom')).toBeTruthy();
    });

    it('delete with products in use requires a target, then reassigns atomically', async () => {
      const noTarget = await categoryDELETE(req('/x', 'DELETE', 'line'), { params: { categoryId: 'sku-custom' } });
      expect(noTarget.status).toBe(400);
      expect(db.read('categories/sku-custom')).toBeTruthy();

      const ok = await categoryDELETE(req('/x?targetId=sku-target', 'DELETE', 'line'), { params: { categoryId: 'sku-custom' } });
      expect(ok.status).toBe(200);
      expect(db.read('categories/sku-custom')).toBeUndefined();
      expect(db.read('products/prod-a1')!.skuTagId).toBe('sku-target');
      expect(db.read('products/prod-a2')!.skuTagName).toBe('ถ่านทั่วไป');
    });
  });

  // -------------------- Practices --------------------

  describe('Practices', () => {
    it('rename cascades to farms.practices', async () => {
      const res = await practicePATCH(req('/x', 'PATCH', 'passcode', { name: 'เตาเผาถ่านไบโอชาร์' }), { params: { practiceId: 'practice-a' } });
      expect(res.status).toBe(200);
      expect(db.read('farms/farm-a1')!.practices).toEqual(['โคก หนอง นา', 'เตาเผาถ่านไบโอชาร์']);
    });

    it('rejects duplicate names', async () => {
      const dup = await practicePOST(req('/x', 'POST', 'passcode', { name: 'ไบโอชาร์ใหม่', category: 'energy' }));
      expect(dup.status).toBe(400);
    });

    it('delete is LINE-only, and moves farms to the target practice', async () => {
      expect((await practiceDELETE(req('/x?targetId=practice-b', 'DELETE', 'passcode'), { params: { practiceId: 'practice-a' } })).status).toBe(403);

      const res = await practiceDELETE(req('/x?targetId=practice-b', 'DELETE', 'line'), { params: { practiceId: 'practice-a' } });
      expect(res.status).toBe(200);
      expect(db.read('practices/practice-a')).toBeUndefined();
      expect(db.read('farms/farm-a1')!.practices).toEqual(['โคก หนอง นา', 'ไบโอชาร์ใหม่']);
    });
  });

  // -------------------- Broken / built-in taxonomy docs --------------------
  // Regression: เอกสารที่ไม่สมบูรณ์ (มีแค่ isActive/updatedAt) จากโค้ด client รุ่นเก่า ทำให้ลบไม่ได้
  // ("Cannot use undefined as a Firestore value") และรายการมาตรฐานที่ลบแล้วกลับมาเอง

  describe('Partial and built-in taxonomy documents', () => {
    const builtInPractice = INITIAL_PRACTICE_TAGS[0];
    const builtInCategory = INITIAL_CATEGORY_TAGS[0];

    it('snapshot fills a partial built-in practice from its default (no nameless cards)', async () => {
      db.seed(`practices/${builtInPractice.id}`, { isActive: false, updatedAt: '2026-10-01' });
      const snap = await (await snapshotGET(req('/api/admin/snapshot', 'GET', 'line'))).json();
      const item = snap.practices.find((p: any) => p.id === builtInPractice.id);
      expect(item.name).toBe(builtInPractice.name);
      expect(item.isActive).toBe(false); // ค่าใน Firestore ชนะ
      expect(snap.practices.every((p: any) => typeof p.name === 'string' && p.name)).toBe(true);
    });

    it('deleting a partial built-in practice succeeds and it does not come back', async () => {
      db.seed(`practices/${builtInPractice.id}`, { isActive: false, updatedAt: '2026-10-01' });
      const res = await practiceDELETE(req('/x', 'DELETE', 'line'), { params: { practiceId: builtInPractice.id } });
      expect(res.status).toBe(200);
      expect(db.read(`practices/${builtInPractice.id}`)!.deleted).toBe(true);

      const snap = await (await snapshotGET(req('/api/admin/snapshot', 'GET', 'line'))).json();
      expect(snap.practices.some((p: any) => p.id === builtInPractice.id)).toBe(false);

      // ลบซ้ำ / แก้ไขรายการที่ลบแล้ว → 404
      expect((await practicePATCH(req('/x', 'PATCH', 'line', { isActive: true }), { params: { practiceId: builtInPractice.id } })).status).toBe(404);
    });

    it('a nameless doc with no default can be deleted without querying farms by undefined', async () => {
      db.seed('practices/practice-broken', { isActive: false });
      const res = await practiceDELETE(req('/x', 'DELETE', 'line'), { params: { practiceId: 'practice-broken' } });
      expect(res.status).toBe(200);
      expect(db.read('practices/practice-broken')).toBeUndefined();
      expect(db.read('farms/farm-a1')!.practices).toEqual(['โคก หนอง นา', 'เผาถ่านไบโอชาร์']);
    });

    it('editing a partial built-in practice writes the full document (repairs it)', async () => {
      db.seed(`practices/${builtInPractice.id}`, { isActive: false });
      const res = await practicePATCH(req('/x', 'PATCH', 'passcode', { isActive: true }), { params: { practiceId: builtInPractice.id } });
      expect(res.status).toBe(200);
      const stored = db.read(`practices/${builtInPractice.id}`)!;
      expect(stored.name).toBe(builtInPractice.name);
      expect(stored.isActive).toBe(true);
    });

    it('deleting a built-in category leaves a tombstone so it stays deleted', async () => {
      const res = await categoryDELETE(req('/x', 'DELETE', 'line'), { params: { categoryId: builtInCategory.id } });
      expect(res.status).toBe(200);
      expect(db.read(`categories/${builtInCategory.id}`)!.deleted).toBe(true);
      const snap = await (await snapshotGET(req('/api/admin/snapshot', 'GET', 'line'))).json();
      expect(snap.categories.some((c: any) => c.id === builtInCategory.id)).toBe(false);
    });

    it('deleting a custom category removes the document entirely', async () => {
      const res = await categoryDELETE(req('/x?targetId=sku-target', 'DELETE', 'line'), { params: { categoryId: 'sku-custom' } });
      expect(res.status).toBe(200);
      expect(db.read('categories/sku-custom')).toBeUndefined();
    });
  });

  // -------------------- Products --------------------

  describe('Products', () => {
    const P = { params: { productId: 'prod-a1' } };

    it('unauthenticated → 401, nothing written', async () => {
      expect((await productPATCH(req('/x', 'PATCH', 'none', { status: 'hidden' }), P)).status).toBe(401);
      expect((await productDELETE(req('/x', 'DELETE', 'none'), P)).status).toBe(401);
      expect(db.read('products/prod-a1')!.status).toBeUndefined();
    });

    it('passcode admin can change status; audit names the farm owner', async () => {
      const res = await productPATCH(req('/x', 'PATCH', 'passcode', { status: 'hidden' }), P);
      expect(res.status).toBe(200);
      expect(db.read('products/prod-a1')!.status).toBe('hidden');
      const log = auditLogs(db)[0];
      expect(log.action).toBe('admin_update_product');
      expect(log.targetMemberName).toBe('ป้าบุญมี');
      expect(log.metadata.before).toEqual({ status: null });
    });

    it('changing SKU re-derives skuTagName / category / categoryName on the server', async () => {
      const res = await productPATCH(req('/x', 'PATCH', 'line', { skuTagId: 'sku-target', title: 'ถ่านดี', price: 80, unit: 'กก.' }), P);
      expect(res.status).toBe(200);
      const stored = db.read('products/prod-a1')!;
      expect(stored).toMatchObject({ skuTagId: 'sku-target', skuTagName: 'ถ่านทั่วไป', category: 'byproduct', title: 'ถ่านดี', price: 80 });
      expect(stored.categoryName).toBe('ปัจจัยการผลิต/By-product');
    });

    it('cannot move a product to another farm/owner or set contact fields', async () => {
      const res = await productPATCH(req('/x', 'PATCH', 'line', { farmId: 'farm-x', ownerUid: 'U_X', phone: '0899999999' }), P);
      expect(res.status).toBe(400); // ไม่มี field ที่อนุญาต
      expect(db.read('products/prod-a1')).toMatchObject({ farmId: 'farm-a1', ownerUid: 'U_FARMER_A1' });
    });

    it('validates input', async () => {
      expect((await productPATCH(req('/x', 'PATCH', 'line', { status: 'sold' }), P)).status).toBe(400);
      expect((await productPATCH(req('/x', 'PATCH', 'line', { price: -5 }), P)).status).toBe(400);
      expect((await productPATCH(req('/x', 'PATCH', 'line', { title: 'x' }), P)).status).toBe(400);
      expect((await productPATCH(req('/x', 'PATCH', 'line', { skuTagId: 'sku-nope' }), P)).status).toBe(404);
      expect((await productPATCH(req('/x', 'PATCH', 'line', { status: 'hidden' }), { params: { productId: 'prod-nope' } })).status).toBe(404);
    });

    it('delete is LINE-only and leaves other products untouched', async () => {
      expect((await productDELETE(req('/x', 'DELETE', 'passcode'), P)).status).toBe(403);
      expect(db.read('products/prod-a1')).toBeTruthy();
      expect((await productDELETE(req('/x', 'DELETE', 'line'), P)).status).toBe(200);
      expect(db.read('products/prod-a1')).toBeUndefined();
      expect(db.read('products/prod-a2')).toBeTruthy();
      expect(auditLogs(db)[0].action).toBe('admin_delete_product');
    });
  });

  // -------------------- News --------------------

  describe('News', () => {
    const newsBody = {
      title: 'ตลาดนัดกสิกรรม', content: 'เชิญชวน', category: 'ตลาดนัดกสิกรรม', date: '5 ธ.ค.',
      location: 'ตลาดเช้า', district: 'เมืองนครสวรรค์', coverImage: 'https://images.example/x.jpg', author: 'แอดมิน',
    };

    it('passcode admin can create and hide news', async () => {
      const created = await (await newsPOST(req('/api/admin/news', 'POST', 'passcode', newsBody))).json();
      expect(created.news.status).toBe('published');

      const hide = await newsPATCH(req('/x', 'PATCH', 'passcode', { status: 'hidden' }), { params: { newsId: created.news.id } });
      expect(hide.status).toBe(200);
      expect(db.read(`news/${created.news.id}`)!.status).toBe('hidden');
    });

    it('validates input (missing fields, bad category, non-https image)', async () => {
      expect((await newsPOST(req('/x', 'POST', 'passcode', { ...newsBody, title: '' }))).status).toBe(400);
      expect((await newsPOST(req('/x', 'POST', 'passcode', { ...newsBody, category: 'อื่นๆ' }))).status).toBe(400);
      expect((await newsPOST(req('/x', 'POST', 'passcode', { ...newsBody, coverImage: 'javascript:alert(1)' }))).status).toBe(400);
    });

    it('delete is LINE-only (passcode should hide instead)', async () => {
      expect((await newsDELETE(req('/x', 'DELETE', 'passcode'), { params: { newsId: 'news-1' } })).status).toBe(403);
      expect((await newsDELETE(req('/x', 'DELETE', 'line'), { params: { newsId: 'news-1' } })).status).toBe(200);
      expect(db.read('news/news-1')).toBeUndefined();
    });
  });
});
