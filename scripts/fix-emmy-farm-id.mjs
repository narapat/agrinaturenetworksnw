#!/usr/bin/env node

/**
 * Migration Script: Fix typo in Firestore Document ID for ฟาร์มข้าวอิ่มเอม
 * Moves 'farms/farm-1788935859777"' -> 'farms/farm-1788935859777'
 * Copies subcollection 'private/contact'
 * Removes the old document with trailing quote
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const OLD_FARM_ID = 'farm-1788935859777"';
const NEW_FARM_ID = 'farm-1788935859777';
const MEMBER_ID = 'mem-1788935859777';
const PRODUCT_ID = 'prod-1788937451848';

async function run() {
  console.log('='.repeat(70));
  console.log(`🌾 MIGRATING FARM DOCUMENT ID: [${OLD_FARM_ID}] -> [${NEW_FARM_ID}]`);
  console.log('='.repeat(70));

  const oldFarmRef = db.collection('farms').doc(OLD_FARM_ID);
  const oldFarmSnap = await oldFarmRef.get();

  if (!oldFarmSnap.exists) {
    console.log(`ℹ️ Source document [${OLD_FARM_ID}] does not exist. Checking target [${NEW_FARM_ID}]...`);
    const newFarmSnap = await db.collection('farms').doc(NEW_FARM_ID).get();
    if (newFarmSnap.exists) {
      console.log(`✅ Target document [${NEW_FARM_ID}] already exists! No migration needed.`);
      return;
    } else {
      console.error(`❌ Neither source nor target document exists!`);
      process.exit(1);
    }
  }

  const farmData = oldFarmSnap.data();
  console.log(`📄 Found source farm: "${farmData.farmName}" (status: ${farmData.status})`);

  // Ensure internal id field is clean
  farmData.id = NEW_FARM_ID;

  // 1. Write to target document
  const newFarmRef = db.collection('farms').doc(NEW_FARM_ID);
  console.log(`💾 Writing farm data to [farms/${NEW_FARM_ID}]...`);
  await newFarmRef.set(farmData, { merge: true });
  console.log(`✅ Target farm document written successfully.`);

  // 2. Copy subcollection private/contact if exists
  const oldContactRef = oldFarmRef.collection('private').doc('contact');
  const oldContactSnap = await oldContactRef.get();
  if (oldContactSnap.exists) {
    const contactData = oldContactSnap.data();
    console.log(`💾 Copying subcollection private/contact to [farms/${NEW_FARM_ID}/private/contact]...`);
    await newFarmRef.collection('private').doc('contact').set(contactData, { merge: true });
    console.log(`✅ Subcollection private/contact copied successfully.`);
  } else {
    console.log(`ℹ️ No private/contact subcollection found in old doc.`);
  }

  // 3. Verify target document and subcollection
  const verifyNewFarm = await newFarmRef.get();
  if (!verifyNewFarm.exists) {
    throw new Error(`Migration verification failed: ${NEW_FARM_ID} does not exist after write!`);
  }

  // 4. Delete old subcollection and document
  console.log(`🗑️ Cleaning up old document with quote [farms/${OLD_FARM_ID}]...`);
  if (oldContactSnap.exists) {
    await oldContactRef.delete();
    console.log(`🗑️ Deleted [farms/${OLD_FARM_ID}/private/contact].`);
  }
  await oldFarmRef.delete();
  console.log(`🗑️ Deleted [farms/${OLD_FARM_ID}].`);

  // 5. Verify member link
  const memberRef = db.collection('members').doc(MEMBER_ID);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    const mData = memberSnap.data();
    console.log(`👤 Checking member [${MEMBER_ID}] (${mData.fullName})...`);
    if (mData.farmId !== NEW_FARM_ID) {
      console.log(`🔄 Updating member farmId to [${NEW_FARM_ID}]...`);
      await memberRef.update({ farmId: NEW_FARM_ID });
      console.log(`✅ Member updated.`);
    } else {
      console.log(`✅ Member already points to [${NEW_FARM_ID}].`);
    }
  }

  // 6. Verify product link
  const prodRef = db.collection('products').doc(PRODUCT_ID);
  const prodSnap = await prodRef.get();
  if (prodSnap.exists) {
    const pData = prodSnap.data();
    console.log(`📦 Checking product [${PRODUCT_ID}] (${pData.title})...`);
    if (pData.farmId !== NEW_FARM_ID) {
      console.log(`🔄 Updating product farmId to [${NEW_FARM_ID}]...`);
      await prodRef.update({ farmId: NEW_FARM_ID });
      console.log(`✅ Product updated.`);
    } else {
      console.log(`✅ Product already points to [${NEW_FARM_ID}].`);
    }
  }

  console.log('='.repeat(70));
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(70));
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
