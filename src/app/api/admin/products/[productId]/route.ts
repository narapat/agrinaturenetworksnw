import { NextRequest } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import {
  NotFoundError,
  ValidationError,
  optString,
  readJsonBody,
  reqEnum,
  reqNumber,
  reqString,
  runAdminRoute,
  safeId,
} from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import { PRODUCT_STATUSES, productCategoryName } from '@/lib/taxonomy';
import { loadTaxonomyItem } from '@/lib/taxonomyDefaults';

export const dynamic = 'force-dynamic';

type Params = { params: { productId: string } };

const STATUS_LABEL: Record<string, string> = {
  sale: 'ขาย',
  share: 'แบ่งปันฟรี',
  preorder: 'จองล่วงหน้า',
  out_of_stock: 'หมด',
  hidden: 'ไม่แสดง',
};

/** ผู้ที่เกี่ยวข้องกับผลผลิต สำหรับบันทึกในประวัติ */
async function loadContext(db: Firestore, product: Record<string, any>) {
  let memberId = '-';
  let memberName = '-';
  if (product.farmId) {
    const farm = await db.collection('farms').doc(product.farmId).get();
    const f = farm.exists ? (farm.data() as Record<string, any>) : null;
    if (f?.memberId) {
      memberId = f.memberId;
      const m = await db.collection('members').doc(f.memberId).get();
      if (m.exists) memberName = (m.data() as Record<string, any>).fullName || '-';
    }
  }
  return { memberId, memberName };
}

/**
 * PATCH /api/admin/products/{productId}
 * แอดมินแก้ไขผลผลิตของแปลงใดก็ได้ (ส่งเฉพาะ field ที่เปลี่ยน)
 * { title?, price?, unit?, description?, status?, skuTagId? }
 *
 * ไม่รับ farmId / ownerUid / ข้อมูลติดต่อ — ผลผลิตยังเป็นของแปลงเดิมเสมอ
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const productId = safeId(params.productId, 'productId');
    const body = await readJsonBody(req);

    const updates: Record<string, any> = {};
    if (body.title !== undefined) updates.title = reqString(body.title, 'ชื่อผลผลิต', 2, 150);
    if (body.price !== undefined) updates.price = reqNumber(body.price, 'ราคา', 0, 1_000_000);
    if (body.unit !== undefined) updates.unit = reqString(body.unit, 'หน่วย', 1, 40);
    if (body.description !== undefined) updates.description = optString(body.description, 'รายละเอียด', 2000) || '';
    if (body.status !== undefined) updates.status = reqEnum(body.status, 'status', PRODUCT_STATUSES);
    if (body.skuTagId !== undefined) {
      const skuTagId = safeId(body.skuTagId, 'skuTagId');
      const sku = await loadTaxonomyItem(db, 'categories', skuTagId);
      if (!sku) throw new NotFoundError('ไม่พบชนิดผลผลิต (SKU) ที่เลือก');
      updates.skuTagId = skuTagId;
      updates.skuTagName = sku.data.name;
      updates.category = sku.data.category;
      updates.categoryName = productCategoryName(sku.data.category);
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('ไม่มีข้อมูลที่ต้องแก้ไข');
    updates.updatedAt = new Date().toISOString().split('T')[0];

    const ref = db.collection('products').doc(productId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundError('ไม่พบผลผลิตนี้');
    const before = snap.data() as Record<string, any>;
    const merged: Record<string, any> = { ...before, ...updates, id: productId };
    const ctx = await loadContext(db, before);

    const changed = Object.keys(updates).filter((k) => k !== 'updatedAt');
    const statusOnly = changed.length === 1 && changed[0] === 'status';
    const audit = buildAdminAuditDoc(req, actor, {
      action: 'admin_update_product',
      targetMemberId: ctx.memberId,
      targetMemberName: ctx.memberName,
      targetFarmName: before.farmName || '-',
      details: statusOnly
        ? `แอดมิน ${actor.name} เปลี่ยนสถานะผลผลิต "${before.title}" จาก ${STATUS_LABEL[before.status] || before.status} เป็น ${STATUS_LABEL[updates.status]}`
        : `แอดมิน ${actor.name} แก้ไขผลผลิต "${merged.title}" ของแปลง ${before.farmName || '-'} (${changed.join(', ')})`,
      metadata: {
        productId,
        changed,
        before: Object.fromEntries(changed.map((k) => [k, before[k] ?? null])),
      },
    });

    const batch = db.batch();
    batch.update(ref, updates);
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { product: merged, auditLogId: audit.id };
  });
}

/**
 * DELETE /api/admin/products/{productId}
 * ลบผลผลิตถาวร (ต้องเข้าด้วย LINE — ถ้าเข้าด้วยรหัสผ่านสำรองให้ใช้สถานะ "ไม่แสดง" แทน)
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, { requireLine: true }, async ({ db, actor }) => {
    const productId = safeId(params.productId, 'productId');
    const ref = db.collection('products').doc(productId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundError('ไม่พบผลผลิตนี้');
    const product = snap.data() as Record<string, any>;
    const ctx = await loadContext(db, product);

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'admin_delete_product',
      targetMemberId: ctx.memberId,
      targetMemberName: ctx.memberName,
      targetFarmName: product.farmName || '-',
      details: `แอดมิน ${actor.name} ลบผลผลิต "${product.title}" ของแปลง ${product.farmName || '-'} ออกจากระบบ`,
      metadata: { productId, title: product.title, farmId: product.farmId || null },
    });

    const batch = db.batch();
    batch.delete(ref);
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { deletedId: productId, auditLogId: audit.id };
  });
}
