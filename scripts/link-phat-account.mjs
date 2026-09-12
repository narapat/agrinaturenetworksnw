#!/usr/bin/env node

/**
 * สคริปต์เชื่อมโยงบัญชีจริงของคุณภัทร (นพรัตน์) เข้ากับ mem-1788900219588
 * และแปลง "โคก หนอง นา ปลาวาฬ" พร้อมมอบสิทธิ์ admin
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function formatKey(key) {
  if (!key) return undefined;
  let trimmed = key.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) trimmed = trimmed.slice(1, -1);
  else if (trimmed.startsWith("'") && trimmed.endsWith("'")) trimmed = trimmed.slice(1, -1);
  return trimmed.replace(/\\n/g, '\n').trim();
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'agrinature-network-nsw';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = formatKey(process.env.FIREBASE_PRIVATE_KEY);

if (!clientEmail || !privateKey) {
  console.error('❌ Missing Firebase Admin credentials in .env.local');
  process.exit(1);
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId,
});
const db = getFirestore(app);

const REAL_LINE_UID = 'U5b707b9529727e51bd908698249178bb';
const MEMBER_ID = 'mem-1788900219588';
const FARM_ID = 'farm-1788900219588';
const PRODUCT_ID = 'prod-1788900378163';

async function run() {
  console.log('='.repeat(70));
  console.log(`🔗 Linking Real LINE UID [${REAL_LINE_UID}] to Khun Phat Account`);
  console.log('='.repeat(70));

  const batch = db.batch();

  // 1. อัปเดต members/mem-1788900219588
  console.log(`1. Updating members/${MEMBER_ID}...`);
  const memberRef = db.collection('members').doc(MEMBER_ID);
  batch.update(memberRef, {
    ownerUid: REAL_LINE_UID,
    role: 'admin',
    roles: ['member', 'admin'],
    status: 'approved',
    farmId: FARM_ID,
    farmName: 'โคก หนอง นา ปลาวาฬ',
    updatedAt: new Date().toISOString(),
  });

  // 2. อัปเดต members/mem-1788900219588/private/pii
  console.log(`2. Updating members/${MEMBER_ID}/private/pii...`);
  const memberPiiRef = memberRef.collection('private').doc('pii');
  batch.set(memberPiiRef, {
    ownerUid: REAL_LINE_UID,
    lineUserId: REAL_LINE_UID,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // 3. อัปเดต farms/farm-1788900219588
  console.log(`3. Updating farms/${FARM_ID}...`);
  const farmRef = db.collection('farms').doc(FARM_ID);
  batch.update(farmRef, {
    ownerUid: REAL_LINE_UID,
    memberId: MEMBER_ID,
    status: 'approved',
    updatedAt: new Date().toISOString(),
  });

  // 4. อัปเดต farms/farm-1788900219588/private/contact
  console.log(`4. Updating farms/${FARM_ID}/private/contact...`);
  const farmContactRef = farmRef.collection('private').doc('contact');
  batch.set(farmContactRef, {
    ownerUid: REAL_LINE_UID,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // 5. อัปเดต products/prod-1788900378163
  console.log(`5. Updating products/${PRODUCT_ID}...`);
  const prodRef = db.collection('products').doc(PRODUCT_ID);
  batch.update(prodRef, {
    ownerUid: REAL_LINE_UID,
    farmId: FARM_ID,
    updatedAt: new Date().toISOString(),
  });

  // 6. ปลด ownerUid ออกจาก admin-001 (เพื่อไม่ให้แย่ง LINE Login กัน)
  console.log(`6. Unlinking UID from placeholder admin-001...`);
  const adminRef = db.collection('members').doc('admin-001');
  batch.update(adminRef, {
    ownerUid: FieldValue.delete(),
    updatedAt: new Date().toISOString(),
  });
  const adminPiiRef = adminRef.collection('private').doc('pii');
  batch.set(adminPiiRef, {
    ownerUid: FieldValue.delete(),
    lineUserId: FieldValue.delete(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log('Committing batch write to Cloud Firestore...');
  await batch.commit();

  console.log('\n' + '='.repeat(70));
  console.log('✅ All updates successfully applied to Cloud Firestore!');
  console.log('='.repeat(70));

  // Verification read
  const updatedMem = (await memberRef.get()).data();
  const updatedPii = (await memberPiiRef.get()).data();
  const updatedFarm = (await farmRef.get()).data();
  const updatedContact = (await farmContactRef.get()).data();
  const updatedProd = (await prodRef.get()).data();
  const updatedAdmin = (await adminRef.get()).data();

  console.log('\n📊 VERIFICATION CHECK:');
  console.log(`- Member [${MEMBER_ID}]: fullName="${updatedMem.fullName}", role="${updatedMem.role}", ownerUid="${updatedMem.ownerUid}"`);
  console.log(`- Member PII: lineUserId="${updatedPii.lineUserId}", ownerUid="${updatedPii.ownerUid}"`);
  console.log(`- Farm [${FARM_ID}]: farmName="${updatedFarm.farmName}", ownerUid="${updatedFarm.ownerUid}", status="${updatedFarm.status}"`);
  console.log(`- Farm Contact: ownerUid="${updatedContact.ownerUid}"`);
  console.log(`- Product [${PRODUCT_ID}]: title="${updatedProd.title}", ownerUid="${updatedProd.ownerUid}"`);
  console.log(`- Placeholder admin-001 ownerUid: "${updatedAdmin.ownerUid || 'UNLINKED (Clean)'}"`);
}

run().catch((err) => {
  console.error('❌ Error executing account link:', err);
  process.exit(1);
});
