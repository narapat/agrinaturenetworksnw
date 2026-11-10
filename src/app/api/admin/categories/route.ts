import { NextRequest } from 'next/server';
import { newId, optString, readJsonBody, reqEnum, reqString, runAdminRoute } from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import { PRODUCT_CATEGORIES, productCategoryName } from '@/lib/taxonomy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/categories
 * เพิ่มชนิดผลผลิต (Standard SKU Tag)
 * body: { name, category, icon?, description? }
 */
export async function POST(req: NextRequest) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const body = await readJsonBody(req);
    const cat = {
      id: newId('sku'),
      name: reqString(body.name, 'ชื่อชนิดผลผลิต', 1, 80),
      category: reqEnum(body.category, 'category', PRODUCT_CATEGORIES),
      icon: optString(body.icon, 'icon', 16) || '🌿',
      description: optString(body.description, 'คำอธิบาย', 300) || 'หมวดหมู่ผลผลิตที่กำหนดโดยแอดมินเครือข่าย',
      isActive: true,
    };

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'create_sku',
      details: `เพิ่มชนิดผลผลิต (SKU): "${cat.name}" (${productCategoryName(cat.category)})`,
      metadata: { categoryId: cat.id },
    });

    const batch = db.batch();
    batch.set(db.collection('categories').doc(cat.id), cat);
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { category: cat, auditLogId: audit.id };
  });
}
