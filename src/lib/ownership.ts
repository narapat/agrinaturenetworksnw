import type { Farm, MemberProfile } from '@/types';

/**
 * ผู้ใช้คนนี้เป็นเจ้าของแปลงจริงหรือไม่
 *
 * ใช้ตัดสินการแสดงผลแบบ "เจ้าของแปลง" บนหน้าเว็บเท่านั้น (สิทธิ์แก้ไขจริงตัดสินที่ Firestore rules / server)
 * - ตรงกันด้วย memberId หรือ farmId ของสมาชิก หรือ LINE UID (ownerUid)
 * - บทบาทแอดมิน "ไม่" ทำให้เป็นเจ้าของแปลงของคนอื่น
 */
export function isFarmOwner(
  user: (Pick<MemberProfile, 'id'> & Partial<Pick<MemberProfile, 'farmId' | 'ownerUid' | 'lineUserId'>>) | null | undefined,
  farm: (Pick<Farm, 'id' | 'memberId'> & Partial<Pick<Farm, 'ownerUid'>>) | null | undefined
): boolean {
  if (!user || !farm) return false;
  if (user.id && user.id === farm.memberId) return true;
  if (user.farmId && user.farmId === farm.id) return true;
  if (farm.ownerUid && (user.ownerUid === farm.ownerUid || user.lineUserId === farm.ownerUid)) return true;
  return false;
}
