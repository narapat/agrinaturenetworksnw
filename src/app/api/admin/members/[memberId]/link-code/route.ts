import { NextRequest } from 'next/server';
import { NotFoundError, ValidationError, runAdminRoute, safeId } from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import {
  LINK_CODES_COLLECTION,
  LINK_CODE_TTL_MS,
  generateLinkToken,
  hashLinkToken,
  isUnlinkedMember,
} from '@/lib/memberLink';

export const dynamic = 'force-dynamic';

type Params = { params: { memberId: string } };

/**
 * POST /api/admin/members/{memberId}/link-code
 * สร้างลิงก์ผูกบัญชี LINE ครั้งเดียวให้สมาชิกที่ยังไม่เคยผูก (ต้องเข้าด้วย LINE เท่านั้น)
 * ลิงก์เก่าที่ยังไม่ได้ใช้ของสมาชิกคนนี้จะถูกยกเลิก
 * คืน token ครั้งเดียว (เซิร์ฟเวอร์เก็บแค่ hash) ให้หน้าแอดมินประกอบเป็นลิงก์เอง
 */
export async function POST(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, { requireLine: true }, async ({ db, actor }) => {
    const memberId = safeId(params.memberId, 'memberId');
    const snap = await db.collection('members').doc(memberId).get();
    if (!snap.exists) throw new NotFoundError('ไม่พบข้อมูลสมาชิก');
    const member: Record<string, any> = { ...(snap.data() as Record<string, any>), id: snap.id };
    if (!isUnlinkedMember(member)) {
      throw new ValidationError('สมาชิกคนนี้ผูกบัญชี LINE แล้ว ไม่ต้องสร้างลิงก์');
    }

    const token = generateLinkToken();
    const now = Date.now();
    const expiresAt = now + LINK_CODE_TTL_MS;

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'admin_create_link_code',
      targetMemberId: member.id,
      targetMemberName: member.fullName,
      targetFarmName: member.farmName || '-',
      details: `แอดมิน ${actor.name} สร้างลิงก์ผูกบัญชี LINE ให้ ${member.fullName} (ใช้ได้ 48 ชั่วโมง)`,
      metadata: { expiresAt: new Date(expiresAt).toISOString() },
    });

    const previous = await db.collection(LINK_CODES_COLLECTION).where('memberId', '==', member.id).get();
    const batch = db.batch();
    previous.docs.forEach((d) => {
      if (!d.data()?.usedAt) batch.delete(d.ref);
    });
    batch.set(db.collection(LINK_CODES_COLLECTION).doc(hashLinkToken(token)), {
      memberId: member.id,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      createdByName: actor.name,
      createdByLineUserId: actor.lineUserId || null,
    });
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { token, expiresAt, memberId: member.id };
  });
}
