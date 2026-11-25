import {
  INITIAL_AUDIT_LOGS,
  INITIAL_FARMS,
  INITIAL_MEMBERS,
  INITIAL_NEWS,
  INITIAL_PRODUCTS,
} from '@/data/mockData';

/**
 * ข้อมูลตัวอย่าง (Demo Mode)
 *
 * แปลง ผลผลิต ข่าว และสมาชิกตัวอย่างใน mockData ใช้ได้เฉพาะเมื่อเปิด NEXT_PUBLIC_DEMO_MODE=true
 * (เช่น เครื่องนักพัฒนาหรือ Preview) — ใน Production ห้ามแสดงหรือเติมข้อมูลตัวอย่างเด็ดขาด
 * ไม่อย่างนั้นแปลงตัวอย่างที่ลบไปแล้วจะกลับมาบนเครื่องผู้ใช้ทุกครั้งที่เปิดแอป
 *
 * หมวดหมู่ (SKU) และวิถี/ศาสตร์มาตรฐานไม่ใช่ข้อมูลตัวอย่าง จึงไม่อยู่ในไฟล์นี้ (ดู taxonomyDefaults)
 */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export type DemoKind = 'members' | 'farms' | 'products' | 'news' | 'logs';

const DEMO_IDS: Record<DemoKind, Set<string>> = {
  members: new Set(INITIAL_MEMBERS.map((m) => m.id)),
  farms: new Set(INITIAL_FARMS.map((f) => f.id)),
  products: new Set(INITIAL_PRODUCTS.map((p) => p.id)),
  news: new Set(INITIAL_NEWS.map((n) => n.id)),
  logs: new Set(INITIAL_AUDIT_LOGS.map((l) => l.id)),
};

/** บัญชีตัวแทนของแอดมินที่เข้าด้วยรหัสผ่านสำรอง (ไม่ใช่ข้อมูลตัวอย่างที่แสดงต่อสาธารณะ) */
export const ADMIN_PLACEHOLDER_MEMBER_ID = 'admin-001';

export function isDemoId(kind: DemoKind, id: string | undefined | null): boolean {
  return !!id && DEMO_IDS[kind].has(id);
}

/** ตัดรายการตัวอย่างออก เว้นแต่เปิด Demo Mode */
export function withoutDemo<T extends { id: string }>(kind: DemoKind, items: T[]): T[] {
  if (isDemoMode()) return items;
  return items.filter((item) => !DEMO_IDS[kind].has(item.id));
}

/** ข้อมูลตัวอย่างที่ใช้เติม (ว่างเปล่าเมื่อปิด Demo Mode) */
export function demoSeed() {
  const on = isDemoMode();
  return {
    members: on ? [...INITIAL_MEMBERS] : INITIAL_MEMBERS.filter((m) => m.id === ADMIN_PLACEHOLDER_MEMBER_ID),
    farms: on ? [...INITIAL_FARMS] : [],
    products: on ? [...INITIAL_PRODUCTS] : [],
    news: on ? [...INITIAL_NEWS] : [],
    logs: on ? [...INITIAL_AUDIT_LOGS] : [],
  };
}
