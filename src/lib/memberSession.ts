import crypto from 'crypto';

/**
 * Server-only helper: session ของสมาชิกที่ล็อกอินด้วย LINE
 *
 * เซิร์ฟเวอร์เป็นผู้ตัดสินว่า "ใครล็อกอินอยู่" ผ่าน HTTP-Only cookie ที่ลงลายมือชื่อ HMAC-SHA256
 * และมีวันหมดอายุ ส่วน localStorage ฝั่ง client เป็นแค่แคชเพื่อแสดงผลเร็ว
 * (ใช้ secret เดียวกับ admin session แต่ payload มี kind: 'member' จึงใช้แทนกันไม่ได้)
 */

export const MEMBER_COOKIE_NAME = 'nsw_member_session';
export const MEMBER_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 วัน

export interface MemberSessionPayload {
  kind: 'member';
  /** LINE User ID ที่ยืนยันแล้วกับ LINE Server */
  sub: string;
  issuedAt: number;
  expiresAt: number;
}

const getSecret = (): string => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('Server configuration error: ADMIN_SESSION_SECRET is not configured');
  }
  return secret;
};

const sign = (serialized: string) =>
  crypto.createHmac('sha256', getSecret()).update(`member:${serialized}`).digest('base64url');

export function createMemberSessionToken(sub: string, now: number = Date.now()): { token: string; payload: MemberSessionPayload } {
  const payload: MemberSessionPayload = { kind: 'member', sub, issuedAt: now, expiresAt: now + MEMBER_SESSION_MS };
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${serialized}.${sign(serialized)}`, payload };
}

export function verifyMemberSessionToken(token: string | undefined | null): MemberSessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [serialized, signature] = token.split('.');
  if (!serialized || !signature) return null;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(sign(serialized));
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf-8')) as MemberSessionPayload;
    if (payload.kind !== 'member' || typeof payload.sub !== 'string' || !payload.sub) return null;
    if (!payload.expiresAt || !payload.issuedAt || Date.now() > payload.expiresAt) return null;
    if (payload.expiresAt - payload.issuedAt > MEMBER_SESSION_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

export function memberCookieOptions(value: string, maxAgeSeconds: number) {
  return {
    name: MEMBER_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // lax: ให้ cookie ติดไปด้วยเมื่อ LINE Login redirect กลับมาที่เว็บ
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
