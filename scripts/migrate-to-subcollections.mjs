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
const isCommit = args.includes('--commit');
const isDryRun = !isCommit;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'agrinature-network-nsw';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = formatKey(process.env.FIREBASE_PRIVATE_KEY);

console.log('='.repeat(75));
console.log('🚜 Firestore Subcollection & Ownership Model Migration (Task 7)');
console.log('='.repeat(75));
if (isDryRun) {
  console.log('MODE: 🔍 DRY-RUN (SIMULATION ONLY - NO WRITES WILL BE EXECUTED)');
  console.log('To apply real updates to Firestore, run:');
  console.log('  node --env-file=.env.local scripts/migrate-to-subcollections.mjs --commit');
} else {
  console.log('MODE: ⚠️ LIVE COMMIT (REAL WRITES WILL BE EXECUTED ON FIRESTORE!)');
}
console.log('\n⚠️ SAFETY BACKUP REMINDER:');
console.log('Before running with --commit on production, ensure you have exported a backup:');
console.log('  gcloud firestore export gs://<YOUR_BACKUP_BUCKET>');
console.log('='.repeat(75) + '\n');

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
  console.warn('   Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local to run migration on live Firestore.');
  process.exit(0);
}

async function migrateMembers() {
  console.log('--- 👤 1. Processing Members Collection ---');
  const membersSnapshot = await db.collection('members').get();
  console.log(`Found ${membersSnapshot.size} total member documents.`);

  const memberMap = new Map();
  const memberStatusMap = new Map();
  const missingOwnerMembers = [];

  let migratedCount = 0;
  let alreadyMigratedCount = 0;

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

    // ข้อมูล PII สำหรับบันทึกใน subcollection
    const hasPiiInParent = data.phone !== undefined ||
      data.lineId !== undefined ||
      data.facePhotoUrl !== undefined ||
      data.trainingCourse !== undefined ||
      data.trainingLocation !== undefined;

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

    // คำนวณ Field Updates ด้วย FieldValue.delete() ป้องกันการเขียนทับข้อมูลอื่นที่ไม่เกี่ยวข้อง
    const memberUpdates = {};
    if (data.phone !== undefined) memberUpdates.phone = FieldValue.delete();
    if (data.lineId !== undefined) memberUpdates.lineId = FieldValue.delete();
    if (data.facePhotoUrl !== undefined) memberUpdates.facePhotoUrl = FieldValue.delete();
    if (data.trainingCourse !== undefined) memberUpdates.trainingCourse = FieldValue.delete();
    if (data.trainingLocation !== undefined) memberUpdates.trainingLocation = FieldValue.delete();
    if (ownerUid && data.ownerUid !== ownerUid) memberUpdates.ownerUid = ownerUid;

    const needsUpdate = hasPiiInParent || (ownerUid && data.ownerUid !== ownerUid);

    if (needsUpdate) {
      if (isCommit) {
        // 1. บันทึก subcollection
        await db.collection('members').doc(memberId).collection('private').doc('pii').set(piiData, { merge: true });
        // 2. ลบ sensitive fields ออกจากเอกสารหลักและอัปเดต ownerUid
        if (Object.keys(memberUpdates).length > 0) {
          await db.collection('members').doc(memberId).update(memberUpdates);
        }
      }
      console.log(`  [${isDryRun ? 'DRY-RUN' : 'MIGRATED'}] Member [${memberId}] "${data.fullName}": PII moved to subcollection, ownerUid=${ownerUid || 'MISSING'}`);
      migratedCount++;
    } else {
      alreadyMigratedCount++;
    }
  }

  console.log(`✅ Members: ${migratedCount} ${isDryRun ? 'would be migrated' : 'migrated'}, ${alreadyMigratedCount} already clean.`);
  if (missingOwnerMembers.length > 0) {
    console.warn(`⚠️ Warning: ${missingOwnerMembers.length} members have NO lineUserId/ownerUid:`);
    missingOwnerMembers.forEach((m) => console.warn(`   - Member [${m.id}] "${m.fullName}"`));
  }

  return {
    memberMap,
    memberStatusMap,
    stats: { total: membersSnapshot.size, migrated: migratedCount, clean: alreadyMigratedCount, missingOwner: missingOwnerMembers.length },
    missingOwnerMembers,
  };
}

async function migrateFarms(memberMap, memberStatusMap) {
  console.log('\n--- 🚜 2. Processing Farms Collection ---');
  const farmsSnapshot = await db.collection('farms').get();
  console.log(`Found ${farmsSnapshot.size} total farm documents.`);

  const farmMap = new Map();
  const missingOwnerFarms = [];

  let migratedCount = 0;
  let alreadyMigratedCount = 0;

  for (const doc of farmsSnapshot.docs) {
    const data = doc.data();
    const farmId = doc.id;

    // หา ownerUid จาก data.ownerUid หรือค้นหาจาก memberId ใน memberMap
    const memberOwnerUid = data.memberId ? memberMap.get(data.memberId) : null;
    const ownerUid = data.ownerUid || memberOwnerUid || null;

    if (ownerUid) {
      farmMap.set(farmId, ownerUid);
    } else {
      missingOwnerFarms.push({
        id: farmId,
        farmName: data.farmName || 'Unnamed',
        memberId: data.memberId || 'None',
      });
    }

    // กำหนดสถานะฟาร์มจากข้อมูลเดิม หรือดึงจากสถานะสมาชิก (Option A Backfill)
    const memberStatus = data.memberId ? memberStatusMap.get(data.memberId) : null;
    const farmStatus = data.status || memberStatus || 'pending';

    const hasContactInParent = data.internalCoordinates !== undefined ||
      (!data.isPublicPhone && data.phone !== undefined) ||
      (!data.isPublicLine && data.lineId !== undefined);

    const contactData = {
      internalCoordinates: data.internalCoordinates || null,
      phone: data.phone || null,
      lineId: data.lineId || null,
      migratedAt: new Date().toISOString(),
    };
    if (ownerUid) {
      contactData.ownerUid = ownerUid;
    }

    // คำนวณ Field Updates ด้วย FieldValue.delete()
    const farmUpdates = {};
    if (data.internalCoordinates !== undefined) farmUpdates.internalCoordinates = FieldValue.delete();
    if (!data.isPublicPhone && data.phone !== undefined) farmUpdates.phone = FieldValue.delete();
    if (!data.isPublicLine && data.lineId !== undefined) farmUpdates.lineId = FieldValue.delete();
    if (ownerUid && data.ownerUid !== ownerUid) farmUpdates.ownerUid = ownerUid;
    if (farmStatus && data.status !== farmStatus) farmUpdates.status = farmStatus;

    const needsUpdate = hasContactInParent ||
      (ownerUid && data.ownerUid !== ownerUid) ||
      (farmStatus && data.status !== farmStatus);

    if (needsUpdate) {
      if (isCommit) {
        // 1. บันทึกลง Subcollection farms/{farmId}/private/contact
        await db.collection('farms').doc(farmId).collection('private').doc('contact').set(contactData, { merge: true });
        // 2. อัปเดตเอกสารหลัก
        if (Object.keys(farmUpdates).length > 0) {
          await db.collection('farms').doc(farmId).update(farmUpdates);
        }
      }
      console.log(`  [${isDryRun ? 'DRY-RUN' : 'MIGRATED'}] Farm [${farmId}] "${data.farmName || 'Unnamed'}": contact moved, ownerUid=${ownerUid || 'MISSING'}, status=${farmStatus}`);
      migratedCount++;
    } else {
      alreadyMigratedCount++;
    }
  }

  console.log(`✅ Farms: ${migratedCount} ${isDryRun ? 'would be migrated' : 'migrated'}, ${alreadyMigratedCount} already clean.`);
  if (missingOwnerFarms.length > 0) {
    console.warn(`⚠️ Warning: ${missingOwnerFarms.length} farms have NO ownerUid:`);
    missingOwnerFarms.forEach((f) => console.warn(`   - Farm [${f.id}] "${f.farmName}" (memberId: ${f.memberId})`));
  }

  return {
    farmMap,
    stats: { total: farmsSnapshot.size, migrated: migratedCount, clean: alreadyMigratedCount, missingOwner: missingOwnerFarms.length },
    missingOwnerFarms,
  };
}

async function migrateProducts(farmMap) {
  console.log('\n--- 🛒 3. Processing Products Collection ---');
  const productsSnapshot = await db.collection('products').get();
  console.log(`Found ${productsSnapshot.size} total product documents.`);

  const missingOwnerProducts = [];

  let migratedCount = 0;
  let alreadyMigratedCount = 0;

  for (const doc of productsSnapshot.docs) {
    const data = doc.data();
    const productId = doc.id;

    const farmOwnerUid = data.farmId ? farmMap.get(data.farmId) : null;
    const ownerUid = data.ownerUid || farmOwnerUid || null;

    if (!ownerUid) {
      missingOwnerProducts.push({
        id: productId,
        title: data.title || 'Unnamed',
        farmId: data.farmId || 'None',
      });
    }

    const needsUpdate = ownerUid && data.ownerUid !== ownerUid;

    if (needsUpdate) {
      if (isCommit) {
        await db.collection('products').doc(productId).update({ ownerUid });
      }
      console.log(`  [${isDryRun ? 'DRY-RUN' : 'MIGRATED'}] Product [${productId}] "${data.title}": ownerUid backfilled -> ${ownerUid}`);
      migratedCount++;
    } else {
      alreadyMigratedCount++;
    }
  }

  console.log(`✅ Products: ${migratedCount} ${isDryRun ? 'would be migrated' : 'migrated'}, ${alreadyMigratedCount} already clean.`);
  if (missingOwnerProducts.length > 0) {
    console.warn(`⚠️ Warning: ${missingOwnerProducts.length} products have NO ownerUid:`);
    missingOwnerProducts.forEach((p) => console.warn(`   - Product [${p.id}] "${p.title}" (farmId: ${p.farmId})`));
  }

  return {
    stats: { total: productsSnapshot.size, migrated: migratedCount, clean: alreadyMigratedCount, missingOwner: missingOwnerProducts.length },
    missingOwnerProducts,
  };
}

async function run() {
  try {
    const { memberMap, memberStatusMap, stats: memberStats, missingOwnerMembers } = await migrateMembers();
    const { farmMap, stats: farmStats, missingOwnerFarms } = await migrateFarms(memberMap, memberStatusMap);
    const { stats: productStats, missingOwnerProducts } = await migrateProducts(farmMap);

    console.log('\n' + '='.repeat(75));
    console.log('📊 MIGRATION SUMMARY REPORT');
    console.log('='.repeat(75));
    console.log(`Execution Mode: ${isDryRun ? '🔍 DRY-RUN (Simulation)' : '⚠️ LIVE COMMIT (Updated)'}`);
    console.log(`- Members : Total ${memberStats.total} | ${isDryRun ? 'Pending Changes' : 'Updated'}: ${memberStats.migrated} | Clean: ${memberStats.clean} | Missing Owner: ${missingOwnerMembers.length}`);
    console.log(`- Farms   : Total ${farmStats.total} | ${isDryRun ? 'Pending Changes' : 'Updated'}: ${farmStats.migrated} | Clean: ${farmStats.clean} | Missing Owner: ${missingOwnerFarms.length}`);
    console.log(`- Products: Total ${productStats.total} | ${isDryRun ? 'Pending Changes' : 'Updated'}: ${productStats.migrated} | Clean: ${productStats.clean} | Missing Owner: ${missingOwnerProducts.length}`);
    console.log('='.repeat(75));

    if (isDryRun) {
      console.log('\n💡 To perform real migration, run:');
      console.log('   node --env-file=.env.local scripts/migrate-to-subcollections.mjs --commit\n');
    } else {
      console.log('\n🎉 Real migration completed successfully!\n');
    }
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

run();
