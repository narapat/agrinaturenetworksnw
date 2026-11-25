/**
 * LINE หนึ่งบัญชีควรผูกกับสมาชิกได้คนเดียว แต่ข้อมูลเก่าอาจมีซ้ำ
 * (เช่น บัญชีจริงที่สร้างก่อนมีระบบกันสมัครซ้ำ + ใบสมัครทดสอบที่สมัครทีหลังด้วย LINE เดียวกัน)
 * เมื่อเจอหลายคน ให้เลือก "บัญชีหลัก" แบบคงที่: อนุมัติแล้ว > รออนุมัติ > อื่นๆ แล้วเลือกที่สร้างก่อน
 */
const STATUS_RANK: Record<string, number> = { approved: 0, pending: 1, rejected: 2 };

export function pickPrimaryMember<T extends { id: string; status?: string; createdAt?: string }>(members: T[]): T | undefined {
  if (members.length <= 1) return members[0];
  return [...members].sort((a, b) => {
    const r = (STATUS_RANK[a.status || ''] ?? 3) - (STATUS_RANK[b.status || ''] ?? 3);
    if (r !== 0) return r;
    const c = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  })[0];
}
