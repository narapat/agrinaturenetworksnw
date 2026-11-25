import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as firebaseAdmin from '@/lib/firebaseAdmin';
import {
  getFarmByIdServer,
  getNewsServer,
  getProductByIdServer,
  getPublicFarmsServer,
  getPublicProductsServer,
  getPublicStatsServer,
} from '@/lib/serverData';
import { FakeFirestore } from './helpers/fakeFirestore';

/**
 * Production (ปิด Demo Mode): หน้าสาธารณะแสดงข้อมูลจริงเท่านั้น
 * - ไม่เติมข้อมูลตัวอย่างเมื่อฐานข้อมูลว่างหรือเชื่อมต่อไม่ได้
 * - ข้อมูลตัวอย่างที่เคยถูกเขียนลง Firestore (เช่น farm-001, prod-001) ถูกกรองออก
 */
describe('Public pages without Demo Mode', () => {
  const env = process.env.NEXT_PUBLIC_DEMO_MODE;
  let db: FakeFirestore;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    db = new FakeFirestore();
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(db as any);
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = env;
    vi.restoreAllMocks();
  });

  it('empty database → empty lists, zero stats (no sample farms/products/news)', async () => {
    expect(await getPublicFarmsServer()).toEqual([]);
    expect(await getPublicProductsServer()).toEqual([]);
    expect(await getNewsServer()).toEqual([]);
    const stats = await getPublicStatsServer();
    expect(stats).toMatchObject({ approvedMembers: 0, farmsTotal: 0, productsTotal: 0 });
  });

  it('database unreachable → empty, not sample data', async () => {
    vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(null as any);
    expect(await getPublicFarmsServer()).toEqual([]);
    expect(await getFarmByIdServer('farm-001')).toBeNull();
    expect(await getProductByIdServer('prod-001')).toBeNull();
  });

  it('[Regression] demo documents that were written to Firestore are hidden; real ones stay', async () => {
    db.seed('members/mem-001', { status: 'approved' });
    db.seed('members/mem-1790000000000-ab', { status: 'approved' });
    db.seed('farms/farm-001', { memberId: 'mem-001', status: 'approved', farmName: 'แปลงตัวอย่าง' });
    db.seed('farms/farm-1790000000000', { memberId: 'mem-1790000000000-ab', status: 'approved', farmName: 'แปลงจริง' });
    db.seed('products/prod-001', { farmId: 'farm-001', status: 'sale', title: 'ตัวอย่าง' });
    db.seed('products/prod-1790000000100', { farmId: 'farm-1790000000000', status: 'sale', title: 'จริง' });
    db.seed('news/news-001', { title: 'ข่าวตัวอย่าง', status: 'published' });
    db.seed('news/news-1790000000000', { title: 'ข่าวจริง', status: 'published' });

    expect((await getPublicFarmsServer()).map((f) => f.id)).toEqual(['farm-1790000000000']);
    expect((await getPublicProductsServer()).map((p) => p.id)).toEqual(['prod-1790000000100']);
    expect((await getNewsServer()).map((n) => n.id)).toEqual(['news-1790000000000']);
    expect(await getFarmByIdServer('farm-001')).toBeNull();
    expect(await getProductByIdServer('prod-001')).toBeNull();
    expect((await getFarmByIdServer('farm-1790000000000'))?.farmName).toBe('แปลงจริง');
    expect((await getPublicStatsServer()).approvedMembers).toBe(1);
  });

  it('Demo Mode on → sample data is available again', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    expect((await getPublicFarmsServer()).length).toBeGreaterThan(0);
  });
});
