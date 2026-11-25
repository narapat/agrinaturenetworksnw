#!/usr/bin/env node

/**
 * ผูกบัญชี LINE ให้สมาชิกเก่าที่ยังไม่เคยผูก (ไม่มีทั้ง ownerUid และ lineUserId)
 *
 * ระบบจับคู่สมาชิกด้วย LINE User ID ที่ LINE ยืนยันแล้วเท่านั้น (ไม่จับคู่จากชื่อ)
 * สมาชิกเก่าที่ไม่เคยผูกจึงต้องให้แอดมินผูกให้ครั้งเดียวด้วยสคริปต์นี้
 *
 * ขั้นตอน:
 * 1. ให้สมาชิกคนนั้นเปิดเว็บแล้วกด "เข้าสู่ระบบด้วย LINE" หนึ่งครั้ง (จะเห็นว่ายังไม่ได้เป็นสมาชิก ไม่เป็นไร)
 *    — ห้ามกดสมัครสมาชิกใหม่
 * 2. ดูรายการ (ไม่เขียนอะไร):
 *      node --env-file=<env> scripts/link-member-line.mjs
 *    จะเห็น: สมาชิกที่ยังไม่ผูก + บัญชี LINE ที่เพิ่งล็อกอินแต่ยังไม่ได้เป็นสมาชิก (เรียงตามเวลาล็อกอินล่าสุด)
 *    เลือกบัญชี LINE ที่ล็อกอินตรงกับเวลาที่สมาชิกกด (ถามเขาเพื่อยืนยัน)
 * 3. ตรวจแผน (ไม่เขียนอะไร):
 *      node --env-file=<env> scripts/link-member-line.mjs --member <memberId> --line <LINE User ID>
 * 4. ผูกจริง:
 *      node --env-file=<env> scripts/link-member-line.mjs --member <memberId> --line <LINE User ID> --apply
 *
 * สิ่งที่เขียน (ใน batch เดียว): members/{id} และ private/pii, แปลงของสมาชิก และ private/contact,
 * ผลผลิตของแปลงเหล่านั้น (ownerUid), registrations/{LINE User ID} (กันสมัครซ้ำ) และ audit log
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const argValue = (name) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1].trim() : '';
};
const memberId = argValue('--member');
const lineUserId = argValue('--line');

// ---------- เชื่อมต่อ Firebase ----------
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
  console.error('❌ ต้องมี FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL และ FIREBASE_PRIVATE_KEY');
  process.exit(1);
}
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();
const auth = getAuth();

const fmt = (iso) => (iso ? new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-');

const membersSnap = await db.collection('members').get();
const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const linkedUids = new Set(members.flatMap((m) => [m.ownerUid, m.lineUserId]).filter(Boolean));

// ---------- โหมดดูรายการ ----------
if (!memberId && !lineUserId) {
  const unlinked = members.filter((m) => !m.ownerUid && !m.lineUserId);
  console.log(`\n👤 สมาชิกที่ยังไม่ผูก LINE: ${unlinked.length} คน`);
  for (const m of unlinked) {
    console.log(`   ${m.id}  ${m.fullName || '-'}  สถานะ=${m.status || '-'}  แปลง=${m.farmId || '-'}`);
  }

  // บัญชี LINE ที่เคยล็อกอินเว็บ (Firebase Auth uid = LINE User ID) แต่ยังไม่ได้เป็นสมาชิกคนไหน
  const candidates = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (!u.uid.startsWith('U') || linkedUids.has(u.uid)) continue;
      candidates.push({ uid: u.uid, last: u.metadata.lastSignInTime, created: u.metadata.creationTime });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  candidates.sort((a, b) => new Date(b.last || 0) - new Date(a.last || 0));

  console.log(`\n🔑 บัญชี LINE ที่ล็อกอินเว็บแล้วแต่ยังไม่ได้เป็นสมาชิก (ล่าสุดก่อน, แสดง 15 รายการ):`);
  if (!candidates.length) console.log('   (ไม่มี — ให้สมาชิกกด "เข้าสู่ระบบด้วย LINE" บนเว็บหนึ่งครั้งก่อน)');
  for (const c of candidates.slice(0, 15)) {
    const reg = await db.collection('registrations').doc(c.uid).get();
    console.log(`   ${c.uid}  ล็อกอินล่าสุด ${fmt(c.last)}${reg.exists ? '  ⚠️ มีใบสมัครค้างอยู่' : ''}`);
  }
  console.log('\nขั้นต่อไป: node --env-file=<env> scripts/link-member-line.mjs --member <memberId> --line <LINE User ID>\n');
  process.exit(0);
}

// ---------- โหมดผูก ----------
if (!memberId || !lineUserId) {
  console.error('❌ ต้องระบุทั้ง --member <memberId> และ --line <LINE User ID>');
  process.exit(1);
}
if (!/^U[0-9a-f]{32}$/i.test(lineUserId)) {
  console.error(`❌ LINE User ID ไม่ถูกรูปแบบ (ต้องเป็น U ตามด้วยเลขฐานสิบหก 32 ตัว): ${lineUserId}`);
  process.exit(1);
}

const member = members.find((m) => m.id === memberId);
if (!member) {
  console.error(`❌ ไม่พบสมาชิก ${memberId}`);
  process.exit(1);
}
if (member.ownerUid || member.lineUserId) {
  console.error(`❌ สมาชิก ${memberId} ผูก LINE แล้ว (ownerUid=${member.ownerUid || '-'}, lineUserId=${member.lineUserId || '-'}) — สคริปต์นี้ไม่เขียนทับ`);
  process.exit(1);
}
const other = members.find((m) => m.id !== memberId && (m.ownerUid === lineUserId || m.lineUserId === lineUserId));
if (other) {
  console.error(`❌ บัญชี LINE นี้ผูกกับสมาชิกอื่นอยู่แล้ว: ${other.id} (${other.fullName || '-'})`);
  console.error('   ถ้าเขาเผลอสมัครใหม่ ให้ลบใบสมัครใหม่นั้นในหน้าแอดมินก่อน แล้วค่อยรันอีกครั้ง');
  process.exit(1);
}
const regRef = db.collection('registrations').doc(lineUserId);
const regSnap = await regRef.get();
if (regSnap.exists) {
  console.error(`❌ มีใบสมัครของบัญชี LINE นี้ค้างอยู่ (registrations/${lineUserId} → member ${regSnap.data()?.memberId || '-'})`);
  console.error('   ให้ลบใบสมัครนั้นในหน้าแอดมินก่อน แล้วค่อยรันอีกครั้ง');
  process.exit(1);
}
let authUser = null;
try {
  authUser = await auth.getUser(lineUserId);
} catch {}

// แปลงของสมาชิก: จาก memberId และ farmId ที่บันทึกไว้
const farmIds = new Set();
for (const d of (await db.collection('farms').where('memberId', '==', memberId).get()).docs) farmIds.add(d.id);
if (member.farmId) farmIds.add(member.farmId);
const farms = [];
for (const id of farmIds) {
  const snap = await db.collection('farms').doc(id).get();
  if (!snap.exists) continue;
  const f = snap.data();
  if (f.ownerUid && f.ownerUid !== lineUserId) {
    console.error(`❌ แปลง ${id} มีเจ้าของ LINE คนอื่นอยู่แล้ว (${f.ownerUid}) — หยุดเพื่อความปลอดภัย`);
    process.exit(1);
  }
  farms.push({ id, ref: snap.ref, name: f.farmName || '-' });
}
const products = [];
for (const f of farms) {
  for (const d of (await db.collection('products').where('farmId', '==', f.id).get()).docs) {
    const p = d.data();
    if (p.ownerUid && p.ownerUid !== lineUserId) {
      console.error(`❌ ผลผลิต ${d.id} มีเจ้าของ LINE คนอื่นอยู่แล้ว (${p.ownerUid}) — หยุดเพื่อความปลอดภัย`);
      process.exit(1);
    }
    products.push({ id: d.id, ref: d.ref, title: p.title || '-' });
  }
}

console.log('='.repeat(72));
console.log(`🔗 ผูกบัญชี LINE — โหมด: ${apply ? 'เขียนจริง (--apply)' : 'ตรวจอย่างเดียว (dry-run)'}`);
console.log(`   project: ${projectId}`);
console.log('='.repeat(72));
console.log(`สมาชิก : ${member.id}  ${member.fullName || '-'}  (สถานะ ${member.status || '-'})`);
console.log(`LINE   : ${lineUserId}  ${authUser ? `ล็อกอินเว็บล่าสุด ${fmt(authUser.metadata.lastSignInTime)}` : '⚠️ ยังไม่เคยล็อกอินเว็บ (ตรวจ ID ให้แน่ใจ)'}`);
console.log(`แปลง   : ${farms.length ? farms.map((f) => `${f.id} (${f.name})`).join(', ') : '-'}`);
console.log(`ผลผลิต : ${products.length} รายการ`);

if (!apply) {
  console.log('\nยังไม่ได้เขียนอะไร ถ้าถูกต้อง รันคำสั่งเดิมต่อท้ายด้วย --apply\n');
  process.exit(0);
}

const nowIso = new Date().toISOString();
const batch = db.batch();
const memberRef = db.collection('members').doc(memberId);
batch.update(memberRef, { ownerUid: lineUserId, lineUserId, updatedAt: nowIso });
batch.set(memberRef.collection('private').doc('pii'), { ownerUid: lineUserId, lineUserId, updatedAt: nowIso }, { merge: true });
for (const f of farms) {
  batch.update(f.ref, { ownerUid: lineUserId, updatedAt: nowIso });
  batch.set(f.ref.collection('private').doc('contact'), { ownerUid: lineUserId, updatedAt: nowIso }, { merge: true });
}
for (const p of products) batch.update(p.ref, { ownerUid: lineUserId });
batch.create(regRef, {
  ownerUid: lineUserId,
  memberId,
  farmId: member.farmId || farms[0]?.id || '',
  status: member.status || 'approved',
  createdAt: nowIso,
  updatedAt: nowIso,
  linkedByAdminScript: true,
});
const logId = `log-${Date.now()}-link`;
batch.set(db.collection('auditLogs').doc(logId), {
  id: logId,
  action: 'admin_link_line_account',
  timestamp: nowIso,
  actorRole: 'admin',
  actorName: 'สคริปต์ผูกบัญชี LINE',
  authMethod: 'admin_script',
  details: `ผูกบัญชี LINE ให้สมาชิก ${member.fullName || memberId} (แปลง ${farms.length}, ผลผลิต ${products.length})`,
  metadata: { memberId, lineUserId, farmIds: farms.map((f) => f.id), productIds: products.map((p) => p.id) },
  performedByAdminId: 'script',
  performedByAdminName: 'สคริปต์ผูกบัญชี LINE',
  targetMemberId: memberId,
  targetMemberName: member.fullName || '-',
  targetFarmName: farms[0]?.name || '-',
});
await batch.commit();
console.log(`\n✅ ผูกเรียบร้อย ให้สมาชิกออกจากระบบแล้วเข้าสู่ระบบด้วย LINE ใหม่อีกครั้ง (บันทึกแล้ว: ${logId})\n`);
