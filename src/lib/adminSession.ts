import crypto from 'crypto';

/**
 * Server-only helper: Admin session cookie ลงลายมือชื่อด้วย HMAC-SHA256
 * ใช้ร่วมกันระหว่าง /api/admin/auth และ API อื่นที่ต้องตรวจสิทธิ์แอดมิน
 */

export const ADMIN_COOKIE_NAME = 'nsw_admin_auth_session';

/** Session จาก LINE (ตัวตนยืนยันได้) */
export const ADMIN_LINE_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 วัน
/** Session จาก passcode (ทางสำรอง ใช้ร่วมกันหลายคน) — สั้นโดยเจตนา */
export const ADMIN_PASSCODE_SESSION_MS = 3 * 60 * 60 * 1000; // 3 ชั่วโมง

/** @deprecated ใช้ sessionDurationFor(method) แทน */
export const ADMIN_SESSION_DURATION_MS = ADMIN_LINE_SESSION_MS;

export type AdminAuthMethod = 'passcode' | 'line';

export interface AdminSessionPayload {
  role: 'admin';
  expiresAt: number;
  issuedAt: number;
  method: AdminAuthMethod;
  /** LINE User ID ที่ยืนยันแล้วจาก ID Token (ไม่มีถ้าเข้าด้วย passcode) */
  lineUserId?: string;
  /** ชื่อผู้ดำเนินการ: จาก LINE profile หรือที่กรอกตอนเข้าด้วย passcode (ยืนยันไม่ได้) */
  actorName?: string;
}

export function sessionDurationFor(method: AdminAuthMethod): number {
  return method === 'line' ? ADMIN_LINE_SESSION_MS : ADMIN_PASSCODE_SESSION_MS;
}

const getSecret = (): string => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('Server configuration error: ADMIN_SESSION_SECRET is not configured');
  }
  return secret;
};

export function createAdminSessionToken(payload: AdminSessionPayload): string {
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(serialized).digest('base64url');
  return `${serialized}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): AdminSessionPayload | null {
  if (!token || !token.includes('.')) return null;

  const [serialized, signature] = token.split('.');
  if (!serialized || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', getSecret()).update(serialized).digest('base64url');

  // ใช้ timingSafeEqual เพื่อป้องกัน Timing Attack
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf-8')) as AdminSessionPayload;
    if (payload.role !== 'admin' || !payload.expiresAt || Date.now() > payload.expiresAt) {
      return null;
    }
    // Token รุ่นเก่าที่ไม่มี method (ออกก่อนแยกอายุ session) ถือว่าหมดอายุ ให้ล็อกอินใหม่
    if (payload.method !== 'line' && payload.method !== 'passcode') {
      return null;
    }
    // ป้องกัน token ที่อายุยาวเกินนโยบายของ method นั้น
    if (payload.expiresAt - payload.issuedAt > sessionDurationFor(payload.method)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function adminCookieOptions(value: string, maxAgeSeconds: number) {
  return {
    name: ADMIN_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
