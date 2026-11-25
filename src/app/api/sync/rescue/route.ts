import { NextRequest, NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { resolveLineUser } from '@/lib/lineIdToken';
import { ValidationError, optString, reqEnum, reqImage, reqNumber, reqString, safeId } from '@/lib/adminRoute';
import { PRODUCT_STATUSES, productCategoryName } from '@/lib/taxonomy';
import { loadTaxonomyItem } from '@/lib/taxonomyDefaults';
import { isDemoId } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';

const MAX_ITEMS = 50;

export type RescueStatus = 'created' | 'exists' | 'deleted' | 'rejected' | 'error';

export interface RescueResult {
  id: string;
  status: RescueStatus;
  reason?: string;
  product?: Record<string, any>;
}

/**
 * ผลผลิตนี้เคยถูกลบไปแล้วหรือไม่ (ดูจากประวัติการทำงาน)
 * - แอดมินลบผลผลิต (admin_delete_product → metadata.productId)
 * - แอดมินลบสมาชิกพร้อมผลผลิต (delete_member → metadata.productIds)
 * - เจ้าของลบเอง (delete_product → metadata.productId) — นับเฉพาะ log ที่ server ยืนยันว่าเป็นเจ้าของคนนี้จริง
 */
async function wasDeleted(db: Firestore, productId: string, ownerUid: string): Promise<boolean> {
  const logs = db.collection('auditLogs');
  const [single, bulk] = await Promise.all([
    logs.where('metadata.productId', '==', productId).get(),
    logs.where('metadata.productIds', 'array-contains', productId).get(),
  ]);
  if (!bulk.empty) return true;
  return single.docs.some((d) => {
    const log = d.data() as Record<string, any>;
    if (log.action === 'admin_delete_product') return true;
    return log.action === 'delete_product' && log.actorUid === ownerUid;
  });
}

async function rescueOne(db: Firestore, ownerUid: string, raw: Record<string, any>): Promise<RescueResult> {
  const id = typeof raw?.id === 'string' ? raw.id : '';
  if (!/^prod-[A-Za-z0-9_-]{1,80}$/.test(id) || isDemoId('products', id)) {
    return { id, status: 'rejected', reason: 'รหัสผลผลิตไม่ถูกต้อง' };
  }
  if (raw.ownerUid && raw.ownerUid !== ownerUid) {
    return { id, status: 'rejected', reason: 'ไม่ใช่ผลผลิตของบัญชีนี้' };
  }

  const ref = db.collection('products').doc(id);
  if ((await ref.get()).exists) return { id, status: 'exists' };
  if (await wasDeleted(db, id, ownerUid)) return { id, status: 'deleted' };

  let farmId: string;
  try {
    farmId = safeId(raw.farmId, 'farmId');
  } catch {
    return { id, status: 'rejected', reason: 'ไม่พบแปลงของผลผลิต' };
  }
  const farmSnap = await db.collection('farms').doc(farmId).get();
  if (!farmSnap.exists) return { id, status: 'rejected', reason: 'แปลงของผลผลิตนี้ไม่มีในระบบแล้ว' };
  const farm = farmSnap.data() as Record<string, any>;
  if (farm.ownerUid !== ownerUid) return { id, status: 'rejected', reason: 'ไม่ใช่แปลงของบัญชีนี้' };

  try {
    const skuTagId = safeId(raw.skuTagId, 'skuTagId');
    const sku = await loadTaxonomyItem(db, 'categories', skuTagId);
    if (!sku) return { id, status: 'rejected', reason: 'ไม่พบชนิดผลผลิต (SKU)' };

    let images: string[] = [];
    if (raw.images !== undefined) {
      if (!Array.isArray(raw.images) || raw.images.length > 6) throw new ValidationError('images: ไม่เกิน 6 รูป');
      images = raw.images.map((img: unknown, i: number) => reqImage(img, `images[${i}]`, 400_000));
    }

    const product: Record<string, any> = {
      id,
      ownerUid,
      farmId,
      farmName: farm.farmName || '',
      district: farm.district || '',
      subdistrict: farm.subdistrict || '',
      title: reqString(raw.title, 'ชื่อผลผลิต', 2, 150),
      skuTagId,
      skuTagName: sku.data.name,
      category: sku.data.category,
      categoryName: productCategoryName(sku.data.category),
      status: raw.status === undefined ? 'sale' : reqEnum(raw.status, 'status', PRODUCT_STATUSES),
      price: reqNumber(raw.price ?? 0, 'ราคา', 0, 1_000_000),
      unit: optString(raw.unit, 'หน่วย', 40) || 'หน่วย',
      description: optString(raw.description, 'รายละเอียด', 2000) || '',
      images,
      isPublicPhone: !!farm.isPublicPhone,
      isPublicLine: !!farm.isPublicLine,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt.slice(0, 10) : new Date().toISOString().split('T')[0],
    };
    if (farm.isPublicPhone && farm.phone) product.phone = farm.phone;
    if (farm.isPublicLine && farm.lineId) product.lineId = farm.lineId;

    const now = new Date();
    const logId = `log-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
    const batch = db.batch();
    batch.set(ref, product);
    batch.set(db.collection('auditLogs').doc(logId), {
      id: logId,
      action: 'sync_rescue_product',
      timestamp: now.toISOString(),
      actorRole: 'member',
      actorUid: ownerUid,
      authMethod: 'line_id_token',
      actorName: farm.ownerName || farm.farmName || 'สมาชิก',
      details: `ส่งผลผลิต "${product.title}" ที่บันทึกค้างไว้ในเครื่องขึ้นระบบ (แปลง ${product.farmName})`,
      targetId: farm.memberId || null,
      metadata: { productId: id, farmId },
      performedByAdminId: farm.memberId || ownerUid,
      performedByAdminName: farm.ownerName || 'สมาชิก',
      targetMemberId: farm.memberId || '-',
      targetMemberName: farm.ownerName || '-',
      targetFarmName: product.farmName || '-',
    });
    await batch.commit();
    return { id, status: 'created', product };
  } catch (err: any) {
    if (err instanceof ValidationError) return { id, status: 'rejected', reason: err.message };
    console.error('[sync/rescue] failed for', id, err);
    return { id, status: 'error', reason: 'บันทึกไม่สำเร็จ กรุณาลองใหม่ภายหลัง' };
  }
}

/**
 * POST /api/sync/rescue
 * ส่งผลผลิตที่ค้างอยู่ในคิวบนเครื่องผู้ใช้ขึ้นระบบ — ตรวจทุกรายการก่อนสร้าง:
 * ต้องเป็นเจ้าของ (LINE ID Token), ยังไม่มีในระบบ, ไม่เคยถูกลบ, และแปลงยังอยู่และเป็นของผู้ใช้คนนี้
 *
 * body: { products: Product[] }
 * ผลลัพธ์ต่อรายการ: created | exists | deleted | rejected (ทิ้งจากคิวได้) | error (เก็บไว้ลองใหม่)
 */
export async function POST(req: NextRequest) {
  const verified = await resolveLineUser(req);
  if (!verified.ok) {
    const message = verified.status === 401 && !req.headers.get('authorization') ? 'ต้องเข้าสู่ระบบด้วย LINE' : verified.reason;
    return NextResponse.json({ success: false, message }, { status: verified.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { success: false, message: 'Server configuration error: ฐานข้อมูลฝั่งเซิร์ฟเวอร์ไม่พร้อมใช้งาน' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const products = body?.products;
  if (!Array.isArray(products) || products.length === 0 || products.length > MAX_ITEMS) {
    return NextResponse.json(
      { success: false, message: `products: ต้องเป็นรายการ 1–${MAX_ITEMS} รายการ` },
      { status: 400 }
    );
  }

  const results: RescueResult[] = [];
  for (const p of products) {
    try {
      results.push(await rescueOne(db, verified.sub, p));
    } catch (err) {
      console.error('[sync/rescue] unexpected error:', err);
      results.push({ id: typeof p?.id === 'string' ? p.id : '', status: 'error', reason: 'บันทึกไม่สำเร็จ' });
    }
  }
  return NextResponse.json({ success: true, results });
}
