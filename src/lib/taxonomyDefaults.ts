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

/**
 * เอกสารที่ไม่สมบูรณ์ (ไม่มี name) เกิดจากโค้ดฝั่ง client รุ่นเก่า:
 * เปิด/ปิดรายการมาตรฐานที่ยังไม่อยู่ใน Firestore ด้วย setDoc(merge) จึงได้เอกสารที่มีแค่ { isActive, updatedAt }
 * เติม field ที่ขาดจากค่าเริ่มต้นที่ id ตรงกัน (ค่าใน Firestore ชนะเสมอ)
 */
export function isIncomplete(item: Record<string, any>): boolean {
  return typeof item.name !== 'string' || !item.name.trim();
}

/**
 * รายการมาตรฐาน (มีใน INITIAL_*) ถูกเติมกลับเสมอถ้าไม่มีเอกสารใน Firestore
 * การลบจึงต้องเขียน "ป้ายลบ" { deleted: true } ไว้แทน ไม่อย่างนั้นลบแล้วจะกลับมาเอง
 */
export function isBuiltIn(collection: TaxonomyCollection, id: string): boolean {
  return DEFAULTS[collection].some((d) => d.id === id);
}

export function isTombstone(item: Record<string, any> | undefined | null): boolean {
  return !!item && item.deleted === true;
}

function withDefault(collection: TaxonomyCollection, item: Record<string, any>) {
  const def = DEFAULTS[collection].find((d) => d.id === item.id);
  return def ? { ...def, ...item, name: isIncomplete(item) ? def.name : item.name } : item;
}

export function mergeWithDefaults(collection: TaxonomyCollection, remote: Array<Record<string, any>>) {
  const ids = new Set(remote.map((r) => r.id)); // รวม id ที่มีป้ายลบ เพื่อไม่ให้ค่าเริ่มต้นกลับมา
  return [
    ...remote.filter((r) => !isTombstone(r)).map((r) => withDefault(collection, r)),
    ...DEFAULTS[collection].filter((d) => !ids.has(d.id)).map((d) => ({ ...d })),
  ];
}

/**
 * อ่านรายการจาก Firestore หรือค่าเริ่มต้น
 * `persisted: false` = ยังไม่มีเอกสารใน Firestore (ต้องใช้ set แทน update ตอนบันทึก)
 * ชื่ออาจว่างได้ถ้าเป็นเอกสารเสียที่ไม่มีค่าเริ่มต้นให้เติม — ผู้เรียกต้องรับมือ
 */
export async function loadTaxonomyItem(
  db: Firestore,
  collection: TaxonomyCollection,
  id: string
): Promise<{ data: Record<string, any>; persisted: boolean; incomplete: boolean } | null> {
  const snap = await db.collection(collection).doc(id).get();
  if (snap.exists) {
    const raw = { ...(snap.data() as Record<string, any>), id };
    if (isTombstone(raw)) return null;
    // incomplete = เอกสารใน Firestore ขาด name → ตอนบันทึกต้องเขียนทั้งเอกสาร (set) เพื่อซ่อมให้สมบูรณ์
    return { data: withDefault(collection, raw), persisted: true, incomplete: isIncomplete(raw) };
  }
  const def = DEFAULTS[collection].find((d) => d.id === id);
  return def ? { data: { ...def }, persisted: false, incomplete: false } : null;
}

export async function listTaxonomy(db: Firestore, collection: TaxonomyCollection) {
  const snap = await db.collection(collection).get();
  return mergeWithDefaults(
    collection,
    snap.docs.map((d) => ({ ...(d.data() as Record<string, any>), id: d.id }))
  );
}
