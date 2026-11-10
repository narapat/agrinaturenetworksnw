import type { Farm, Product, ProductCategory } from '@/types';
import { DISTRICTS_NSW } from '@/data/mockData';
import { PRODUCT_CATEGORIES, productCategoryName } from './taxonomy';

/**
 * สถิติสาธารณะของเครือข่าย (หน้า /stats)
 *
 * มีแต่ "จำนวน" เท่านั้น — ไม่มีชื่อ เบอร์โทร พิกัด หรือข้อมูลรายบุคคลใดๆ
 * ใช้ชุดข้อมูลเดียวกับหน้าแปลงและตลาดสาธารณะ (เฉพาะแปลงที่อนุมัติแล้ว และผลผลิตที่ไม่ได้ซ่อน)
 * ตัวเลขจึงตรงกับที่ผู้ใช้เห็นในหน้าอื่น
 */

export const UNKNOWN_DISTRICT = 'ไม่ระบุอำเภอ';

export interface CountRow {
  key: string;
  label: string;
  count: number;
}

export interface PublicStats {
  approvedMembers: number;
  farmsTotal: number;
  productsTotal: number;
  districtsWithFarms: number;
  districtsTotal: number;
  farmsByDistrict: CountRow[];
  productsByDistrict: CountRow[];
  productsByCategory: CountRow[];
  /** ตารางละเอียด: อำเภอ × หมวดหมู่ (นับผลผลิต) */
  matrix: { district: string; counts: Record<ProductCategory, number>; total: number }[];
  generatedAt: string;
}

function normalizeDistrict(d: unknown): string {
  const s = typeof d === 'string' ? d.trim().replace(/^อ\.\s*/, '') : '';
  return s && (DISTRICTS_NSW as string[]).includes(s) ? s : s || UNKNOWN_DISTRICT;
}

/** เรียงมากไปน้อย; เท่ากันใช้ลำดับอำเภอมาตรฐาน */
function byCountThenOrder(order: string[]) {
  return (a: CountRow, b: CountRow) =>
    b.count - a.count || (order.indexOf(a.key) === -1 ? 999 : order.indexOf(a.key)) - (order.indexOf(b.key) === -1 ? 999 : order.indexOf(b.key));
}

export function computePublicStats(input: {
  approvedMembers: number;
  farms: Pick<Farm, 'district'>[];
  products: Pick<Product, 'district' | 'category'>[];
  now?: Date;
}): PublicStats {
  const districtOrder = [...DISTRICTS_NSW];

  const farmCounts = new Map<string, number>(districtOrder.map((d) => [d, 0]));
  for (const f of input.farms) {
    const d = normalizeDistrict(f.district);
    farmCounts.set(d, (farmCounts.get(d) || 0) + 1);
  }

  const productCounts = new Map<string, number>(districtOrder.map((d) => [d, 0]));
  const categoryCounts = new Map<ProductCategory, number>(PRODUCT_CATEGORIES.map((c) => [c, 0]));
  const matrixMap = new Map<string, Record<ProductCategory, number>>();
  const emptyRow = () => Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c, 0])) as Record<ProductCategory, number>;
  for (const d of districtOrder) matrixMap.set(d, emptyRow());

  for (const p of input.products) {
    const d = normalizeDistrict(p.district);
    productCounts.set(d, (productCounts.get(d) || 0) + 1);
    const cat = (PRODUCT_CATEGORIES as string[]).includes(p.category as string) ? (p.category as ProductCategory) : 'raw';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    if (!matrixMap.has(d)) matrixMap.set(d, emptyRow());
    matrixMap.get(d)![cat] += 1;
  }

  const toRows = (m: Map<string, number>): CountRow[] =>
    Array.from(m.entries())
      // แสดงทุกอำเภอมาตรฐานแม้เป็น 0 (เห็นพื้นที่ที่ยังไม่มีสมาชิก) แต่ "ไม่ระบุ" แสดงเฉพาะเมื่อมีจริง
      .filter(([k, v]) => districtOrder.includes(k) || v > 0)
      .map(([k, v]) => ({ key: k, label: k === UNKNOWN_DISTRICT ? k : `อ.${k}`, count: v }))
      .sort(byCountThenOrder(districtOrder));

  const farmsByDistrict = toRows(farmCounts);
  const productsByDistrict = toRows(productCounts);

  const productsByCategory: CountRow[] = PRODUCT_CATEGORIES.map((c) => ({
    key: c,
    label: productCategoryName(c),
    count: categoryCounts.get(c) || 0,
  })).sort(byCountThenOrder(PRODUCT_CATEGORIES as string[]));

  const matrix = Array.from(matrixMap.entries())
    .map(([district, counts]) => ({ district, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) }))
    .filter((r) => districtOrder.includes(r.district) || r.total > 0)
    .sort((a, b) => b.total - a.total || districtOrder.indexOf(a.district) - districtOrder.indexOf(b.district));

  return {
    approvedMembers: input.approvedMembers,
    farmsTotal: input.farms.length,
    productsTotal: input.products.length,
    districtsWithFarms: farmsByDistrict.filter((r) => r.key !== UNKNOWN_DISTRICT && r.count > 0).length,
    districtsTotal: districtOrder.length,
    farmsByDistrict,
    productsByDistrict,
    productsByCategory,
    matrix,
    generatedAt: (input.now || new Date()).toISOString(),
  };
}
