import { NextRequest } from 'next/server';
import {
  MAX_BATCH_OPS,
  NotFoundError,
  ValidationError,
  optString,
  readJsonBody,
  reqBool,
  reqEnum,
  reqString,
  runAdminRoute,
  safeId,
} from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import { PRODUCT_CATEGORIES, productCategoryName } from '@/lib/taxonomy';
import type { ProductCategory } from '@/types';
import { isBuiltIn, loadTaxonomyItem } from '@/lib/taxonomyDefaults';

export const dynamic = 'force-dynamic';

type Params = { params: { categoryId: string } };

/**
 * PATCH /api/admin/categories/{categoryId}
 * แก้ไขชนิดผลผลิต (ส่งเฉพาะ field ที่เปลี่ยน): { name?, category?, icon?, description?, isActive? }
 * ถ้าเปลี่ยนชื่อหรือหมวด จะซิงค์ไปยังผลผลิตที่ใช้ชนิดนี้ทั้งหมดใน batch เดียวกัน
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const categoryId = safeId(params.categoryId, 'categoryId');
    const body = await readJsonBody(req);

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = reqString(body.name, 'ชื่อชนิดผลผลิต', 1, 80);
    if (body.category !== undefined) updates.category = reqEnum(body.category, 'category', PRODUCT_CATEGORIES);
    if (body.icon !== undefined) updates.icon = optString(body.icon, 'icon', 16) || '🌿';
    if (body.description !== undefined) updates.description = optString(body.description, 'คำอธิบาย', 300) || '';
    if (body.isActive !== undefined) updates.isActive = reqBool(body.isActive, 'isActive');
    if (Object.keys(updates).length === 0) throw new ValidationError('ไม่มีข้อมูลที่ต้องแก้ไข');

    const ref = db.collection('categories').doc(categoryId);
    const found = await loadTaxonomyItem(db, 'categories', categoryId);
    if (!found) throw new NotFoundError('ไม่พบชนิดผลผลิตนี้');
    const merged: Record<string, any> = { ...found.data, ...updates, id: categoryId };
    if (!merged.name) throw new ValidationError('กรุณาตั้งชื่อชนิดผลผลิต');

    const cascade = updates.name !== undefined || updates.category !== undefined;
    const products = cascade ? (await db.collection('products').where('skuTagId', '==', categoryId).get()).docs : [];
    if (products.length + 2 > MAX_BATCH_OPS) {
      throw new ValidationError(`มีผลผลิตที่ต้องซิงค์มากเกินไป (${products.length} รายการ)`);
    }

    const audit = buildAdminAuditDoc(req, actor, {
      action: updates.isActive !== undefined && Object.keys(updates).length === 1 ? 'toggle_sku' : 'update_sku',
      details:
        updates.isActive !== undefined && Object.keys(updates).length === 1
          ? `${updates.isActive ? 'เปิด' : 'ปิด'}รับสินค้าใหม่สำหรับชนิดผลผลิต "${merged.name}"`
          : `แก้ไขข้อมูลชนิดผลผลิต (SKU): "${merged.name}" (${productCategoryName(merged.category)})${
              products.length ? ` และซิงค์ไปยังผลผลิต ${products.length} รายการ` : ''
            }`,
      metadata: { categoryId, changed: Object.keys(updates) },
    });

    const batch = db.batch();
    // รายการมาตรฐานที่ยังไม่เคยถูกบันทึก: สร้างเอกสารเต็ม แทนการ update
    if (found.persisted && !found.incomplete) batch.update(ref, updates);
    else batch.set(ref, merged);
    for (const p of products) {
      batch.update(p.ref as any, {
        skuTagName: merged.name,
        category: merged.category,
        categoryName: productCategoryName(merged.category as ProductCategory),
      });
    }
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { category: merged, updatedProductCount: products.length, auditLogId: audit.id };
  });
}

/**
 * DELETE /api/admin/categories/{categoryId}?targetId={otherCategoryId}
 * ลบชนิดผลผลิต (ต้องเข้าด้วย LINE เท่านั้น)
 * ถ้ายังมีผลผลิตใช้ชนิดนี้อยู่ ต้องระบุ targetId เพื่อโยกย้ายไปชนิดอื่นก่อน (กันผลผลิตตกหล่นจากตลาด)
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, { requireLine: true }, async ({ db, actor }) => {
    const categoryId = safeId(params.categoryId, 'categoryId');
    const targetParam = new URL(req.url).searchParams.get('targetId');
    const targetId = targetParam ? safeId(targetParam, 'targetId') : null;
    if (targetId === categoryId) throw new ValidationError('ปลายทางต้องไม่ใช่ชนิดเดียวกับที่ลบ');

    const ref = db.collection('categories').doc(categoryId);
    const found = await loadTaxonomyItem(db, 'categories', categoryId);
    if (!found) throw new NotFoundError('ไม่พบชนิดผลผลิตนี้');
    const source = found.data;

    const products = (await db.collection('products').where('skuTagId', '==', categoryId).get()).docs;

    let target: Record<string, any> | null = null;
    if (products.length > 0) {
      if (!targetId) {
        throw new ValidationError(`ยังมีผลผลิต ${products.length} รายการใช้ชนิดนี้ กรุณาเลือกชนิดปลายทางก่อนลบ`);
      }
      const t = await loadTaxonomyItem(db, 'categories', targetId);
      if (!t) throw new NotFoundError('ไม่พบชนิดผลผลิตปลายทาง');
      target = t.data;
    }
    if (products.length + 2 > MAX_BATCH_OPS) {
      throw new ValidationError(`มีผลผลิตที่ต้องโยกย้ายมากเกินไป (${products.length} รายการ)`);
    }

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'delete_sku',
      details: target
        ? `ลบชนิดผลผลิต "${source.name}" และโยกย้ายผลผลิต ${products.length} รายการไปยัง "${target.name}"`
        : `ลบชนิดผลผลิต "${source.name}" (ไม่มีผลผลิตตกค้าง)`,
      metadata: { categoryId, targetId: target?.id || null, productIds: products.map((p) => p.id) },
    });

    const batch = db.batch();
    if (target) {
      for (const p of products) {
        batch.update(p.ref as any, {
          skuTagId: target.id,
          skuTagName: target.name,
          category: target.category,
          categoryName: productCategoryName(target.category),
        });
      }
    }
    // รายการมาตรฐาน: เขียนป้ายลบไว้ ไม่อย่างนั้นค่าเริ่มต้นจะถูกเติมกลับมาเอง
    if (isBuiltIn('categories', categoryId)) batch.set(ref, { id: categoryId, deleted: true, deletedAt: new Date().toISOString() });
    else batch.delete(ref);
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { deletedName: source.name, reassignedCount: products.length, targetId: target?.id || null, auditLogId: audit.id };
  });
}
