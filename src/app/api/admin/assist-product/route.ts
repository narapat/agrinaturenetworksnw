import { NextRequest } from 'next/server';
import {
  NotFoundError,
  ValidationError,
  newId,
  optString,
  readJsonBody,
  reqEnum,
  reqImage,
  reqNumber,
  reqString,
  runAdminRoute,
  safeId,
} from '@/lib/adminRoute';
import { buildAdminAuditDoc } from '@/lib/adminAudit';
import { PRODUCT_STATUSES, productCategoryName } from '@/lib/taxonomy';
import { loadTaxonomyItem } from '@/lib/taxonomyDefaults';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/assist-product
 * แอดมินช่วยลงผลผลิตแทนสมาชิก (Assisted Entry)
 * body: { memberId, title, skuTagId, price, unit?, description?, status?, images? }
 *
 * ข้อมูลแปลง/หมวดหมู่/ownerUid มาจากฐานข้อมูลฝั่ง server ทั้งหมด (ไม่เชื่อค่าจาก client)
 * เบอร์โทร / LINE ID ใส่ในสินค้าเฉพาะเมื่อแปลงเปิดเผยสู่สาธารณะเท่านั้น
 */
export async function POST(req: NextRequest) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const body = await readJsonBody(req);
    const memberId = safeId(body.memberId, 'memberId');
    const skuTagId = safeId(body.skuTagId, 'skuTagId');
    const title = reqString(body.title, 'ชื่อผลผลิต', 2, 150);
    const price = reqNumber(body.price ?? 0, 'ราคา', 0, 1_000_000);
    const unit = optString(body.unit, 'หน่วย', 40) || 'กก./ชุด';
    const status = body.status === undefined ? 'sale' : reqEnum(body.status, 'status', PRODUCT_STATUSES);
    const description =
      optString(body.description, 'รายละเอียด', 2000) || `แอดมิน ${actor.name} ลงข้อมูลให้ตามคำขอของสมาชิก`;

    let images: string[] = [];
    if (body.images !== undefined) {
      if (!Array.isArray(body.images) || body.images.length > 6) {
        throw new ValidationError('images: ต้องเป็นรายการรูปไม่เกิน 6 รูป');
      }
      images = body.images.map((img: unknown, i: number) => reqImage(img, `images[${i}]`, 400_000));
    }

    const memberSnap = await db.collection('members').doc(memberId).get();
    if (!memberSnap.exists) throw new NotFoundError('ไม่พบข้อมูลสมาชิก');
    const member = memberSnap.data() as Record<string, any>;
    if (member.status !== 'approved') throw new ValidationError('สมาชิกยังไม่ได้รับการอนุมัติ');

    if (!member.farmId) throw new ValidationError('สมาชิกยังไม่มีแปลง');
    const farmSnap = await db.collection('farms').doc(member.farmId).get();
    if (!farmSnap.exists) throw new NotFoundError('ไม่พบข้อมูลแปลงของสมาชิก');
    const farm = farmSnap.data() as Record<string, any>;

    const catFound = await loadTaxonomyItem(db, 'categories', skuTagId);
    if (!catFound) throw new NotFoundError('ไม่พบชนิดผลผลิต (SKU) ที่เลือก');
    const cat = catFound.data;

    const ownerUid = farm.ownerUid || member.ownerUid;
    if (!ownerUid) throw new ValidationError('ไม่พบเจ้าของแปลง (ownerUid) ไม่สามารถผูกผลผลิตได้');

    const productId = newId('prod');
    const product: Record<string, any> = {
      id: productId,
      ownerUid,
      farmId: farmSnap.id,
      farmName: farm.farmName || '',
      district: farm.district || '',
      subdistrict: farm.subdistrict || '',
      title,
      skuTagId,
      skuTagName: cat.name || '',
      category: cat.category,
      categoryName: productCategoryName(cat.category),
      status,
      price,
      unit,
      description,
      images,
      isPublicPhone: !!farm.isPublicPhone,
      isPublicLine: !!farm.isPublicLine,
      updatedAt: new Date().toISOString().split('T')[0],
      createdByAdmin: true,
    };
    if (farm.isPublicPhone && farm.phone) product.phone = farm.phone;
    if (farm.isPublicLine && farm.lineId) product.lineId = farm.lineId;

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'assist_create_product',
      targetMemberId: memberSnap.id,
      targetMemberName: member.fullName,
      targetFarmName: farm.farmName,
      details: `แอดมิน ${actor.name} ช่วยลงข้อมูลผลผลิต "${title}" ให้กับแปลง ${farm.farmName || '-'} ตามคำขอ`,
      metadata: { productId },
    });

    const batch = db.batch();
    batch.set(db.collection('products').doc(productId), product);
    batch.update(db.collection('members').doc(memberSnap.id), { delegationStatus: 'completed' });
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { product, auditLogId: audit.id };
  });
}
