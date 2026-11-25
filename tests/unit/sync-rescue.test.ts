import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as firebaseAdmin from '@/lib/firebaseAdmin';
import { POST } from '@/app/api/sync/rescue/route';
import { FakeFirestore } from './helpers/fakeFirestore';

const UID = 'U_OWNER_1';

function mockLine(sub: string | null) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    (sub ? { ok: true, json: async () => ({ sub }) } : { ok: false, json: async () => ({}) }) as Response
  );
}

function req(products: unknown, auth = true) {
  return new NextRequest('http://localhost:3000/api/sync/rescue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer line-token' } : {}) },
    body: JSON.stringify({ products }),
  });
}

const base = (over: Record<string, unknown> = {}) => ({
  id: 'prod-1790000000100',
  farmId: 'farm-mine',
  ownerUid: UID,
  title: 'ถ่านไบโอชาร์',
  skuTagId: 'sku-biochar',
  price: 50,
  unit: 'กก.',
  status: 'sale',
  images: [],
  ...over,
});

describe('POST /api/sync/rescue (queued items from a device)', () => {
  const originalEnv = process.env;
  let db: FakeFirestore;

  beforeEach(() => {
    process.env = { ...originalEnv, LINE_CHANNEL_ID: '123', NEXT_PUBLIC_DEMO_MODE: 'false' };
    db = new FakeFirestore();
    db.seed('farms/farm-mine', { memberId: 'mem-me', ownerUid: UID, farmName: 'แปลงของฉัน', district: 'ลาดยาว', subdistrict: 'มาบแก', isPublicPhone: false, isPublicLine: true, lineId: 'me-line' });
    db.seed('farms/farm-other', { memberId: 'mem-x', ownerUid: 'U_OTHER', farmName: 'แปลงคนอื่น' });
    db.seed('categories/sku-biochar', { name: 'ถ่านไบโอชาร์', category: 'byproduct', isActive: true });
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(db as any);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const results = async (res: Response) => (await res.json()).results as Array<{ id: string; status: string; reason?: string }>;

  it('requires a verified LINE token', async () => {
    expect((await POST(req([base()], false))).status).toBe(401);
    mockLine(null);
    expect((await POST(req([base()]))).status).toBe(401);
    expect(db.read('products/prod-1790000000100')).toBeUndefined();
  });

  it('creates a genuinely unsent product, deriving farm/SKU/contact fields on the server', async () => {
    mockLine(UID);
    const res = await POST(req([base({ farmName: 'ปลอม', district: 'ปลอม', phone: '0899999999', skuTagName: 'ปลอม' })]));
    expect(res.status).toBe(200);
    expect((await results(res))[0].status).toBe('created');
    const stored = db.read('products/prod-1790000000100')!;
    expect(stored).toMatchObject({ ownerUid: UID, farmName: 'แปลงของฉัน', district: 'ลาดยาว', skuTagName: 'ถ่านไบโอชาร์', lineId: 'me-line' });
    expect(stored.phone).toBeUndefined();
    expect(db.paths('auditLogs/').length).toBe(1);
  });

  it('skips items that already exist', async () => {
    mockLine(UID);
    db.seed('products/prod-1790000000100', { title: 'เดิม', ownerUid: UID });
    expect((await results(await POST(req([base()]))))[0].status).toBe('exists');
    expect(db.read('products/prod-1790000000100')!.title).toBe('เดิม');
  });

  it('[Regression] never re-creates a product an admin deleted', async () => {
    mockLine(UID);
    db.seed('auditLogs/log-1', { action: 'admin_delete_product', metadata: { productId: 'prod-1790000000100' } });
    expect((await results(await POST(req([base()]))))[0].status).toBe('deleted');
    expect(db.read('products/prod-1790000000100')).toBeUndefined();
  });

  it('[Regression] never re-creates products removed with a deleted member', async () => {
    mockLine(UID);
    db.seed('auditLogs/log-2', { action: 'delete_member', metadata: { productIds: ['prod-1790000000100', 'prod-x'] } });
    expect((await results(await POST(req([base()]))))[0].status).toBe('deleted');
  });

  it("respects the owner's own deletion, but ignores another user's log claiming the same id", async () => {
    mockLine(UID);
    db.seed('auditLogs/log-3', { action: 'delete_product', actorUid: 'U_SOMEONE_ELSE', metadata: { productId: 'prod-1790000000100' } });
    expect((await results(await POST(req([base()]))))[0].status).toBe('created');

    db.seed('auditLogs/log-4', { action: 'delete_product', actorUid: UID, metadata: { productId: 'prod-1790000000101' } });
    expect((await results(await POST(req([base({ id: 'prod-1790000000101' })]))))[0].status).toBe('deleted');
  });

  it("rejects products for someone else's farm, a missing farm, another owner, or demo ids", async () => {
    mockLine(UID);
    const r = await results(
      await POST(
        req([
          base({ id: 'prod-1790000000201', farmId: 'farm-other' }),
          base({ id: 'prod-1790000000202', farmId: 'farm-gone' }),
          base({ id: 'prod-1790000000203', ownerUid: 'U_OTHER' }),
          base({ id: 'prod-001' }),
        ])
      )
    );
    expect(r.map((x) => x.status)).toEqual(['rejected', 'rejected', 'rejected', 'rejected']);
    expect(db.paths('products/')).toEqual([]);
  });

  it('validates input and the batch size', async () => {
    mockLine(UID);
    expect((await results(await POST(req([base({ title: 'x' })]))))[0].status).toBe('rejected');
    expect((await results(await POST(req([base({ skuTagId: 'sku-none' })]))))[0].status).toBe('rejected');
    expect((await POST(req([]))).status).toBe(400);
    expect((await POST(req(Array.from({ length: 51 }, (_, i) => base({ id: `prod-${i}` }))))).status).toBe(400);
  });

  it('returns 500 (not a fake success) when the Admin SDK is unavailable', async () => {
    mockLine(UID);
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(null as any);
    expect((await POST(req([base()]))).status).toBe(500);
  });
});
