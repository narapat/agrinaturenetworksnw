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
import { PRACTICE_CATEGORIES, practiceCategoryName } from '@/lib/taxonomy';
import { isBuiltIn, listTaxonomy, loadTaxonomyItem } from '@/lib/taxonomyDefaults';

export const dynamic = 'force-dynamic';

type Params = { params: { practiceId: string } };

/**
 * PATCH /api/admin/practices/{practiceId}
 * { name?, category?, icon?, description?, isActive? }
 * ถ้าเปลี่ยนชื่อ จะเปลี่ยนชื่อในแปลงทั้งหมดที่ใช้วิถีนี้ (farms.practices) ใน batch เดียวกัน
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, {}, async ({ db, actor }) => {
    const practiceId = safeId(params.practiceId, 'practiceId');
    const body = await readJsonBody(req);

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = reqString(body.name, 'ชื่อวิถี/ศาสตร์', 1, 80);
    if (body.category !== undefined) {
      updates.category = reqEnum(body.category, 'category', PRACTICE_CATEGORIES);
      updates.categoryName = practiceCategoryName(updates.category);
    }
    if (body.icon !== undefined) updates.icon = optString(body.icon, 'icon', 16) || '🌱';
    if (body.description !== undefined) updates.description = optString(body.description, 'คำอธิบาย', 300) || '';
    if (body.isActive !== undefined) updates.isActive = reqBool(body.isActive, 'isActive');
    if (Object.keys(updates).length === 0) throw new ValidationError('ไม่มีข้อมูลที่ต้องแก้ไข');
    updates.updatedAt = new Date().toISOString().split('T')[0];

    const found = await loadTaxonomyItem(db, 'practices', practiceId);
    if (!found) throw new NotFoundError('ไม่พบวิถี/ศาสตร์นี้');
    // ชื่ออาจว่าง (เอกสารเสีย) — ถ้าว่างแปลว่าไม่มีแปลงใดอ้างอิงได้ ห้ามนำไปค้นใน Firestore (undefined ใช้เป็นเงื่อนไขไม่ได้)
    const oldName: string = typeof found.data.name === 'string' ? found.data.name : '';
    const merged: Record<string, any> = { ...found.data, ...updates, id: practiceId };

    const renamed = updates.name !== undefined && updates.name !== oldName;
    if (!merged.name) throw new ValidationError('กรุณาตั้งชื่อวิถี/ศาสตร์');
    if (renamed) {
      const all = await listTaxonomy(db, 'practices');
      if (all.some((p) => p.id !== practiceId && p.name === updates.name)) {
        throw new ValidationError(`มีวิถี/ศาสตร์ชื่อ "${updates.name}" อยู่แล้ว`);
      }
    }

    const farms = renamed && oldName
      ? (await db.collection('farms').where('practices', 'array-contains', oldName).get()).docs
      : [];
    if (farms.length + 2 > MAX_BATCH_OPS) {
      throw new ValidationError(`มีแปลงที่ต้องซิงค์มากเกินไป (${farms.length} แปลง)`);
    }

    const toggleOnly = Object.keys(updates).length === 2 && updates.isActive !== undefined;
    const audit = buildAdminAuditDoc(req, actor, {
      action: 'update_practice',
      details: toggleOnly
        ? `${updates.isActive ? 'เปิด' : 'ปิด'}ให้เลือกวิถี/ศาสตร์ "${oldName}"`
        : `แก้ไขวิถี/ศาสตร์: "${oldName}"${renamed ? ` -> "${updates.name}" (ซิงค์ ${farms.length} แปลง)` : ''}`,
      metadata: { practiceId, changed: Object.keys(updates), farmIds: farms.map((f) => f.id) },
    });

    const ref = db.collection('practices').doc(practiceId);
    const batch = db.batch();
    // เอกสารยังไม่มี หรือมีแต่ไม่สมบูรณ์ → เขียนทั้งเอกสารเพื่อซ่อม
    if (found.persisted && !found.incomplete) batch.update(ref, updates);
    else batch.set(ref, merged);
    for (const f of farms) {
      const list: string[] = Array.isArray(f.data().practices) ? f.data().practices : [];
      batch.update(f.ref as any, {
        practices: Array.from(new Set(list.map((p) => (p === oldName ? updates.name : p)))),
      });
    }
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { practice: merged, updatedFarmCount: farms.length, auditLogId: audit.id };
  });
}

/**
 * DELETE /api/admin/practices/{practiceId}?targetId={otherPracticeId}
 * ลบวิถี/ศาสตร์ (ต้องเข้าด้วย LINE เท่านั้น)
 * แปลงที่ใช้วิถีนี้: ถ้าระบุ targetId จะเปลี่ยนเป็นวิถีปลายทาง ไม่ระบุจะนำออกจากแปลง
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  return runAdminRoute(req, { requireLine: true }, async ({ db, actor }) => {
    const practiceId = safeId(params.practiceId, 'practiceId');
    const targetParam = new URL(req.url).searchParams.get('targetId');
    const targetId = targetParam ? safeId(targetParam, 'targetId') : null;
    if (targetId === practiceId) throw new ValidationError('ปลายทางต้องไม่ใช่วิถีเดียวกับที่ลบ');

    const found = await loadTaxonomyItem(db, 'practices', practiceId);
    if (!found) throw new NotFoundError('ไม่พบวิถี/ศาสตร์นี้');
    const deletedName: string = typeof found.data.name === 'string' ? found.data.name : '';

    let targetName: string | null = null;
    if (targetId) {
      const t = await loadTaxonomyItem(db, 'practices', targetId);
      if (!t) throw new NotFoundError('ไม่พบวิถี/ศาสตร์ปลายทาง');
      targetName = t.data.name;
    }

    const farms = deletedName
      ? (await db.collection('farms').where('practices', 'array-contains', deletedName).get()).docs
      : [];
    if (farms.length + 2 > MAX_BATCH_OPS) {
      throw new ValidationError(`มีแปลงที่ต้องซิงค์มากเกินไป (${farms.length} แปลง)`);
    }

    const audit = buildAdminAuditDoc(req, actor, {
      action: 'delete_practice',
      details: targetName
        ? `ลบศาสตร์ "${deletedName}" และโยกย้าย ${farms.length} แปลงไปยัง "${targetName}"`
        : `ลบศาสตร์ "${deletedName || `(ไม่มีชื่อ: ${practiceId})`}" ออกจากระบบ (${farms.length} แปลงได้รับผลกระทบ)`,
      metadata: { practiceId, targetId, farmIds: farms.map((f) => f.id) },
    });

    const batch = db.batch();
    for (const f of farms) {
      const list: string[] = Array.isArray(f.data().practices) ? f.data().practices : [];
      const next = targetName
        ? Array.from(new Set(list.map((p) => (p === deletedName ? targetName! : p))))
        : list.filter((p) => p !== deletedName);
      batch.update(f.ref as any, { practices: next });
    }
    // รายการมาตรฐาน: เขียนป้ายลบไว้ ไม่อย่างนั้นค่าเริ่มต้นจะถูกเติมกลับมาเอง
    if (isBuiltIn('practices', practiceId)) batch.set(db.collection('practices').doc(practiceId), { id: practiceId, deleted: true, deletedAt: new Date().toISOString() });
    else batch.delete(db.collection('practices').doc(practiceId));
    batch.set(db.collection('auditLogs').doc(audit.id), audit);
    await batch.commit();

    return { deletedName, reassignedCount: farms.length, targetId, auditLogId: audit.id };
  });
}
