import { describe, it, expect } from 'vitest';
import { computePublicStats } from '@/lib/publicStats';

describe('computePublicStats (public /stats page)', () => {
  const stats = computePublicStats({
    approvedMembers: 7,
    farms: [
      { district: 'ลาดยาว' }, { district: 'ลาดยาว' }, { district: 'อ.ชุมแสง' }, { district: '' },
    ],
    products: [
      { district: 'ลาดยาว', category: 'byproduct' },
      { district: 'ลาดยาว', category: 'byproduct' },
      { district: 'ลาดยาว', category: 'seed' },
      { district: 'ชุมแสง', category: 'raw' },
      { district: 'ชุมแสง', category: 'unknown-cat' as any },
    ],
    now: new Date('2026-11-10T10:00:00Z'),
  });

  it('totals', () => {
    expect(stats.approvedMembers).toBe(7);
    expect(stats.farmsTotal).toBe(4);
    expect(stats.productsTotal).toBe(5);
    expect(stats.districtsTotal).toBe(15);
    expect(stats.districtsWithFarms).toBe(2); // "ไม่ระบุอำเภอ" ไม่นับเป็นอำเภอที่ครอบคลุม
  });

  it('farms by district: sorted desc, all 15 districts shown, prefix "อ." normalized, unknown kept separately', () => {
    expect(stats.farmsByDistrict[0]).toMatchObject({ key: 'ลาดยาว', count: 2, label: 'อ.ลาดยาว' });
    expect(stats.farmsByDistrict.find((r) => r.key === 'ชุมแสง')!.count).toBe(1);
    expect(stats.farmsByDistrict.find((r) => r.key === 'ไม่ระบุอำเภอ')!.count).toBe(1);
    expect(stats.farmsByDistrict.filter((r) => r.count === 0)).toHaveLength(13);
    expect(stats.farmsByDistrict.reduce((a, r) => a + r.count, 0)).toBe(4);
  });

  it('products by district and by category add up to the total', () => {
    expect(stats.productsByDistrict.reduce((a, r) => a + r.count, 0)).toBe(5);
    expect(stats.productsByCategory.reduce((a, r) => a + r.count, 0)).toBe(5);
    expect(stats.productsByCategory[0]).toMatchObject({ key: 'byproduct', count: 2 });
    // หมวดที่ไม่รู้จักนับเป็น "ผลผลิตสด" (raw) เหมือนการแสดงชื่อหมวดทั่วทั้งแอป
    expect(stats.productsByCategory.find((r) => r.key === 'raw')!.count).toBe(2);
  });

  it('matrix rows match per-district totals', () => {
    const ladyao = stats.matrix.find((r) => r.district === 'ลาดยาว')!;
    expect(ladyao.total).toBe(3);
    expect(ladyao.counts.byproduct).toBe(2);
    expect(ladyao.counts.seed).toBe(1);
  });

  it('contains counts only — no personal or location fields', () => {
    const json = JSON.stringify(stats);
    for (const k of ['phone', 'lineId', 'internalCoordinates', 'fullName', 'ownerUid', 'memberId']) {
      expect(json).not.toContain(k);
    }
  });
});
