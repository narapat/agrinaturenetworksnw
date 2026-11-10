import { NextRequest, NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin';
import { requireAdmin, type AdminActor } from './requireAdmin';

/**
 * Server-only: โครงร่างกลางของ Admin API routes
 * - ตรวจสิทธิ์แอดมิน (requireAdmin) ก่อนทุกอย่าง
 * - Admin SDK ไม่พร้อม → 500 ทันที (Zero Silent Fallback)
 * - ValidationError → 400, NotFoundError → 404, อื่นๆ → 500
 */

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

export interface AdminRouteContext {
  req: NextRequest;
  db: Firestore;
  actor: AdminActor;
}

export async function runAdminRoute(
  req: NextRequest,
  opts: { requireLine?: boolean },
  handler: (ctx: AdminRouteContext) => Promise<Record<string, unknown>>
): Promise<NextResponse> {
  const auth = await requireAdmin(req, { requireLine: opts.requireLine });
  if (!auth.ok) return auth.response;

  const db = getAdminDb();
  if (!db) {
    console.error('[Admin API] Firebase Admin SDK is not configured.');
    return NextResponse.json(
      { success: false, message: 'Server configuration error: ฐานข้อมูลฝั่งเซิร์ฟเวอร์ไม่พร้อมใช้งาน' },
      { status: 500 }
    );
  }

  try {
    const result = await handler({ req, db, actor: auth.actor });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 400 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ success: false, message: err.message }, { status: 404 });
    }
    console.error('[Admin API Error]:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function readJsonBody(req: NextRequest): Promise<Record<string, any>> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('ข้อมูลคำขอไม่ถูกต้อง (Invalid JSON)');
  }
  return body;
}

// ==================== Validators ====================

export function reqString(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== 'string') throw new ValidationError(`${field}: ต้องเป็นข้อความ`);
  const s = v.trim();
  if (s.length < min) throw new ValidationError(`${field}: ต้องมีอย่างน้อย ${min} ตัวอักษร`);
  if (s.length > max) throw new ValidationError(`${field}: ยาวเกิน ${max} ตัวอักษร`);
  return s;
}

export function optString(v: unknown, field: string, max: number): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ValidationError(`${field}: ต้องเป็นข้อความ`);
  const s = v.trim();
  if (s.length > max) throw new ValidationError(`${field}: ยาวเกิน ${max} ตัวอักษร`);
  return s;
}

export function reqEnum<T extends string>(v: unknown, field: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new ValidationError(`${field}: ค่าไม่ถูกต้อง`);
  }
  return v as T;
}

export function reqBool(v: unknown, field: string): boolean {
  if (typeof v !== 'boolean') throw new ValidationError(`${field}: ต้องเป็น true/false`);
  return v;
}

export function reqNumber(v: unknown, field: string, min: number, max: number): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) {
    throw new ValidationError(`${field}: ต้องเป็นตัวเลข ${min}–${max}`);
  }
  return n;
}

/** รูปภาพ: URL https หรือ data:image (บีบอัดมาแล้วจากฝั่ง client) */
export function reqImage(v: unknown, field: string, maxDataUrlChars = 900_000): string {
  if (typeof v !== 'string' || !v.trim()) throw new ValidationError(`${field}: ต้องระบุรูปภาพ`);
  const s = v.trim();
  if (s.startsWith('https://')) {
    if (s.length > 2000) throw new ValidationError(`${field}: URL ยาวเกินไป`);
    return s;
  }
  if (s.startsWith('data:image/')) {
    if (s.length > maxDataUrlChars) throw new ValidationError(`${field}: รูปภาพใหญ่เกินไป กรุณาย่อขนาด`);
    return s;
  }
  throw new ValidationError(`${field}: ต้องเป็น https URL หรือรูปที่อัปโหลด`);
}

/** id จาก URL path: กันอักขระที่ทำให้ path ของ Firestore เพี้ยน */
export function safeId(v: string | undefined, field = 'id'): string {
  if (!v || !/^[A-Za-z0-9_\-]{1,120}$/.test(v)) throw new ValidationError(`${field} ไม่ถูกต้อง`);
  return v;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Firestore batch จำกัด 500 operations */
export const MAX_BATCH_OPS = 450;
