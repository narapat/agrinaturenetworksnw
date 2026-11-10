import type { NextRequest } from 'next/server';
import type { AdminActor } from './requireAdmin';

/**
 * Server-only: สร้างเอกสาร Audit Log สำหรับการกระทำของแอดมิน
 *
 * เขียนทั้ง field รูปแบบ server (actorRole, actorUid, authMethod, ...) และ
 * field รูปแบบ AuditLog เดิมของ UI (performedByAdminName, targetMemberName, ...) เพื่อให้แท็บประวัติแสดงผลได้
 * ควรเขียนใน batch เดียวกับการเปลี่ยนแปลงข้อมูล (สำเร็จพร้อมกันหรือล้มเหลวพร้อมกัน)
 */
export function buildAdminAuditDoc(
  req: NextRequest,
  actor: AdminActor,
  entry: {
    action: string;
    details: string;
    targetMemberId?: string;
    targetMemberName?: string;
    targetFarmName?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const now = new Date();
  const id = `log-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    action: entry.action,
    details: entry.details,
    // รูปแบบ server (ยืนยันแล้ว)
    timestamp: now.toISOString(),
    actorRole: 'admin' as const,
    actorUid: actor.lineUserId,
    authMethod: actor.method === 'line' ? 'admin_line' : 'admin_passcode',
    actorName: actor.name,
    targetId: entry.targetMemberId || null,
    metadata: entry.metadata || {},
    ip: req.headers.get('x-forwarded-for') || 'local',
    userAgent: req.headers.get('user-agent') || 'unknown',
    // รูปแบบ AuditLog เดิมที่ UI ใช้แสดงผล
    performedByAdminId: actor.lineUserId || 'passcode-session',
    performedByAdminName: actor.method === 'passcode' ? `${actor.name} (รหัสผ่านสำรอง)` : actor.name,
    targetMemberId: entry.targetMemberId || '-',
    targetMemberName: entry.targetMemberName || '-',
    targetFarmName: entry.targetFarmName || '-',
  };
}
