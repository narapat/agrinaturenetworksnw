import crypto from 'crypto';

/**
 * Server-only: ลิงก์ผูกบัญชี LINE ครั้งเดียว สำหรับสมาชิกเก่าที่ยังไม่เคยผูก LINE
 *
 * - แอดมินสร้างลิงก์ (/member/link?t=<token>) ส่งให้สมาชิกเอง
 * - เก็บเฉพาะ SHA-256 ของ token ใน memberLinkCodes/{hash} (ใครอ่านฐานข้อมูลได้ก็เอาไปใช้ไม่ได้)
 * - ใช้ได้ครั้งเดียว อายุ 48 ชั่วโมง สร้างใหม่แล้วลิงก์เก่าของสมาชิกคนเดิมใช้ไม่ได้อีก
 * - ตัวตนของสมาชิกมาจาก LINE ID Token ที่ LINE ยืนยันแล้วเท่านั้น
 */

export const LINK_CODES_COLLECTION = 'memberLinkCodes';
export const LINK_CODE_TTL_MS = 48 * 60 * 60 * 1000;

/** token ในลิงก์: สุ่ม 32 ไบต์ (base64url ยาว 43 ตัว) */
export function generateLinkToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashLinkToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isWellFormedLinkToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

/** สมาชิกที่ยังไม่เคยผูก LINE (ไม่มีทั้ง ownerUid และ lineUserId) */
export function isUnlinkedMember(member: Record<string, any> | undefined | null): boolean {
  return !!member && !member.ownerUid && !member.lineUserId;
}
