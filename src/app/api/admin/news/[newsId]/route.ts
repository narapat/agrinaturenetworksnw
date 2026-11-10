import { NextRequest } from 'next/server';
import { NotFoundError, readJsonBody, runAdminRoute, safeId } from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import { parseNewsFields } from '@/lib/newsFields';

export const dynamic = 'force-dynamic';

type Params = { params: { newsId: string } };

const BROADCAST = {
  targetMemberId: 'network-broadcast',
  targetMemberName: 'เครือข่ายกสิกรรมธรรมชาตินครสวรรค์',
};

/**
 * PATCH /api/admin/news/{newsId}
 * แก้ไขประกาศ (ส่งเฉพาะ field ที่เปลี่ยน) รวมถึงซ่อน/เผยแพร่ด้วย { status }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const newsId = safeId(params.newsId, 'newsId');
    const updates = parseNewsFields(await readJsonBody(req), true);
    updates.updatedAt = new Date().toISOString();

    const ref = db.collection('news').doc(newsId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundError('ไม่พบประกาศนี้');
    const merged: Record<string, any> = { ...(snap.data() as Record<string, any>), ...updates, id: newsId };

    const statusOnly = Object.keys(updates).length === 2 && updates.status !== undefined;
    const audit = buildAdminAuditDoc(req, actor, {
      action: 'update_news',
      ...BROADCAST,
      targetFarmName: merged.location,
      details: statusOnly
        ? `${updates.status === 'hidden' ? 'ซ่อน' : 'เผยแพร่'}ประกาศ: "${merged.title}"`
        : `แก้ไขข้อมูลประกาศกิจกรรม: "${merged.title}" สถานะ: ${merged.status === 'hidden' ? 'ซ่อนไว้' : 'เผยแพร่อยู่'}`,
      metadata: { newsId, changed: Object.keys(updates) },
    });

    const batch = db.batch();
    batch.update(ref, updates);
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { news: merged, auditLogId: audit.id };
  });
}

/**
 * DELETE /api/admin/news/{newsId}
 * ลบประกาศถาวร (ต้องเข้าด้วย LINE — ถ้าเข้าด้วยรหัสผ่านสำรองให้ใช้ "ซ่อน" แทน)
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, { requireLine: true }, async ({ db, actor }) => {
    const newsId = safeId(params.newsId, 'newsId');
    const ref = db.collection('news').doc(newsId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundError('ไม่พบประกาศนี้');
    const item = snap.data() as Record<string, any>;

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'delete_news',
      ...BROADCAST,
      targetFarmName: item.location,
      details: `ลบประกาศกิจกรรม: "${item.title}" ออกจากระบบ`,
      metadata: { newsId },
    });

    const batch = db.batch();
    batch.delete(ref);
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { deletedId: newsId, auditLogId: audit.id };
  });
}
