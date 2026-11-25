import type { Farm, MemberProfile, Product } from '@/types';
import { isDemoId } from '@/lib/demoMode';

/**
 * แคชข้อมูลบนเครื่องผู้ใช้ (localStorage)
 *
 * หลักการ:
 * 1. Server (Firestore) เป็นแหล่งความจริงเพียงแหล่งเดียว — เมื่อดึงข้อมูลสำเร็จ ให้แทนที่ทั้งชุด ไม่ผสาน
 *    แคชในเครื่องใช้แสดงผลระหว่างรอ หรือเมื่อออฟไลน์เท่านั้น
 * 2. สิ่งที่ผู้ใช้บันทึกแล้วส่งขึ้นเซิร์ฟเวอร์ไม่สำเร็จ ต้องอยู่ใน "คิวรอส่ง" (pending uploads) อย่างชัดเจน
 *    ห้ามเดาว่า "มีในเครื่องแต่ไม่มีบนเซิร์ฟเวอร์ = ยังไม่ได้ส่ง" เพราะรวมถึงสิ่งที่ถูกลบไปแล้วด้วย
 * 3. เปลี่ยนรูปแบบแคชเมื่อไร ให้เพิ่มเลขเวอร์ชันของ key — แคชรุ่นเก่าจะถูกล้างอัตโนมัติ
 */

/** แคชรุ่นเก่า (v1) — ถูกล้างครั้งเดียวเมื่อเปิดแอปเวอร์ชันนี้ */
export const LEGACY_CACHE_KEYS = {
  MEMBERS: 'nsw_members_v1',
  FARMS: 'nsw_farms_v1',
  PRODUCTS: 'nsw_products_v1',
  CATEGORIES: 'nsw_categories_v1',
  PRACTICES: 'nsw_practices_v1',
  LOGS: 'nsw_audit_logs_v1',
  NEWS: 'nsw_news_v1',
} as const;

export const CACHE_KEYS = {
  MEMBERS: 'nsw_members_v2',
  FARMS: 'nsw_farms_v2',
  PRODUCTS: 'nsw_products_v2',
  CATEGORIES: 'nsw_categories_v2',
  PRACTICES: 'nsw_practices_v2',
  LOGS: 'nsw_audit_logs_v2',
  NEWS: 'nsw_news_v2',
  /** ผู้ใช้ที่เข้าสู่ระบบอยู่ — คงชื่อเดิมไว้ เพื่อไม่ให้ผู้ใช้หลุดออกจากระบบตอนอัปเดต */
  CURRENT_USER: 'nsw_current_user_v1',
} as const;

export const PENDING_UPLOADS_KEY = 'nsw_pending_uploads_v2';

export interface PendingUploads {
  farms: Farm[];
  products: Product[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function parseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

// ==================== คิวรอส่ง ====================

export function readPendingUploads(storage: StorageLike): PendingUploads {
  try {
    const raw = storage.getItem(PENDING_UPLOADS_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return {
      farms: Array.isArray(v?.farms) ? v.farms : [],
      products: Array.isArray(v?.products) ? v.products : [],
    };
  } catch {
    return { farms: [], products: [] };
  }
}

export function writePendingUploads(storage: StorageLike, pending: PendingUploads): void {
  if (pending.farms.length === 0 && pending.products.length === 0) {
    storage.removeItem(PENDING_UPLOADS_KEY);
  } else {
    storage.setItem(PENDING_UPLOADS_KEY, JSON.stringify(pending));
  }
}

function upsertById<T extends { id: string }>(list: T[], items: T[]): T[] {
  const map = new Map(list.map((x) => [x.id, x]));
  items.forEach((x) => map.set(x.id, x));
  return Array.from(map.values());
}

/** เพิ่มผลผลิตที่ส่งขึ้นเซิร์ฟเวอร์ไม่สำเร็จเข้าคิว (รายการเดิมที่ id ซ้ำจะถูกแทนที่) */
export function enqueuePendingProduct(storage: StorageLike, product: Product): void {
  const pending = readPendingUploads(storage);
  writePendingUploads(storage, { ...pending, products: upsertById(pending.products, [product]) });
}

// ==================== ล้างแคชรุ่นเก่า (ครั้งเดียว) ====================

export interface LegacyMigrationResult {
  migrated: boolean;
  rescuedFarms: number;
  rescuedProducts: number;
}

/**
 * ล้างแคชรุ่นเก่า (v1) ทั้งหมด แต่ก่อนล้าง ให้เก็บแปลง/ผลผลิตที่ "เป็นของผู้ใช้คนนี้จริงๆ" เข้าคิวรอส่งไว้
 * (เผื่อเคยบันทึกขณะออฟไลน์แล้วยังไม่ถึงเซิร์ฟเวอร์) — คิวจะถูกตรวจกับเซิร์ฟเวอร์อีกชั้นก่อนส่งจริง
 *
 * "ของผู้ใช้จริง" = ownerUid ตรงกับ LINE UID ของบัญชีที่เข้าสู่ระบบอยู่ (หรือแปลงที่ผูกกับ memberId ของบัญชีนี้)
 * ข้อมูลตัวอย่าง (mockData) ไม่ถูกเก็บเด็ดขาด
 */
export function migrateLegacyCache(storage: StorageLike): LegacyMigrationResult {
  const legacyKeys = Object.values(LEGACY_CACHE_KEYS);
  const hasLegacy = legacyKeys.some((k) => storage.getItem(k) !== null);
  if (!hasLegacy) return { migrated: false, rescuedFarms: 0, rescuedProducts: 0 };

  let rescuedFarms: Farm[] = [];
  let rescuedProducts: Product[] = [];

  const currentUserId = storage.getItem(CACHE_KEYS.CURRENT_USER);
  const members = parseArray<MemberProfile>(storage.getItem(LEGACY_CACHE_KEYS.MEMBERS));
  const me = currentUserId ? members.find((m) => m.id === currentUserId) : undefined;
  const myUid = me?.ownerUid || me?.lineUserId;

  if (me && myUid && !isDemoId('members', me.id)) {
    const farms = parseArray<Farm>(storage.getItem(LEGACY_CACHE_KEYS.FARMS));
    const products = parseArray<Product>(storage.getItem(LEGACY_CACHE_KEYS.PRODUCTS));

    rescuedFarms = farms
      .filter((f) => f && f.id && !isDemoId('farms', f.id))
      .filter((f) => f.ownerUid === myUid || (!f.ownerUid && f.memberId === me.id))
      .map((f) => ({ ...f, ownerUid: myUid, memberId: me.id }));

    const myFarmIds = new Set(rescuedFarms.map((f) => f.id));
    rescuedProducts = products
      .filter((p) => p && p.id && !isDemoId('products', p.id))
      .filter((p) => p.ownerUid === myUid || (!p.ownerUid && myFarmIds.has(p.farmId)))
      .map((p) => ({ ...p, ownerUid: myUid }));
  }

  if (rescuedFarms.length || rescuedProducts.length) {
    const pending = readPendingUploads(storage);
    writePendingUploads(storage, {
      farms: upsertById(pending.farms, rescuedFarms),
      products: upsertById(pending.products, rescuedProducts),
    });
  }

  legacyKeys.forEach((k) => storage.removeItem(k));
  return { migrated: true, rescuedFarms: rescuedFarms.length, rescuedProducts: rescuedProducts.length };
}

// ==================== รวมข้อมูลจากเซิร์ฟเวอร์ ====================

/**
 * ผลลัพธ์จากเซิร์ฟเวอร์แทนที่ทั้งชุด แล้วต่อท้ายด้วย "รายการที่ต้องคงไว้" เฉพาะที่เซิร์ฟเวอร์ไม่มี
 * (เช่น ผลผลิตในคิวรอส่ง เพื่อให้เจ้าของยังเห็นของตัวเองระหว่างรอ)
 */
export function replaceWithRemote<T extends { id: string }>(remote: T[], keep: T[] = []): T[] {
  const ids = new Set(remote.map((r) => r.id));
  return [...remote, ...keep.filter((k) => !ids.has(k.id))];
}
