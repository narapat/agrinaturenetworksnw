import { NextRequest } from 'next/server';
import { newId, readJsonBody, runAdminRoute } from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import { parseNewsFields } from '@/lib/newsFields';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/news
 * ลงประกาศ/กิจกรรมใหม่
 */
export async function POST(req: NextRequest) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const body = await readJsonBody(req);
    const now = new Date().toISOString();
    const item: Record<string, any> = { id: newId('news'), ...parseNewsFields(body, false), createdAt: now, updatedAt: now };

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'create_news',
      targetMemberId: 'network-broadcast',
      targetMemberName: 'เครือข่ายกสิกรรมธรรมชาตินครสวรรค์',
      targetFarmName: item.location,
      details: `ลงประกาศกิจกรรมใหม่: "${item.title}" (${item.category}) สถานะ: ${item.status === 'hidden' ? 'ซ่อนไว้' : 'เผยแพร่อยู่'}`,
      metadata: { newsId: item.id },
    });

    const batch = db.batch();
    batch.set(db.collection('news').doc(item.id), item);
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { news: item, auditLogId: audit.id };
  });
}
