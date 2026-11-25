import { NextRequest } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import {
  MAX_BATCH_OPS,
  NotFoundError,
  ValidationError,
  optString,
  readJsonBody,
  reqEnum,
  runAdminRoute,
  safeId,
} from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import { pickPrimaryMember } from '@/lib/primaryMember';

export const dynamic = 'force-dynamic';

type Params = { params: { memberId: string } };

async function loadMember(db: Firestore, memberId: string): Promise<Record<string, any>> {
  const snap = await db.collection('members').doc(memberId).get();
  if (!snap.exists) throw new NotFoundError('ไม่พบข้อมูลสมาชิก');
  return { ...(snap.data() as Record<string, any>), id: snap.id };
}

/** แปลงทั้งหมดของสมาชิก: จาก member.farmId และจาก farms.memberId (กันข้อมูลเก่าที่ผูกไม่ครบ) */
async function loadMemberFarms(db: Firestore, member: Record<string, any>): Promise<Record<string, any>[]> {
  const byId = new Map<string, Record<string, any>>();
  if (typeof member.farmId === 'string' && member.farmId) {
    const s = await db.collection('farms').doc(member.farmId).get();
    if (s.exists) byId.set(s.id, { ...(s.data() as Record<string, any>), id: s.id });
  }
  const q = await db.collection('farms').where('memberId', '==', member.id).get();
  q.docs.forEach((d) => byId.set(d.id, { ...(d.data() as Record<string, any>), id: d.id }));
  return Array.from(byId.values());
}

/**
 * POST /api/admin/members/{memberId}
 * body: { action: 'approve' | 'reject', reason?: string }
 * เปลี่ยนสถานะสมาชิกและแปลงพร้อมบันทึก audit log ใน batch เดียว
 */
export async function POST(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const memberId = safeId(params.memberId, 'memberId');
    const body = await readJsonBody(req);
    const action = reqEnum(body.action, 'action', ['approve', 'reject'] as const);
    const reason = optString(body.reason, 'reason', 500);

    const member = await loadMember(db, memberId);
    const farms = await loadMemberFarms(db, member);
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const farmNames = farms.map((f) => f.farmName).filter(Boolean).join(', ');

    const audit = buildAdminAuditDoc(req, actor, {
      action: action === 'approve' ? 'approve_member' : 'reject_member',
      targetMemberId: member.id,
      targetMemberName: member.fullName,
      targetFarmName: farmNames || '-',
      details:
        action === 'approve'
          ? `แอดมิน ${actor.name} อนุมัติการเป็นสมาชิกของ ${member.fullName}${farmNames ? ` (${farmNames})` : ''}`
          : `แอดมิน ${actor.name} ไม่อนุมัติสมาชิก ${member.fullName}${farmNames ? ` (${farmNames})` : ''}${reason ? ` เหตุผล: ${reason}` : ''}`,
      metadata: { previousStatus: member.status || null, farmIds: farms.map((f) => f.id) },
    });

    const batch = db.batch();
    batch.update(db.collection('members').doc(member.id), { status: newStatus });
    for (const f of farms) batch.update(db.collection('farms').doc(f.id), { status: newStatus });
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { memberId: member.id, status: newStatus, farmIds: farms.map((f) => f.id), auditLogId: audit.id };
  });
}

/**
 * DELETE /api/admin/members/{memberId}
 * ลบถาวรครบทุกส่วน (ต้องเข้าด้วย LINE เท่านั้น):
 *  members/{id}, members/{id}/private/pii, farms ที่ผูกอยู่ + private/contact,
 *  products ของแปลงเหล่านั้น และ registrations/{ownerUid} (ให้สมัครใหม่ได้)
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, { requireLine: true }, async ({ db, actor }) => {
    const memberId = safeId(params.memberId, 'memberId');
    const member = await loadMember(db, memberId);
    const farms = await loadMemberFarms(db, member);

    const ownerUids = new Set<string>(
      [member.ownerUid, member.lineUserId, ...farms.map((f) => f.ownerUid)].filter(
        (u): u is string => typeof u === 'string' && !!u
      )
    );

    // สมาชิกคนอื่นที่ใช้ LINE เดียวกัน (ข้อมูลเก่าซ้ำ): เอกสาร registrations/{uid} ต้องย้ายไปชี้บัญชีหลักที่เหลือ ไม่ใช่ลบ
    const othersByUid = new Map<string, Record<string, any>>();
    for (const uid of Array.from(ownerUids)) {
      const [a, b] = await Promise.all([
        db.collection('members').where('ownerUid', '==', uid).get(),
        db.collection('members').where('lineUserId', '==', uid).get(),
      ]);
      const others = [...a.docs, ...b.docs]
        .filter((d) => d.id !== member.id)
        .map((d): Record<string, any> & { id: string } => ({ ...(d.data() as Record<string, any>), id: d.id }));
      const primary = pickPrimaryMember(others);
      if (primary) othersByUid.set(uid, primary);
    }

    // กันแอดมินลบบัญชีสมาชิกของตัวเองโดยไม่ตั้งใจ
    // ยกเว้นใบสมัครที่ยังไม่อนุมัติซึ่งซ้ำกับบัญชีหลักของแอดมินเอง (เช่น ใบสมัครทดสอบ) — บัญชีหลักยังอยู่
    if (actor.lineUserId && ownerUids.has(actor.lineUserId)) {
      const isDuplicateApplication = member.status !== 'approved' && othersByUid.has(actor.lineUserId);
      if (!isDuplicateApplication) {
        throw new ValidationError('ไม่สามารถลบบัญชีสมาชิกของตัวเองได้');
      }
    }

    const productSnaps = await Promise.all(
      farms.map((f) => db.collection('products').where('farmId', '==', f.id).get())
    );
    const productIds = productSnaps.flatMap((s) => s.docs.map((d) => d.id));

    const memberRef = db.collection('members').doc(member.id);
    const refs = [
      memberRef,
      memberRef.collection('private').doc('pii'),
      ...farms.flatMap((f) => {
        const farmRef = db.collection('farms').doc(f.id);
        return [farmRef, farmRef.collection('private').doc('contact')];
      }),
      ...productIds.map((id) => db.collection('products').doc(id)),
      ...Array.from(ownerUids)
        .filter((uid) => !othersByUid.has(uid))
        .map((uid) => db.collection('registrations').doc(uid)),
    ];

    if (refs.length + othersByUid.size + 1 > MAX_BATCH_OPS) {
      throw new ValidationError(`ข้อมูลที่ต้องลบมีมากเกินไป (${refs.length} รายการ) กรุณาติดต่อผู้ดูแลระบบ`);
    }

    const farmNames = farms.map((f) => f.farmName).filter(Boolean).join(', ');
    const audit = buildAdminAuditDoc(req, actor, {
      action: 'delete_member',
      targetMemberId: member.id,
      targetMemberName: member.fullName,
      targetFarmName: farmNames || 'ลบข้อมูลถาวร',
      details: `แอดมิน ${actor.name} ลบข้อมูลสมาชิก ${member.fullName} ถาวร (แปลง ${farms.length} แปลง, ผลผลิต ${productIds.length} รายการ)`,
      metadata: { farmIds: farms.map((f) => f.id), productIds, previousStatus: member.status || null },
    });

    const batch = db.batch();
    refs.forEach((r) => batch.delete(r));
    const nowIso = new Date().toISOString();
    othersByUid.forEach((other, uid) => {
      batch.set(db.collection('registrations').doc(uid), {
        ownerUid: uid,
        memberId: other.id,
        farmId: other.farmId || '',
        status: other.status || 'approved',
        updatedAt: nowIso,
      }, { merge: true });
    });
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return {
      memberId: member.id,
      deleted: { farms: farms.map((f) => f.id), products: productIds, registrations: ownerUids.size - othersByUid.size },
      auditLogId: audit.id,
    };
  });
}
