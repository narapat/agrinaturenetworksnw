import { NextRequest } from 'next/server';
import { runAdminRoute } from '@/lib/adminRoute';
import { mergeWithDefaults } from '@/lib/taxonomyDefaults';

export const dynamic = 'force-dynamic';

const AUDIT_LOG_LIMIT = 300;

const PII_FIELDS = ['phone', 'lineId', 'facePhotoUrl', 'trainingCourse', 'trainingLocation'] as const;
const CONTACT_FIELDS = ['phone', 'lineId', 'internalCoordinates'] as const;

function timeOf(log: Record<string, any>): number {
  const t = Date.parse(log?.timestamp);
  if (!Number.isNaN(t)) return t;
  // log รุ่นเก่า id = log-<epoch ms>-...
  const m = /^log-(\d{12,})/.exec(String(log?.id || ''));
  return m ? Number(m[1]) : 0;
}

/**
 * GET /api/admin/snapshot
 * ข้อมูลทั้งหมดที่หน้าแอดมินต้องใช้ อ่านผ่าน Admin SDK
 * ทำให้แอดมินที่เข้าด้วยรหัสผ่านสำรอง (ไม่มี Firebase custom claim) ใช้งานได้
 *
 * - PII (members/{id}/private/pii) และข้อมูลติดต่อแปลง (farms/{id}/private/contact)
 *   แนบเฉพาะรายการที่ยังไม่อนุมัติ (pending / rejected) เพื่อใช้พิจารณาใบสมัคร
 * - Audit log ล่าสุด AUDIT_LOG_LIMIT รายการ
 */
export async function GET(req: NextRequest) {
  return runAdminRoute(req, {}, async ({ db }) => {
    const [membersSnap, farmsSnap, productsSnap, categoriesSnap, practicesSnap, newsSnap, logsSnap] =
      await Promise.all([
        db.collection('members').get(),
        db.collection('farms').get(),
        db.collection('products').get(),
        db.collection('categories').get(),
        db.collection('practices').get(),
        db.collection('news').get(),
        db.collection('auditLogs').get(),
      ]);

    const members = await Promise.all(
      membersSnap.docs.map(async (d) => {
        const m: Record<string, any> = { ...d.data(), id: d.id };
        if (m.status === 'pending' || m.status === 'rejected') {
          const pii = await db.collection('members').doc(d.id).collection('private').doc('pii').get();
          if (pii.exists) {
            const p = pii.data() || {};
            for (const f of PII_FIELDS) if (p[f] !== undefined && p[f] !== '') m[f] = p[f];
          }
        }
        return m;
      })
    );

    const farms = await Promise.all(
      farmsSnap.docs.map(async (d) => {
        const f: Record<string, any> = { ...d.data(), id: d.id };
        if (f.status === 'pending' || f.status === 'rejected') {
          const contact = await db.collection('farms').doc(d.id).collection('private').doc('contact').get();
          if (contact.exists) {
            const c = contact.data() || {};
            for (const k of CONTACT_FIELDS) if (c[k] !== undefined && c[k] !== '') f[k] = c[k];
          }
        }
        return f;
      })
    );

    const auditLogs = logsSnap.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .sort((a, b) => timeOf(b) - timeOf(a))
      .slice(0, AUDIT_LOG_LIMIT);

    return {
      members,
      farms,
      products: productsSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
      categories: mergeWithDefaults('categories', categoriesSnap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      practices: mergeWithDefaults('practices', practicesSnap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      news: newsSnap.docs.map((d) => ({ ...d.data(), id: d.id })),
      auditLogs,
      fetchedAt: new Date().toISOString(),
    };
  });
}
