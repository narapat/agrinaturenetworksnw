import { NextRequest } from 'next/server';
import { ValidationError, newId, optString, readJsonBody, reqEnum, reqString, runAdminRoute } from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import { PRACTICE_CATEGORIES, practiceCategoryName } from '@/lib/taxonomy';
import { listTaxonomy } from '@/lib/taxonomyDefaults';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/practices
 * เพิ่มวิถี/ศาสตร์กสิกรรมธรรมชาติ
 * body: { name, category, icon?, description? }
 */
export async function POST(req: NextRequest) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const body = await readJsonBody(req);
    const name = reqString(body.name, 'ชื่อวิถี/ศาสตร์', 1, 80);
    const category = reqEnum(body.category, 'category', PRACTICE_CATEGORIES);

    // ชื่อวิถีถูกใช้เป็นค่าอ้างอิงใน farms.practices จึงต้องไม่ซ้ำ
    const existing = await listTaxonomy(db, 'practices');
    if (existing.some((p) => p.name === name)) {
      throw new ValidationError(`มีวิถี/ศาสตร์ชื่อ "${name}" อยู่แล้ว`);
    }

    const today = new Date().toISOString().split('T')[0];
    const tag = {
      id: newId('practice'),
      name,
      category,
      categoryName: practiceCategoryName(category),
      icon: optString(body.icon, 'icon', 16) || '🌱',
      description: optString(body.description, 'คำอธิบาย', 300) || 'วิถีและศาสตร์กสิกรรมธรรมชาติ',
      isActive: true,
      createdAt: today,
      updatedAt: today,
    };

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'create_practice',
      details: `เพิ่มวิถี/ศาสตร์กสิกรรมธรรมชาติใหม่: "${tag.name}" (${tag.categoryName})`,
      metadata: { practiceId: tag.id },
    });

    const batch = db.batch();
    batch.set(db.collection('practices').doc(tag.id), tag);
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { practice: tag, auditLogId: audit.id };
  });
}
