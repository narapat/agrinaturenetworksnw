import { NextRequest, NextResponse } from 'next/server';
import { resolveLineUser } from '@/lib/lineIdToken';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/farm/create
 * 
 * สร้างแปลงกสิกรรมธรรมชาติสำหรับสมาชิกเดิมที่ยังไม่มีแปลง:
 * 1. ยืนยันตัวตนด้วย LINE ID Token ผ่าน Authorization Header (Bearer)
 * 2. บังคับ ownerUid = token.sub
 * 3. ตรวจสอบว่า memberId เป็นของ ownerUid จริง
 * 4. บังคับ status = 'pending', server timestamp
 * 5. บันทึกด้วย Atomic Batch Write (farms, farms/private/contact, และ update members.farmId)
 * 6. หาก Admin SDK ไม่พร้อม ตอบ 500 ทันที
 */
export async function POST(req: NextRequest) {
  try {
    // 1-2. ตัวตนจาก LINE ID Token ที่ LINE ยืนยันแล้ว หรือ session cookie ของสมาชิก (ห้ามเชื่อ body)
    const identity = await resolveLineUser(req);
    if (!identity.ok) {
      return NextResponse.json({ success: false, error: identity.reason }, { status: identity.status });
    }
    const ownerUid = identity.sub;

    // 3. ตรวจสอบ Body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลคำขอไม่ถูกต้อง (Invalid JSON)' },
        { status: 400 }
      );
    }

    const {
      memberId,
      farmName,
      tagline,
      story,
      district,
      subdistrict,
      photos,
      practices,
      coordinates,
      phone,
      lineId,
      isPublicPhone,
      isPublicLine,
    } = body;

    const cleanMemberId = typeof memberId === 'string' ? memberId.trim() : '';
    const cleanFarmName = typeof farmName === 'string' ? farmName.trim().slice(0, 100) : '';

    if (!cleanMemberId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ memberId' },
        { status: 400 }
      );
    }

    if (cleanFarmName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุชื่อแปลง (อย่างน้อย 2 ตัวอักษร)' },
        { status: 400 }
      );
    }

    // 4. ตรวจสอบความพร้อมของ Admin SDK
    const db = getAdminDb();
    if (!db) {
      console.error('[Farm Create API] Firebase Admin DB is not configured or unavailable');
      return NextResponse.json(
        { success: false, error: 'ระบบฐานข้อมูลเซิร์ฟเวอร์ขัดข้องชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 500 }
      );
    }

    // 5. ตรวจสอบความเป็นเจ้าของบัญชี Member
    const memberRef = db.collection('members').doc(cleanMemberId);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลสมาชิกที่ระบุ' },
        { status: 404 }
      );
    }

    const memberData = memberSnap.data();
    if (memberData?.ownerUid !== ownerUid) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: คุณไม่มีสิทธิ์สร้างแปลงให้บัญชีสมาชิกนี้' },
        { status: 403 }
      );
    }

    // 6. เตรียมข้อมูลและพิกัด
    const cleanDistrict = typeof district === 'string' && district.trim() ? district.trim().slice(0, 50) : 'เมืองนครสวรรค์';
    const cleanSubdistrict = typeof subdistrict === 'string' && subdistrict.trim() ? subdistrict.trim().slice(0, 50) : 'เมือง';
    const cleanTagline = typeof tagline === 'string' && tagline.trim() ? tagline.trim().slice(0, 120) : 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง';
    const cleanStory = typeof story === 'string' && story.trim() ? story.trim().slice(0, 1000) : 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์';
    const cleanPhone = typeof phone === 'string' ? phone.trim().replace(/[^\d+\-, ]/g, '').slice(0, 20) : '';
    const cleanLineId = typeof lineId === 'string' && lineId.trim() ? lineId.trim().slice(0, 50) : '';
    const cleanIsPublicPhone = Boolean(isPublicPhone);
    const cleanIsPublicLine = isPublicLine !== undefined ? Boolean(isPublicLine) : false;

    const cleanPractices = Array.isArray(practices)
      ? practices.filter((p): p is string => typeof p === 'string').map((p) => p.trim().slice(0, 50)).slice(0, 20)
      : ['กสิกรรมธรรมชาติ', 'ไร้สารเคมี 100%'];

    const cleanPhotos = Array.isArray(photos)
      ? photos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).slice(0, 10)
      : ['https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop'];

    let internalCoordinates: { lat: number; lng: number } | null = null;
    if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
      internalCoordinates = {
        lat: Number(coordinates.lat),
        lng: Number(coordinates.lng),
      };
    }

    const approxLat = internalCoordinates
      ? Math.round(internalCoordinates.lat * 20) / 20 + 0.005
      : 15.7 + Math.random() * 0.2;
    const approxLng = internalCoordinates
      ? Math.round(internalCoordinates.lng * 20) / 20 + 0.005
      : 100.0 + Math.random() * 0.2;

    const publicZone = {
      name: `โซน ต.${cleanSubdistrict} อ.${cleanDistrict}`,
      approxLat,
      approxLng,
      radiusKm: 4.0,
    };

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const farmId = `farm-${timestamp}-${randomSuffix}`;
    const nowIso = new Date().toISOString();
    const createdDateOnly = nowIso.split('T')[0];

    const farmDoc = {
      id: farmId,
      memberId: cleanMemberId,
      ownerUid: ownerUid,
      ownerName: memberData?.fullName || 'สมาชิกเครือข่าย',
      farmName: cleanFarmName,
      status: 'pending',
      tagline: cleanTagline,
      story: cleanStory,
      photos: cleanPhotos,
      district: cleanDistrict,
      subdistrict: cleanSubdistrict,
      publicZone: publicZone,
      practices: cleanPractices,
      isPublicPhone: cleanIsPublicPhone,
      isPublicLine: cleanIsPublicLine,
      phone: cleanIsPublicPhone ? cleanPhone : '',
      lineId: cleanIsPublicLine && cleanLineId ? cleanLineId : '',
      socials: {
        lineId: cleanIsPublicLine && cleanLineId ? cleanLineId : '',
      },
      createdAt: createdDateOnly,
      updatedAt: nowIso,
    };

    const farmContactDoc = {
      ownerUid: ownerUid,
      internalCoordinates: internalCoordinates,
      phone: cleanPhone,
      lineId: cleanLineId,
      updatedAt: nowIso,
    };

    const logId = `log-${timestamp}-${randomSuffix}`;
    const auditDoc = {
      id: logId,
      timestamp: nowIso,
      action: 'create_farm',
      actorRole: 'member',
      actorName: memberData?.fullName || 'สมาชิกเครือข่าย',
      targetId: farmId,
      details: `สร้างแปลงใหม่: "${cleanFarmName}" (อ.${cleanDistrict} ต.${cleanSubdistrict})`,
      metadata: { memberId: cleanMemberId, district: cleanDistrict },
      ip: req.headers.get('x-forwarded-for') || 'local',
      userAgent: req.headers.get('user-agent') || 'unknown',
    };

    // 7. Atomic Batch Write
    const batch = db.batch();
    const farmRef = db.collection('farms').doc(farmId);
    const farmContactRef = farmRef.collection('private').doc('contact');
    const auditRef = db.collection('auditLogs').doc(logId);

    batch.set(farmRef, farmDoc);
    batch.set(farmContactRef, farmContactDoc);
    batch.update(memberRef, { farmId: farmId, farmName: cleanFarmName, updatedAt: nowIso });
    batch.set(auditRef, auditDoc);

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        farm: farmDoc,
        message: 'สร้างแปลงกสิกรรมสำเร็จ อยู่ระหว่างรอแอดมินเครือข่ายอนุมัติ',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Farm Create API Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการสร้างแปลง กรุณาลองใหม่อีกครั้ง',
      },
      { status: 500 }
    );
  }
}
