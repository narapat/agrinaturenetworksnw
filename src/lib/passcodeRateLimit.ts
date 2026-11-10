import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Server-only: กัน brute force การเดา ADMIN_PASSCODE
 *
 * เก็บตัวนับใน Firestore (คอลเลกชัน adminLoginAttempts — client อ่าน/เขียนไม่ได้ ตาม default deny ใน rules)
 * เพราะ Vercel serverless จำค่าในหน่วยความจำข้ามคำขอไม่ได้
 *
 * นโยบาย:
 * - ต่อ IP: ผิดครบ IP_MAX_FAILURES ครั้งภายใน WINDOW_MS → ล็อก IP นั้น LOCK_MS
 * - ทั้งระบบ: ผิดรวมครบ GLOBAL_MAX_FAILURES ครั้งภายใน WINDOW_MS → ปิดการเข้าด้วย passcode ทั้งระบบ LOCK_MS
 *   (กันการสลับ IP; การเข้าด้วย LINE ยังใช้ได้ตามปกติ)
 * - เข้าสำเร็จ → ล้างตัวนับของ IP นั้น
 */

export const RATE_LIMIT_COLLECTION = 'adminLoginAttempts';
export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;
export const IP_MAX_FAILURES = 5;
export const GLOBAL_MAX_FAILURES = 20;

interface AttemptDoc {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

export function getClientIp(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

/** ไม่เก็บ IP ดิบเป็นชื่อเอกสาร */
function ipDocId(ip: string): string {
  return `ip_${crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32)}`;
}

const GLOBAL_DOC_ID = 'global';

function readDoc(data: any): AttemptDoc {
  return {
    failures: typeof data?.failures === 'number' ? data.failures : 0,
    windowStart: typeof data?.windowStart === 'number' ? data.windowStart : 0,
    lockedUntil: typeof data?.lockedUntil === 'number' ? data.lockedUntil : 0,
  };
}

export type LockStatus = { locked: false } | { locked: true; retryAfterSeconds: number; scope: 'ip' | 'global' };

/**
 * ตรวจว่าขณะนี้ถูกล็อกหรือไม่ (เรียกก่อนเปรียบเทียบ passcode)
 */
export async function checkPasscodeLock(db: Firestore, ip: string, now = Date.now()): Promise<LockStatus> {
  const col = db.collection(RATE_LIMIT_COLLECTION);
  const [ipSnap, globalSnap] = await Promise.all([col.doc(ipDocId(ip)).get(), col.doc(GLOBAL_DOC_ID).get()]);

  const g = readDoc(globalSnap.exists ? globalSnap.data() : null);
  if (g.lockedUntil > now) {
    return { locked: true, scope: 'global', retryAfterSeconds: Math.ceil((g.lockedUntil - now) / 1000) };
  }
  const i = readDoc(ipSnap.exists ? ipSnap.data() : null);
  if (i.lockedUntil > now) {
    return { locked: true, scope: 'ip', retryAfterSeconds: Math.ceil((i.lockedUntil - now) / 1000) };
  }
  return { locked: false };
}

function bump(doc: AttemptDoc, max: number, now: number): AttemptDoc {
  const inWindow = now - doc.windowStart <= WINDOW_MS;
  const failures = (inWindow ? doc.failures : 0) + 1;
  const windowStart = inWindow ? doc.windowStart : now;
  const lockedUntil = failures >= max ? now + LOCK_MS : doc.lockedUntil;
  return { failures, windowStart, lockedUntil };
}

/**
 * บันทึกการเดาผิด 1 ครั้ง (ทั้งระดับ IP และระดับระบบ) แบบ atomic
 */
export async function recordPasscodeFailure(db: Firestore, ip: string, now = Date.now()): Promise<void> {
  const col = db.collection(RATE_LIMIT_COLLECTION);
  const ipRef = col.doc(ipDocId(ip));
  const globalRef = col.doc(GLOBAL_DOC_ID);

  await db.runTransaction(async (tx) => {
    const [ipSnap, globalSnap] = await Promise.all([tx.get(ipRef), tx.get(globalRef)]);
    const nextIp = bump(readDoc(ipSnap.exists ? ipSnap.data() : null), IP_MAX_FAILURES, now);
    const nextGlobal = bump(readDoc(globalSnap.exists ? globalSnap.data() : null), GLOBAL_MAX_FAILURES, now);
    tx.set(ipRef, { ...nextIp, updatedAt: now });
    tx.set(globalRef, { ...nextGlobal, updatedAt: now });
  });
}

/**
 * เข้าสำเร็จ: ล้างตัวนับของ IP นั้น (ตัวนับระดับระบบหมดอายุเองตาม window)
 */
export async function clearPasscodeFailures(db: Firestore, ip: string): Promise<void> {
  await db.collection(RATE_LIMIT_COLLECTION).doc(ipDocId(ip)).delete();
}
