#!/usr/bin/env node

/**
 * สคริปต์ตรวจสอบความสมบูรณ์และย้ายโครงสร้างข้อมูล Firestore สู่ Subcollections (Phase 5 Audit & Migration Script)
 * 
 * คุณสมบัติ:
 * 1. ตรวจสอบความสมบูรณ์ของคอลเลกชัน members และ farms (subcollections, ownerUid, orphan references)
 * 2. ตรวจหาและรายงานใบสมัครซ้ำ (Duplicate Detection) โดยไม่ลบข้อมูลอัตโนมัติ
 * 3. รองรับการย้ายข้อมูล sensitive fields (GPS จริง, เบอร์โทร, LINE ID, รูปหน้า) สู่ subcollections
 *    - farms/{farmId}/private/contact
 *    - members/{memberId}/private/pii
 * 4. พิมพ์เทมเพลตข้อความสุภาพสำหรับส่งแจ้งเตือนผู้สมัครผ่าน LINE Official Account
 * 
 * วิธีรัน:
 * - สแกนและรายงานอย่างเดียว (Dry-run เป็น default ไม่มีการเขียนข้อมูล):
 *   node --env-file=.env.local scripts/migrate-to-subcollections.mjs
 * 
 * - ดำเนินการย้ายข้อมูลจริงลง Firestore:
 *   node --env-file=.env.local scripts/migrate-to-subcollections.mjs --apply
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function formatKey(key) {
  if (!key) return undefined;
  let trimmed = key.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1);
  } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    trimmed = trimmed.slice(1, -1);
  }
  return trimmed.replace(/\\n/g, '\n').trim();
}

const args = process.argv.slice(2);
const isCommit = args.includes('--commit') || args.includes('--apply');
const isDryRun = !isCommit;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'agrinature-network-nsw';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = formatKey(process.env.FIREBASE_PRIVATE_KEY);

console.log('='.repeat(78));
console.log('🚜 Nakhon Sawan Agri-Nature Hub: Firestore Audit & Migration Tool (Phase 5)');
console.log('='.repeat(78));
if (isDryRun) {
  console.log('MODE: 🔍 DRY-RUN / SCAN ONLY (READ-ONLY AUDIT - NO WRITES WILL BE EXECUTED)');
  console.log('To apply safe updates to Firestore subcollections, re-run with:');
  console.log('  node --env-file=.env.local scripts/migrate-to-subcollections.mjs --apply');
} else {
  console.log('MODE: ⚠️ LIVE COMMIT (REAL WRITES WILL BE EXECUTED ON FIRESTORE!)');
}
console.log('='.repeat(78) + '\n');

let db;

if (clientEmail && privateKey) {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
  db = getFirestore(app);
  console.log('✅ Connected to Firestore using Firebase Admin SDK credentials.\n');
} else {
  console.warn('⚠️ No Firebase Admin credentials found in environment.');
  console.warn('   Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local to run audit/migration on live Firestore.');
  process.exit(0);
}

async function auditAndScan() {
  // 1. ดึงข้อมูลทั้งหมด
  console.log('📡 1. Fetching all documents from Firestore...');
  const [membersSnap, farmsSnap, productsSnap] = await Promise.all([
    db.collection('members').get(),
    db.collection('farms').get(),
    db.collection('products').get(),
  ]);

  console.log(`   - Members  : ${membersSnap.size} documents`);
  console.log(`   - Farms    : ${farmsSnap.size} documents`);
  console.log(`   - Products : ${productsSnap.size} documents\n`);

  const farmsById = new Map();
  farmsSnap.docs.forEach((d) => farmsById.set(d.id, { id: d.id, ...d.data() }));

  const membersById = new Map();
  membersSnap.docs.forEach((d) => membersById.set(d.id, { id: d.id, ...d.data() }));

  // ==========================================
  // 2. AUDIT MEMBERS
  // ==========================================
  console.log('--- 👤 2. Auditing Members Collection ---');
  const memberAuditResults = [];
  let memberHealthyCount = 0;
  let memberDamagedCount = 0;
  let memberOrphanCount = 0;

  for (const doc of membersSnap.docs) {
    const data = doc.data();
    const memberId = doc.id;

    // ตรวจสอบ subcollection private/pii
    const piiSnap = await db.collection('members').doc(memberId).collection('private').doc('pii').get();
    const hasPiiSubdoc = piiSnap.exists;
    const piiData = hasPiiSubdoc ? piiSnap.data() : null;

    // ตรวจสอบ ownerUid
    const ownerUid = data.ownerUid || data.lineUserId || piiData?.ownerUid || piiData?.lineUserId || null;
    const hasOwnerUid = !!ownerUid;

    // ตรวจสอบข้อมูลติดต่อและรูป
    const phone = piiData?.phone || data.phone || null;
    const lineId = piiData?.lineId || data.lineId || null;
    const facePhoto = piiData?.facePhotoUrl || data.facePhotoUrl || data.avatarUrl || null;

    // ตรวจสอบความเชื่อมโยงกับแปลง (farmId)
    const farmId = data.farmId || null;
    let farmStatus = 'none'; // 'valid' | 'missing_farm' | 'none'
    if (farmId) {
      if (farmsById.has(farmId) || farmsById.has(farmId.replace(/"/g, ''))) {
        farmStatus = 'valid';
      } else {
        farmStatus = 'orphan'; // ระบุ farmId แต่ไม่มี document ใน farms
        memberOrphanCount++;
      }
    } else {
      // ไม่มี farmId
      memberOrphanCount++;
    }

    const isHealthy = hasPiiSubdoc && hasOwnerUid;
    if (isHealthy) {
      memberHealthyCount++;
    } else {
      memberDamagedCount++;
    }

    memberAuditResults.push({
      id: memberId,
      fullName: data.fullName || 'ไม่ระบุชื่อ',
      status: data.status || 'pending',
      role: data.role || 'member',
      createdAt: data.createdAt || 'ไม่ระบุวันที่',
      ownerUid,
      hasPiiSubdoc,
      hasOwnerUid,
      phone,
      lineId,
      hasFacePhoto: !!facePhoto,
      farmId,
      farmStatus,
      isHealthy,
      raw: data,
      piiData,
    });
  }

  console.log(`   - สมบูรณ์ (มี pii + ownerUid): ${memberHealthyCount}`);
  console.log(`   - เสียหาย/ไม่สมบูรณ์ (ขาด pii หรือ ownerUid): ${memberDamagedCount}`);
  console.log(`   - Orphan (ไม่มีแปลง หรือแปลงไม่ตรง): ${memberOrphanCount}`);
  if (memberDamagedCount > 0) {
    console.log('   ⚠️ รายชื่อสมาชิกที่ไม่สมบูรณ์:');
    memberAuditResults.filter((m) => !m.isHealthy).forEach((m) => {
      console.log(`      • [${m.id}] "${m.fullName}" (สถานะ: ${m.status}, pii: ${m.hasPiiSubdoc ? 'มี' : 'ไม่มี'}, ownerUid: ${m.ownerUid || 'ไม่มี'})`);
    });
  }

  // ==========================================
  // 3. AUDIT FARMS
  // ==========================================
  console.log('\n--- 🚜 3. Auditing Farms Collection ---');
  const farmAuditResults = [];
  let farmHealthyCount = 0;
  let farmDamagedCount = 0;
  let farmOrphanCount = 0;

  for (const doc of farmsSnap.docs) {
    const data = doc.data();
    const farmId = doc.id;

    // ตรวจสอบ subcollection private/contact
    const contactSnap = await db.collection('farms').doc(farmId).collection('private').doc('contact').get();
    const hasContactSubdoc = contactSnap.exists;
    const contactData = hasContactSubdoc ? contactSnap.data() : null;

    // ตรวจสอบ ownerUid (จาก data, contact หรือจาก member ที่เชื่อมโยง)
    let memberOwnerUid = null;
    if (data.memberId && membersById.has(data.memberId)) {
      const m = membersById.get(data.memberId);
      memberOwnerUid = m.ownerUid || m.lineUserId || null;
    }
    const ownerUid = data.ownerUid || contactData?.ownerUid || memberOwnerUid || null;
    const hasOwnerUid = !!ownerUid;

    // ตรวจสอบข้อมูลติดต่อและพิกัด
    const phone = contactData?.phone || data.phone || null;
    const lineId = contactData?.lineId || data.lineId || null;
    const internalCoords = contactData?.internalCoordinates || data.internalCoordinates || null;
    const photos = Array.isArray(data.photos) ? data.photos : [];

    // ตรวจสอบความเชื่อมโยงกับสมาชิก (memberId)
    const memberId = data.memberId || null;
    let memberRefStatus = 'none';
    if (memberId) {
      if (membersById.has(memberId)) {
        memberRefStatus = 'valid';
      } else {
        memberRefStatus = 'orphan'; // ระบุ memberId แต่ไม่พบใน members
        farmOrphanCount++;
      }
    } else {
      farmOrphanCount++;
    }

    const isHealthy = hasContactSubdoc && hasOwnerUid;
    if (isHealthy) {
      farmHealthyCount++;
    } else {
      farmDamagedCount++;
    }

    farmAuditResults.push({
      id: farmId,
      farmName: data.farmName || 'ไม่ระบุชื่อแปลง',
      ownerName: data.ownerName || 'ไม่ระบุชื่อเจ้าของ',
      district: data.district || 'ไม่ระบุอำเภอ',
      status: data.status || 'pending',
      createdAt: data.createdAt || 'ไม่ระบุวันที่',
      ownerUid,
      hasContactSubdoc,
      hasOwnerUid,
      phone,
      lineId,
      hasPhotos: photos.length > 0,
      photoCount: photos.length,
      hasInternalCoords: !!internalCoords,
      memberId,
      memberRefStatus,
      isHealthy,
      raw: data,
      contactData,
    });
  }

  console.log(`   - สมบูรณ์ (มี contact + ownerUid): ${farmHealthyCount}`);
  console.log(`   - เสียหาย/ไม่สมบูรณ์ (ขาด contact หรือ ownerUid): ${farmDamagedCount}`);
  console.log(`   - Orphan (ระบุ memberId แต่ไม่มีเอกสาร หรือไม่ระบุ): ${farmOrphanCount}`);
  if (farmDamagedCount > 0) {
    console.log('   ⚠️ รายชื่อแปลงที่ไม่สมบูรณ์:');
    farmAuditResults.filter((f) => !f.isHealthy).forEach((f) => {
      console.log(`      • [${f.id}] "${f.farmName}" (เจ้าของ: ${f.ownerName}, สถานะ: ${f.status}, contact: ${f.hasContactSubdoc ? 'มี' : 'ไม่มี'}, ownerUid: ${f.ownerUid || 'ไม่มี'})`);
    });
  }

  // ==========================================
  // 4. DUPLICATE DETECTION (ใบสมัครซ้ำ)
  // ==========================================
  console.log('\n' + '='.repeat(78));
  console.log('🔍 4. DUPLICATE APPLICATION DETECTION (ตรวจสอบใบสมัครซ้ำ)');
  console.log('⚠️ กฎความปลอดภัย: ห้ามลบข้อมูลอัตโนมัติเด็ดขาด รายงานนี้มีไว้เพื่อประกอบการพิจารณา');
  console.log('='.repeat(78));

  // 4.1 ตรวจสอบซ้ำตาม Full Name (ชื่อ-นามสกุล)
  const byName = new Map();
  for (const m of memberAuditResults) {
    const cleanName = m.fullName.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!byName.has(cleanName)) byName.set(cleanName, []);
    byName.get(cleanName).push(m);
  }
  const duplicateNames = Array.from(byName.entries()).filter(([_, list]) => list.length > 1);

  // 4.2 ตรวจสอบซ้ำตาม Owner UID
  const byUid = new Map();
  for (const m of memberAuditResults) {
    if (m.ownerUid) {
      if (!byUid.has(m.ownerUid)) byUid.set(m.ownerUid, []);
      byUid.get(m.ownerUid).push(m);
    }
  }
  const duplicateUids = Array.from(byUid.entries()).filter(([_, list]) => list.length > 1);

  // 4.3 ตรวจสอบซ้ำตาม Phone Number
  const byPhone = new Map();
  for (const m of memberAuditResults) {
    const cleanPhone = m.phone ? m.phone.replace(/[^\d]/g, '') : null;
    if (cleanPhone && cleanPhone.length >= 9) {
      if (!byPhone.has(cleanPhone)) byPhone.set(cleanPhone, []);
      byPhone.get(cleanPhone).push(m);
    }
  }
  const duplicatePhones = Array.from(byPhone.entries()).filter(([_, list]) => list.length > 1);

  console.log(`\n📌 สรุปกลุ่มใบสมัครที่ซ้ำซ้อน:`);
  console.log(`   - กลุ่มชื่อ-นามสกุลซ้ำ : ${duplicateNames.length} กลุ่ม`);
  console.log(`   - กลุ่ม Owner UID ซ้ำ  : ${duplicateUids.length} กลุ่ม`);
  console.log(`   - กลุ่มเบอร์โทรศัพท์ซ้ำ : ${duplicatePhones.length} กลุ่ม\n`);

  if (duplicateNames.length > 0) {
    console.log('📋 [รายละเอียดกลุ่มชื่อ-นามสกุลซ้ำ]:');
    for (const [name, list] of duplicateNames) {
      console.log(`\n  ▶ ชื่อ: "${list[0].fullName}" (${list.length} รายการ)`);
      for (const item of list) {
        const farmObj = item.farmId ? farmsById.get(item.farmId) : null;
        console.log(`     • Doc ID: ${item.id.padEnd(25)} | สถานะ: ${item.status.padEnd(10)} | วันที่: ${item.createdAt}`);
        console.log(`       - ownerUid: ${item.ownerUid || '❌ MISSING'} | Subcollection pii: ${item.hasPiiSubdoc ? '✅ มี' : '❌ ไม่มี'}`);
        console.log(`       - แปลง: ${item.farmId || 'ไม่มี'} ${farmObj ? `("${farmObj.farmName}")` : ''} | รูปหน้า: ${item.hasFacePhoto ? '✅ มี' : '❌ ไม่มี'}`);
      }
    }
  }

  if (duplicateUids.length > 0) {
    console.log('\n📋 [รายละเอียดกลุ่ม Owner UID ซ้ำ]:');
    for (const [uid, list] of duplicateUids) {
      console.log(`\n  ▶ Owner UID: ${uid} (${list.length} รายการ)`);
      for (const item of list) {
        console.log(`     • Member ID: ${item.id.padEnd(25)} | ชื่อ: ${item.fullName.padEnd(25)} | สถานะ: ${item.status}`);
      }
    }
  }

  if (duplicatePhones.length > 0) {
    console.log('\n📋 [รายละเอียดกลุ่มเบอร์โทรศัพท์ซ้ำ]:');
    for (const [phone, list] of duplicatePhones) {
      console.log(`\n  ▶ เบอร์โทร: ${phone} (${list.length} รายการ)`);
      for (const item of list) {
        console.log(`     • Member ID: ${item.id.padEnd(25)} | ชื่อ: ${item.fullName.padEnd(25)} | สถานะ: ${item.status}`);
      }
    }
  }

  // ==========================================
  // 5. MIGRATION EXECUTION (IF APPLIED)
  // ==========================================
  if (isCommit) {
    console.log('\n' + '='.repeat(78));
    console.log('⚡ 5. EXECUTING LIVE SUBCOLLECTION MIGRATION');
    console.log('='.repeat(78));

    // ย้าย Member PII
    let memWriteCount = 0;
    for (const m of memberAuditResults) {
      const data = m.raw;
      const memberId = m.id;
      const ownerUid = m.ownerUid;

      const piiDocRef = db.collection('members').doc(memberId).collection('private').doc('pii');
      const piiData = {
        ...(m.piiData || {}),
        phone: data.phone !== undefined ? data.phone : (m.piiData?.phone || null),
        lineId: data.lineId !== undefined ? data.lineId : (m.piiData?.lineId || null),
        lineUserId: data.lineUserId !== undefined ? data.lineUserId : (m.piiData?.lineUserId || ownerUid || null),
        facePhotoUrl: data.facePhotoUrl !== undefined ? data.facePhotoUrl : (m.piiData?.facePhotoUrl || null),
        trainingCourse: data.trainingCourse !== undefined ? data.trainingCourse : (m.piiData?.trainingCourse || null),
        trainingLocation: data.trainingLocation !== undefined ? data.trainingLocation : (m.piiData?.trainingLocation || null),
        migratedAt: new Date().toISOString(),
      };
      if (ownerUid) piiData.ownerUid = ownerUid;

      const memberUpdates = {};
      if (data.phone !== undefined) memberUpdates.phone = FieldValue.delete();
      if (data.lineId !== undefined) memberUpdates.lineId = FieldValue.delete();
      if (data.lineUserId !== undefined) memberUpdates.lineUserId = FieldValue.delete();
      if (data.facePhotoUrl !== undefined) memberUpdates.facePhotoUrl = FieldValue.delete();
      if (data.trainingCourse !== undefined) memberUpdates.trainingCourse = FieldValue.delete();
      if (data.trainingLocation !== undefined) memberUpdates.trainingLocation = FieldValue.delete();
      if (ownerUid && data.ownerUid !== ownerUid) memberUpdates.ownerUid = ownerUid;

      await piiDocRef.set(piiData, { merge: true });
      if (Object.keys(memberUpdates).length > 0) {
        await db.collection('members').doc(memberId).update(memberUpdates);
      }
      memWriteCount++;
    }
    console.log(`✅ Members migration completed: ${memWriteCount} documents processed.`);

    // ย้าย Farm Contact
    let farmWriteCount = 0;
    for (const f of farmAuditResults) {
      const data = f.raw;
      const farmId = f.id;
      const ownerUid = f.ownerUid;

      const contactDocRef = db.collection('farms').doc(farmId).collection('private').doc('contact');
      const contactData = {
        ...(f.contactData || {}),
        internalCoordinates: data.internalCoordinates !== undefined ? data.internalCoordinates : (f.contactData?.internalCoordinates || null),
        phone: data.phone !== undefined ? data.phone : (f.contactData?.phone || null),
        lineId: data.lineId !== undefined ? data.lineId : (f.contactData?.lineId || null),
        migratedAt: new Date().toISOString(),
      };
      if (ownerUid) contactData.ownerUid = ownerUid;

      const farmUpdates = {};
      if (data.internalCoordinates !== undefined) farmUpdates.internalCoordinates = FieldValue.delete();
      if (!data.isPublicPhone && data.phone !== undefined) farmUpdates.phone = FieldValue.delete();
      if (!data.isPublicLine && data.lineId !== undefined) farmUpdates.lineId = FieldValue.delete();
      if (ownerUid && data.ownerUid !== ownerUid) farmUpdates.ownerUid = ownerUid;

      await contactDocRef.set(contactData, { merge: true });
      if (Object.keys(farmUpdates).length > 0) {
        await db.collection('farms').doc(farmId).update(farmUpdates);
      }
      farmWriteCount++;
    }
    console.log(`✅ Farms migration completed: ${farmWriteCount} documents processed.`);
  }

  // ==========================================
  // 6. POLITE LINE OA NOTIFICATION TEMPLATE
  // ==========================================
  console.log('\n' + '='.repeat(78));
  console.log('✉️ 6. TEMPLATE ข้อความแจ้งเตือนผู้สมัครอย่างสุภาพ (สำหรับ LINE Official Account)');
  console.log('='.repeat(78));
  console.log(`
สวัสดีครับ/ค่ะ ทีมงานเครือข่ายกสิกรรมธรรมชาตินครสวรรค์ ขอขอบคุณที่คุณ[ชื่อ]ได้ลงทะเบียนเข้าร่วมเครือข่าย

เนื่องจากในช่วงที่ผ่านมา ระบบมีการปรับปรุงความปลอดภัยของข้อมูลและยกระดับการคุ้มครองข้อมูลส่วนบุคคลตามมาตรฐานความปลอดภัย อาจทำให้ข้อมูลการสมัครบางส่วน (เช่น ข้อมูลติดต่อหรือรูปภาพแปลง) บันทึกไม่สมบูรณ์ในระบบฐานข้อมูล

เพื่อประโยชน์ในการประสานงานและการเข้าร่วมกิจกรรม รบกวนคุณ[ชื่อ]เข้าสู่ระบบที่:
👉 https://agrinaturenetworknsw.vercel.app/member/dashboard

เพื่อตรวจสอบความถูกต้องและอัปเดตข้อมูลแปลงกสิกรรมธรรมชาติเพิ่มเติมอีกครั้งครับ/ค่ะ
หากต้องการความช่วยเหลือหรือสอบถามข้อมูล ติดต่อทีมประสานงานเครือข่ายได้ตลอดเวลาครับ

ขออภัยในความไม่สะดวกมา ณ ที่นี้ด้วยครับ 🙏
  `.trim());
  console.log('\n' + '='.repeat(78) + '\n');
}

auditAndScan().catch((err) => {
  console.error('❌ Audit script failed:', err);
  process.exit(1);
});
