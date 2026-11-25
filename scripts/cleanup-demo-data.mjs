#!/usr/bin/env node

/**
 * ล้างข้อมูลตัวอย่าง (mockData) ที่เคยถูกเขียนลง Firestore
 *
 * โค้ดฝั่งเบราว์เซอร์รุ่นเก่าเขียนผลผลิต/แปลง/ข่าวตัวอย่างลง Firestore เอง ทำให้ข้อมูลตัวอย่างโผล่ในหน้าจริง
 * แม้ล้างแคชในเครื่องแล้วก็ตาม — สคริปต์นี้หาและลบเอกสารเหล่านั้น (id ตรงกับ src/data/mockData.ts)
 * และรายงานผลผลิตกำพร้า (แปลงไม่มีแล้ว) ให้ตรวจเองก่อน — ไม่ลบผลผลิตกำพร้าอัตโนมัติ
 *
 * วิธีรัน:
 * - ตรวจอย่างเดียว (ค่าเริ่มต้น ไม่เขียนอะไร):
 *   node --env-file=.env.local scripts/cleanup-demo-data.mjs
 * - ลบจริง:
 *   node --env-file=.env.local scripts/cleanup-demo-data.mjs --apply
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const apply = process.argv.includes('--apply') || process.argv.includes('--commit');

// ---------- รายการ id ตัวอย่าง: อ่านจาก mockData.ts โดยตรง (ไม่ต้องดูแลสองที่) ----------
const here = path.dirname(fileURLToPath(import.meta.url));
const mockSource = readFileSync(path.join(here, '..', 'src', 'data', 'mockData.ts'), 'utf8');

function idsOf(exportName) {
  const start = mockSource.indexOf(`export const ${exportName}`);
  if (start === -1) throw new Error(`ไม่พบ ${exportName} ใน mockData.ts`);
  const next = mockSource.indexOf('export const ', start + 1);
  const block = mockSource.slice(start, next === -1 ? undefined : next);
  // เอาเฉพาะ id ระดับบนสุดของแต่ละรายการ (บรรทัดที่ขึ้นต้นด้วย "    id: '...'")
  return [...block.matchAll(/^\s{2,4}id:\s*'([^']+)'/gm)].map((m) => m[1]);
}

export const DEMO = {
  members: idsOf('INITIAL_MEMBERS'),
  farms: idsOf('INITIAL_FARMS'),
  products: idsOf('INITIAL_PRODUCTS'),
  news: idsOf('INITIAL_NEWS'),
  auditLogs: idsOf('INITIAL_AUDIT_LOGS'),
};

// ---------- เชื่อมต่อ Firestore ----------
function formatKey(key) {
  if (!key) return undefined;
  let k = key.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  return k.replace(/\\n/g, '\n').trim();
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = formatKey(process.env.FIREBASE_PRIVATE_KEY);

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ ต้องมี FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL และ FIREBASE_PRIVATE_KEY (รันด้วย --env-file=.env.local)');
  process.exit(1);
}

if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

console.log('='.repeat(72));
console.log(`🧹 ล้างข้อมูลตัวอย่างใน Firestore — โหมด: ${apply ? 'ลบจริง (--apply)' : 'ตรวจอย่างเดียว (dry-run)'}`);
console.log(`   project: ${projectId}`);
console.log('='.repeat(72));

// ---------- 1. เอกสารตัวอย่าง ----------
const toDelete = [];
for (const [col, ids] of Object.entries(DEMO)) {
  for (const id of ids) {
    const ref = db.collection(col).doc(id);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const d = snap.data() || {};
    toDelete.push({ ref, label: `${col}/${id}`, name: d.fullName || d.farmName || d.title || d.details || '' });
    // ข้อมูลส่วนตัวใน subcollection ของสมาชิก/แปลงตัวอย่าง
    if (col === 'members' || col === 'farms') {
      for (const sub of await ref.collection('private').listDocuments()) {
        toDelete.push({ ref: sub, label: `${col}/${id}/private/${sub.id}`, name: '' });
      }
    }
  }
}

console.log(`\n1) เอกสารตัวอย่างที่พบ: ${toDelete.length} รายการ`);
toDelete.forEach((x) => console.log(`   - ${x.label}${x.name ? `  (${String(x.name).slice(0, 50)})` : ''}`));

// ---------- 2. ผลผลิตกำพร้า (รายงานอย่างเดียว) ----------
const farmIds = new Set((await db.collection('farms').get()).docs.map((d) => d.id));
const demoFarmIds = new Set(DEMO.farms);
const orphans = (await db.collection('products').get()).docs.filter((d) => {
  if (DEMO.products.includes(d.id)) return false;
  const farmId = d.data().farmId;
  return farmId && (!farmIds.has(farmId) || demoFarmIds.has(farmId));
});
console.log(`\n2) ผลผลิตที่แปลงไม่มีอยู่แล้ว (ไม่ลบอัตโนมัติ — ตรวจเองในหน้า /admin/products): ${orphans.length} รายการ`);
orphans.forEach((d) => console.log(`   - products/${d.id}  farmId=${d.data().farmId}  "${d.data().title || ''}"`));

// ---------- ลบ ----------
if (!apply) {
  console.log('\nℹ️  ยังไม่ได้ลบอะไร — ตรวจรายการด้านบน แล้วรันซ้ำพร้อม --apply เพื่อลบข้อ 1');
  process.exit(0);
}

let deleted = 0;
for (let i = 0; i < toDelete.length; i += 400) {
  const batch = db.batch();
  toDelete.slice(i, i + 400).forEach((x) => batch.delete(x.ref));
  await batch.commit();
  deleted += Math.min(400, toDelete.length - i);
}
const logId = `log-${Date.now()}-cleanup`;
await db.collection('auditLogs').doc(logId).set({
  id: logId,
  action: 'cleanup_demo_data',
  timestamp: new Date().toISOString(),
  actorRole: 'admin',
  actorName: 'สคริปต์ล้างข้อมูลตัวอย่าง',
  authMethod: 'admin_script',
  details: `ลบข้อมูลตัวอย่างออกจาก Firestore ${deleted} เอกสาร`,
  metadata: { deleted: toDelete.map((x) => x.label) },
  performedByAdminId: 'script',
  performedByAdminName: 'สคริปต์ล้างข้อมูลตัวอย่าง',
  targetMemberId: '-',
  targetMemberName: '-',
  targetFarmName: '-',
});
console.log(`\n✅ ลบแล้ว ${deleted} เอกสาร และบันทึกในประวัติการทำงาน (${logId})`);
