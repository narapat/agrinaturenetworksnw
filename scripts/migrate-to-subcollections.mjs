#!/usr/bin/env node

/**
 * สคริปต์ย้ายโครงสร้างข้อมูล Firestore สู่ Subcollections (D1.2 Migration Script)
 * 
 * แยกข้อมูลอ่อนไหว (GPS จริง, เบอร์โทร, LINE ID, รูปหน้า) ออกจาก Document สาธารณะ
 * - farms/{farmId}/private/contact
 * - members/{memberId}/private/pii
 * 
 * วิธีรัน:
 * node --env-file=.env.local scripts/migrate-to-subcollections.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'agrinature-network-nsw';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = formatKey(process.env.FIREBASE_PRIVATE_KEY);

let db;

if (clientEmail && privateKey) {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
  db = getFirestore(app);
  console.log('✅ Connected to Firestore using Firebase Admin SDK credentials.');
} else {
  console.warn('⚠️ No Firebase Admin credentials found in environment.');
  console.warn('   Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local to run migration on live Firestore.');
  process.exit(0);
}

async function migrateMembers() {
  console.log('\n--- 👤 Migrating Members to Subcollections ---');
  const membersSnapshot = await db.collection('members').get();
  console.log(`Found ${membersSnapshot.size} members in Firestore.`);

  let migratedCount = 0;
  const memberMap = new Map();
  const memberStatusMap = new Map();
  const missingOwnerMembers = [];

  for (const doc of membersSnapshot.docs) {
    const data = doc.data();
    const memberId = doc.id;

    memberStatusMap.set(memberId, data.status || 'pending');

    const ownerUid = data.ownerUid || data.lineUserId || null;
    if (ownerUid) {
      memberMap.set(memberId, ownerUid);
    } else {
      missingOwnerMembers.push({ id: memberId, fullName: data.fullName || 'Unnamed' });
    }

    const piiData = {
      phone: data.phone || null,
      lineId: data.lineId || null,
      lineUserId: data.lineUserId || null,
      facePhotoUrl: data.facePhotoUrl || null,
      trainingCourse: data.trainingCourse || null,
      trainingLocation: data.trainingLocation || null,
      migratedAt: new Date().toISOString(),
    };
    if (ownerUid) {
      piiData.ownerUid = ownerUid;
    }

    // 1. บันทึกลง Subcollection members/{memberId}/private/pii
    await db.collection('members').doc(memberId).collection('private').doc('pii').set(piiData, { merge: true });

    // 2. ปรับ Document หลัก ให้คงเหลือเฉพาะข้อมูลระดับโครงสร้าง พร้อม ownerUid
    const sanitizedBaseMember = {
      id: data.id || memberId,
      fullName: data.fullName,
      role: data.role || 'member',
      status: data.status || 'pending',
      farmId: data.farmId || '',
      farmName: data.farmName || '',
      createdAt: data.createdAt || new Date().toISOString(),
      delegationStatus: data.delegationStatus || 'none',
    };
    if (ownerUid) {
      sanitizedBaseMember.ownerUid = ownerUid;
    }

    await db.collection('members').doc(memberId).set(sanitizedBaseMember);
    console.log(`  ✓ Migrated member [${memberId}] (${data.fullName}) -> ownerUid: ${ownerUid || 'MISSING'}, status: ${sanitizedBaseMember.status}`);
    migratedCount++;
  }

  console.log(`✅ Finished migrating ${migratedCount} members.`);
  if (missingOwnerMembers.length > 0) {
    console.warn(`⚠️ Warning: ${missingOwnerMembers.length} members have NO lineUserId/ownerUid:`);
    missingOwnerMembers.forEach((m) => console.warn(`   - Member [${m.id}] "${m.fullName}"`));
  } else {
    console.log(`✅ All members have valid lineUserId/ownerUid.`);
  }

  return { memberMap, memberStatusMap, migratedCount, missingOwnerMembers };
}

async function migrateFarms(memberMap, memberStatusMap) {
  console.log('\n--- 🚜 Migrating Farms to Subcollections ---');
  const farmsSnapshot = await db.collection('farms').get();
  console.log(`Found ${farmsSnapshot.size} farms in Firestore.`);

  let migratedCount = 0;
  const missingOwnerFarms = [];

  for (const doc of farmsSnapshot.docs) {
    const data = doc.data();
    const farmId = doc.id;

    // หา ownerUid จาก data.ownerUid หรือค้นหาจาก memberId ใน memberMap
    const memberOwnerUid = data.memberId ? memberMap.get(data.memberId) : null;
    const ownerUid = data.ownerUid || memberOwnerUid || null;

    if (!ownerUid) {
      missingOwnerFarms.push({
        id: farmId,
        farmName: data.farmName || 'Unnamed',
        memberId: data.memberId || 'None',
      });
    }

    // กำหนดสถานะฟาร์มจากข้อมูลเดิม หรือดึงจากสถานะสมาชิก (Option A Backfill)
    const memberStatus = data.memberId ? memberStatusMap.get(data.memberId) : null;
    const farmStatus = data.status || memberStatus || 'pending';

    // ข้อมูลติดต่อส่วนบุคคลสำหรับ subcollection
    const contactData = {
      internalCoordinates: data.internalCoordinates || null,
      phone: data.phone || null,
      lineId: data.lineId || null,
      migratedAt: new Date().toISOString(),
    };
    if (ownerUid) {
      contactData.ownerUid = ownerUid;
    }

    // 1. บันทึกลง Subcollection farms/{farmId}/private/contact
    await db.collection('farms').doc(farmId).collection('private').doc('contact').set(contactData, { merge: true });

    // 2. ลบ internalCoordinates ออกจาก Document สาธารณะ (คงเหลือเฉพาะ publicZone) และใส่ ownerUid + status
    const sanitizedBaseFarm = { ...data };
    if (ownerUid) {
      sanitizedBaseFarm.ownerUid = ownerUid;
    }
    sanitizedBaseFarm.status = farmStatus;

    delete sanitizedBaseFarm.internalCoordinates;
    if (!data.isPublicPhone) delete sanitizedBaseFarm.phone;
    if (!data.isPublicLine) delete sanitizedBaseFarm.lineId;

    await db.collection('farms').doc(farmId).set(sanitizedBaseFarm);
    console.log(`  ✓ Migrated farm [${farmId}] (${data.farmName || 'Unnamed'}) -> ownerUid: ${ownerUid || 'MISSING'}, status: ${farmStatus}`);
    migratedCount++;
  }

  console.log(`✅ Finished migrating ${migratedCount} farms.`);
  if (missingOwnerFarms.length > 0) {
    console.warn(`⚠️ Warning: ${missingOwnerFarms.length} farms have NO ownerUid:`);
    missingOwnerFarms.forEach((f) => console.warn(`   - Farm [${f.id}] "${f.farmName}" (memberId: ${f.memberId})`));
  } else {
    console.log(`✅ All farms successfully mapped to an ownerUid.`);
  }

  return { migratedCount, missingOwnerFarms };
}

async function run() {
  try {
    const { memberMap, memberStatusMap, missingOwnerMembers } = await migrateMembers();
    const { missingOwnerFarms } = await migrateFarms(memberMap, memberStatusMap);
    console.log('\n🎉 All Firestore data successfully migrated to secure Subcollection architecture!');
    console.log(`\n📋 Migration Summary:`);
    console.log(`- Members missing ownerUid: ${missingOwnerMembers.length}`);
    console.log(`- Farms missing ownerUid: ${missingOwnerFarms.length}`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
