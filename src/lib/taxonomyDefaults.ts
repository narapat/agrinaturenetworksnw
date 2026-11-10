import type { Firestore } from 'firebase-admin/firestore';
import { INITIAL_CATEGORY_TAGS, INITIAL_PRACTICE_TAGS } from '@/data/mockData';

/**
 * หมวดหมู่/วิถีมาตรฐาน (INITIAL_*) ถูกแสดงในแอปเสมอแม้ยังไม่ถูกบันทึกลง Firestore
 * (client เติมให้ใน state) — Admin API จึงต้องมองเห็นค่าเริ่มต้นเหล่านี้ด้วย
 * ไม่อย่างนั้นแอดมินจะแก้ไขรายการมาตรฐานไม่ได้ (404)
 */

type TaxonomyCollection = 'categories' | 'practices';

const DEFAULTS: Record<TaxonomyCollection, Array<Record<string, any>>> = {
  categories: INITIAL_CATEGORY_TAGS as unknown as Array<Record<string, any>>,
  practices: INITIAL_PRACTICE_TAGS as unknown as Array<Record<string, any>>,
};

export function mergeWithDefaults(collection: TaxonomyCollection, remote: Array<Record<string, any>>) {
  const ids = new Set(remote.map((r) => r.id));
  return [...remote, ...DEFAULTS[collection].filter((d) => !ids.has(d.id)).map((d) => ({ ...d }))];
}

/**
 * อ่านรายการจาก Firestore หรือค่าเริ่มต้น
 * `persisted: false` = ยังไม่มีเอกสารใน Firestore (ต้องใช้ set แทน update ตอนบันทึก)
 */
export async function loadTaxonomyItem(
  db: Firestore,
  collection: TaxonomyCollection,
  id: string
): Promise<{ data: Record<string, any>; persisted: boolean } | null> {
  const snap = await db.collection(collection).doc(id).get();
  if (snap.exists) return { data: { ...(snap.data() as Record<string, any>), id }, persisted: true };
  const def = DEFAULTS[collection].find((d) => d.id === id);
  return def ? { data: { ...def }, persisted: false } : null;
}

export async function listTaxonomy(db: Firestore, collection: TaxonomyCollection) {
  const snap = await db.collection(collection).get();
  return mergeWithDefaults(
    collection,
    snap.docs.map((d) => ({ ...(d.data() as Record<string, any>), id: d.id }))
  );
}
