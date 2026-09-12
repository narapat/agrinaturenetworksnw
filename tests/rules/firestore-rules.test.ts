import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Firestore Security Rules Integration Tests (Emulator)', () => {
  let testEnv: RulesTestEnvironment;

  // Alice: สมาชิก A (LINE UID: U_ALICE_LINE_123, Member Doc ID: mem-alice-001, Farm Doc ID: farm-alice-001)
  const ALICE_UID = 'U_ALICE_LINE_123';
  const ALICE_MEM_ID = 'mem-alice-001';
  const ALICE_FARM_ID = 'farm-alice-001';
  const ALICE_PROD_ID = 'prod-alice-001';

  // Bob: สมาชิก B (LINE UID: U_BOB_LINE_456, Member Doc ID: mem-bob-002, Farm Doc ID: farm-bob-002)
  const BOB_UID = 'U_BOB_LINE_456';
  const BOB_MEM_ID = 'mem-bob-002';
  const BOB_FARM_ID = 'farm-bob-002';
  const BOB_PROD_ID = 'prod-bob-002';

  // Admin: แอดมินเครือข่าย (LINE UID: U_ADMIN_LINE_789)
  const ADMIN_UID = 'U_ADMIN_LINE_789';

  beforeAll(async () => {
    const rules = readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-agrinature-test',
      firestore: {
        rules,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    // จัดเตรียมข้อมูลจำลองเบื้องต้นโดยข้ามกฎความปลอดภัย (Admin Mode)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      // 1. Members
      await db.collection('members').doc(ALICE_MEM_ID).set({
        ownerUid: ALICE_UID,
        fullName: 'อลิซ กสิกรรม',
        status: 'approved',
        role: 'member',
        farmId: ALICE_FARM_ID,
        lineUserId: ALICE_UID,
      });

      await db.collection('members').doc(BOB_MEM_ID).set({
        ownerUid: BOB_UID,
        fullName: 'บ็อบ กสิกรรม',
        status: 'pending',
        role: 'member',
        farmId: BOB_FARM_ID,
        lineUserId: BOB_UID,
      });

      // 2. Member Private PII
      await db.collection('members').doc(ALICE_MEM_ID).collection('private').doc('pii').set({
        ownerUid: ALICE_UID,
        phone: '0811111111',
        lineId: 'alice_line_id',
        facePhotoUrl: 'https://example.com/alice-face.jpg',
      });

      await db.collection('members').doc(BOB_MEM_ID).collection('private').doc('pii').set({
        ownerUid: BOB_UID,
        phone: '0822222222',
        lineId: 'bob_line_id',
        facePhotoUrl: 'https://example.com/bob-face.jpg',
      });

      // 3. Farms
      await db.collection('farms').doc(ALICE_FARM_ID).set({
        ownerUid: ALICE_UID,
        farmName: 'แปลงอลิซ เกษตรอินทรีย์',
        ownerName: 'อลิซ กสิกรรม',
        district: 'เมืองนครสวรรค์',
        subdistrict: 'หนองกรด',
        memberId: ALICE_MEM_ID,
        status: 'approved',
        story: 'เรื่องเล่าแปลงอลิซ',
        photos: ['https://example.com/alice1.jpg'],
        practices: ['โคก หนอง นา'],
      });

      await db.collection('farms').doc(BOB_FARM_ID).set({
        ownerUid: BOB_UID,
        farmName: 'แปลงบ็อบ โคกหนองนา',
        ownerName: 'บ็อบ กสิกรรม',
        district: 'ชุมแสง',
        subdistrict: 'ทับกฤช',
        memberId: BOB_MEM_ID,
        status: 'pending',
        story: 'เรื่องเล่าแปลงบ็อบ',
        photos: ['https://example.com/bob1.jpg'],
        practices: ['กสิกรรมธรรมชาติ'],
      });

      // 4. Farm Private Contact
      await db.collection('farms').doc(ALICE_FARM_ID).collection('private').doc('contact').set({
        ownerUid: ALICE_UID,
        internalCoordinates: { lat: 15.7001, lng: 100.0501 },
        phone: '0811111111',
        lineId: 'alice_line_id',
      });

      await db.collection('farms').doc(BOB_FARM_ID).collection('private').doc('contact').set({
        ownerUid: BOB_UID,
        internalCoordinates: { lat: 15.8891, lng: 100.2345 },
        phone: '0822222222',
        lineId: 'bob_line_id',
      });

      // 5. Products
      await db.collection('products').doc(ALICE_PROD_ID).set({
        farmId: ALICE_FARM_ID,
        farmName: 'แปลงอลิซ เกษตรอินทรีย์',
        title: 'น้ำส้มควันไม้แท้',
        price: 80,
        status: 'sale',
        images: ['https://example.com/vinegar.jpg'],
      });

      await db.collection('products').doc(BOB_PROD_ID).set({
        farmId: BOB_FARM_ID,
        farmName: 'แปลงบ็อบ โคกหนองนา',
        title: 'ปุ๋ยหมักโบกาฉิ',
        price: 120,
        status: 'sale',
        images: ['https://example.com/bokashi.jpg'],
      });
    });
  });

  // ========================================================
  // 16 Core Rules Test Cases
  // ========================================================

  it('1. guest (ไม่ล็อกอิน) อ่าน members -> deny', async () => {
    const guestDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(guestDb.collection('members').doc(ALICE_MEM_ID).get());
  });

  it('2. guest อ่าน farms/{id}/private/contact -> deny', async () => {
    const guestDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      guestDb.collection('farms').doc(ALICE_FARM_ID).collection('private').doc('contact').get()
    );
  });

  it('3. guest อ่าน members/{id}/private/pii -> deny', async () => {
    const guestDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      guestDb.collection('members').doc(ALICE_MEM_ID).collection('private').doc('pii').get()
    );
  });

  it('4. guest อ่านเอกสารแปลงที่อนุมัติแล้วใน farms/{id} -> allow', async () => {
    const guestDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(guestDb.collection('farms').doc(ALICE_FARM_ID).get());
  });

  it('5. สมาชิก A แก้เอกสาร members ของสมาชิก B -> deny', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    await assertFails(
      aliceDb.collection('members').doc(BOB_MEM_ID).update({
        fullName: 'ชื่อถูกแอบแก้โดยอลิซ',
      })
    );
  });

  it('6. สมาชิก A แก้ status ของตัวเองเป็น approved -> deny', async () => {
    const bobDb = testEnv.authenticatedContext(BOB_UID, { role: 'member' }).firestore();
    await assertFails(
      bobDb.collection('members').doc(BOB_MEM_ID).update({
        status: 'approved',
      })
    );
  });

  it('7. สมัครใหม่โดยส่ง status: "approved" มาด้วย -> deny', async () => {
    const guestDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      guestDb.collection('members').doc('mem-new-001').set({
        fullName: 'สมาชิกใหม่แอบอนุมัติตนเอง',
        role: 'member',
        status: 'approved',
      })
    );
  });

  it('8. สมาชิกอ่านและแก้ members/{ตัวเอง}/private/pii ได้ -> allow', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    // สมาชิกอ่าน PII ตนเอง
    await assertSucceeds(
      aliceDb.collection('members').doc(ALICE_MEM_ID).collection('private').doc('pii').get()
    );
    // สมาชิกแก้ PII ตนเอง
    await assertSucceeds(
      aliceDb.collection('members').doc(ALICE_MEM_ID).collection('private').doc('pii').update({
        phone: '0899999999',
      })
    );
  });

  it('9. สมาชิกแก้เอกสารแปลงของตัวเอง (เปลี่ยนเรื่องเล่า เพิ่มรูป) -> allow', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    await assertSucceeds(
      aliceDb.collection('farms').doc(ALICE_FARM_ID).update({
        story: 'อัปเดตเรื่องเล่าใหม่ของแปลงอลิซ',
        photos: ['https://example.com/alice1.jpg', 'https://example.com/alice2.jpg'],
      })
    );
  });

  it('10. สมาชิกอ่าน farms/{แปลงตัวเอง}/private/contact -> allow', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    await assertSucceeds(
      aliceDb.collection('farms').doc(ALICE_FARM_ID).collection('private').doc('contact').get()
    );
  });

  it('11. สมาชิก A แก้แปลงของสมาชิก B -> deny', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    await assertFails(
      aliceDb.collection('farms').doc(BOB_FARM_ID).update({
        story: 'แปลงบ็อบถูกแก้โดยอลิซ',
      })
    );
  });

  it('12. สมาชิก A แก้หรือลบ product ของสมาชิก B -> deny (EXPECTED TO FAIL ON CURRENT RULES)', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    // อลิซพยายามแก้ราคาสินค้าของบ็อบ
    await assertFails(
      aliceDb.collection('products').doc(BOB_PROD_ID).update({
        price: 9999,
      })
    );
    // อลิซพยายามลบสินค้าของบ็อบ
    await assertFails(
      aliceDb.collection('products').doc(BOB_PROD_ID).delete()
    );
  });

  it('13. สมาชิกแก้ product ของตัวเอง -> allow', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    await assertSucceeds(
      aliceDb.collection('products').doc(ALICE_PROD_ID).update({
        price: 95,
      })
    );
  });

  it('14. client เขียน auditLogs ตรง -> deny', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    await assertFails(
      aliceDb.collection('auditLogs').doc('fake-log-id').set({
        action: 'fake_action',
        timestamp: new Date().toISOString(),
      })
    );
  });

  it('15. แอดมิน (custom claim role: "admin") อนุมัติสมาชิก -> allow', async () => {
    const adminDb = testEnv.authenticatedContext(ADMIN_UID, { role: 'admin', admin: true }).firestore();
    await assertSucceeds(
      adminDb.collection('members').doc(BOB_MEM_ID).update({
        status: 'approved',
      })
    );
  });

  it('16. เขียนลง collection ที่ไม่มีในกฎ เช่น randomCollection -> deny', async () => {
    const aliceDb = testEnv.authenticatedContext(ALICE_UID, { role: 'member' }).firestore();
    await assertFails(
      aliceDb.collection('randomCollection').doc('doc-001').set({
        unauthorizedData: true,
      })
    );
  });
});
