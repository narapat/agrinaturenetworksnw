import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const getLineChannelId = (): string => {
  if (process.env.LINE_CHANNEL_ID) {
    return process.env.LINE_CHANNEL_ID.trim();
  }
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || process.env.LIFF_ID || '2011512009-Zjd5Loph';
  if (liffId.includes('-')) {
    return liffId.split('-')[0].trim();
  }
  return '';
};

/**
 * POST /api/member/register
 * 
 * รับข้อมูลการสมัครสมาชิกและแปลงกสิกรรมธรรมชาติ:
 * 1. ยืนยันตัวตนด้วย LINE ID Token ผ่าน Authorization Header (Bearer)
 * 2. บังคับ ownerUid = token.sub (ห้ามเชื่อ body)
 * 3. บังคับ status = 'pending', role = 'member', server timestamp
 * 4. ตรวจสอบความถูกต้องและทำความสะอาดข้อมูลทีละฟิลด์
 * 5. บันทึกด้วย Atomic Batch Write 4 เอกสาร (members, members/private/pii, farms, farms/private/contact)
 * 6. รองรับ Idempotency ด้วย requestId
 * 7. หาก Admin SDK หรือฐานข้อมูลไม่พร้อม ตอบ 500 ทันที (ห้าม silent fallback ตอบ success)
 */
export async function POST(req: NextRequest) {
  let currentOwnerUid: string | undefined;
  try {
    // 1. ตรวจสอบ Authorization Header (Bearer LINE ID Token)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: ต้องระบุ Authorization header แบบ Bearer <LINE_ID_TOKEN>' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: ไม่พบ ID Token' },
        { status: 401 }
      );
    }

    const channelId = getLineChannelId();
    if (!channelId) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: LINE Channel ID is not configured' },
        { status: 500 }
      );
    }

    // 2. ยืนยัน Token กับ LINE OAuth2 API
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: channelId,
      }).toString(),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { success: false, error: 'LINE ID Token ไม่ถูกต้องหรือหมดอายุ' },
        { status: 401 }
      );
    }

    const tokenPayload = await verifyRes.json();
    const ownerUid = tokenPayload?.sub;
    if (!ownerUid || typeof ownerUid !== 'string' || !ownerUid.trim()) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ sub (LINE User ID) ใน Token' },
        { status: 401 }
      );
    }
    currentOwnerUid = ownerUid;

    // 3. ตรวจสอบ Body และ Validate & Sanitize Input
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลคำขอไม่ถูกต้อง (Invalid JSON)' },
        { status: 400 }
      );
    }

    const {
      requestId,
      fullName,
      farmName,
      tagline,
      story,
      district,
      subdistrict,
      phone,
      lineId,
      trainingCourse,
      trainingLocation,
      isPublicPhone,
      isPublicLine,
      practices,
      photos,
      facePhotoUrl,
      coordinates,
    } = body;

    const cleanFullName = typeof fullName === 'string' ? fullName.trim().slice(0, 100) : '';
    const cleanFarmName = typeof farmName === 'string' ? farmName.trim().slice(0, 100) : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim().replace(/[^\d+\-, ]/g, '').slice(0, 20) : '';
    const digitsOnly = cleanPhone.replace(/[^\d]/g, '');

    if (cleanFullName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุชื่อ-นามสกุล หรือชื่อเรียกให้ถูกต้อง (อย่างน้อย 2 ตัวอักษร)' },
        { status: 400 }
      );
    }

    if (cleanFarmName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุชื่อแปลง / สวน / ศูนย์เรียนรู้ (อย่างน้อย 2 ตัวอักษร)' },
        { status: 400 }
      );
    }

    if (digitsOnly.length < 9 || digitsOnly.length > 10) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง (เช่น 081-234-5678)' },
        { status: 400 }
      );
    }

    // 4. ตรวจสอบความพร้อมของ Admin SDK (ห้าม silent fallback)
    const db = getAdminDb();
    if (!db) {
      console.error('[Register API] Firebase Admin DB is not configured or unavailable');
      return NextResponse.json(
        { success: false, error: 'ระบบฐานข้อมูลเซิร์ฟเวอร์ขัดข้องชั่วคราว กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 500 }
      );
    }

    const cleanRequestId = typeof requestId === 'string' && requestId.trim() ? requestId.trim().slice(0, 120) : '';
    const cleanDistrict = typeof district === 'string' && district.trim() ? district.trim().slice(0, 50) : 'เมืองนครสวรรค์';
    const cleanSubdistrict = typeof subdistrict === 'string' && subdistrict.trim() ? subdistrict.trim().slice(0, 50) : 'เมือง';
    const cleanTagline = typeof tagline === 'string' && tagline.trim() ? tagline.trim().slice(0, 120) : 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง';
    const cleanStory = typeof story === 'string' && story.trim() ? story.trim().slice(0, 1000) : 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์';
    const cleanLineId = typeof lineId === 'string' && lineId.trim() ? lineId.trim().slice(0, 50) : '';
    const cleanTrainingCourse = typeof trainingCourse === 'string' ? trainingCourse.trim().slice(0, 150) : '';
    const cleanTrainingLocation = typeof trainingLocation === 'string' ? trainingLocation.trim().slice(0, 150) : '';
    const cleanIsPublicPhone = Boolean(isPublicPhone);
    const cleanIsPublicLine = isPublicLine !== undefined ? Boolean(isPublicLine) : false;

    const cleanPractices = Array.isArray(practices)
      ? practices.filter((p): p is string => typeof p === 'string').map((p) => p.trim().slice(0, 50)).slice(0, 20)
      : ['กสิกรรมธรรมชาติ', 'ไร้สารเคมี 100%'];

    const cleanPhotos = Array.isArray(photos)
      ? photos.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).slice(0, 10)
      : ['https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop'];

    const cleanFacePhotoUrl = typeof facePhotoUrl === 'string' && facePhotoUrl.trim()
      ? facePhotoUrl.trim()
      : (tokenPayload.picture || '');

    // 5. Idempotency Check ด้วย requestId
    if (cleanRequestId) {
      const idempDoc = await db.collection('idempotency').doc(cleanRequestId).get();
      if (idempDoc.exists) {
        const idempData = idempDoc.data();
        return NextResponse.json({
          success: true,
          idempotent: true,
          memberId: idempData?.memberId,
          farmId: idempData?.farmId,
          message: 'ใบสมัครนี้ได้รับการบันทึกเรียบร้อยแล้ว',
        });
      }
    }

    // 6. ตรวจสอบ Guard Document registrations/{ownerUid} เพื่อป้องกันการสมัครซ้ำ (Task A)
    const registrationRef = db.collection('registrations').doc(ownerUid);
    const existingRegSnap = await registrationRef.get();
    if (existingRegSnap.exists) {
      const regData = existingRegSnap.data();
      const existingMemberId = regData?.memberId || '';
      let existingStatus = regData?.status || 'pending';
      if (existingMemberId) {
        try {
          const memDoc = await db.collection('members').doc(existingMemberId).get();
          if (memDoc.exists) {
            existingStatus = memDoc.data()?.status || existingStatus;
          }
        } catch {}
      }

      let thaiStatusMsg = 'ท่านได้ลงทะเบียนเข้าร่วมเครือข่ายไว้เรียบร้อยแล้ว ขณะนี้ใบสมัครของท่านอยู่ระหว่างรอการตรวจสอบและอนุมัติจากแอดมินเครือข่ายครับ';
      if (existingStatus === 'approved') {
        thaiStatusMsg = 'บัญชีของท่านได้รับการอนุมัติเป็นสมาชิกเครือข่ายเรียบร้อยแล้ว ท่านสามารถเข้าสู่ระบบเพื่อจัดการข้อมูลแปลงได้ทันทีครับ';
      } else if (existingStatus === 'rejected') {
        thaiStatusMsg = 'ใบสมัครของท่านไม่ผ่านการอนุมัติ กรุณาติดต่อผู้ประสานงานเครือข่ายเพื่อตรวจสอบข้อมูลเพิ่มเติมครับ';
      }

      return NextResponse.json(
        {
          success: false,
          code: 'DUPLICATE_REGISTRATION',
          memberId: existingMemberId,
          farmId: regData?.farmId,
          status: existingStatus,
          message: thaiStatusMsg,
        },
        { status: 409 }
      );
    }

    // 7. พิกัดจริง (internalCoordinates) และ โซนสาธารณะ (publicZone)
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

    // 8. เตรียม IDs และ วันที่จาก Server
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const memberId = `mem-${timestamp}-${randomSuffix}`;
    const farmId = `farm-${timestamp}-${randomSuffix}`;
    const nowIso = new Date().toISOString();
    const createdDateOnly = nowIso.split('T')[0];

    // 9. ประกอบเอกสารตาม Anti-Scam & Ownership Guarantee
    // 9.1 members/{memberId} (Public)
    const memberDoc = {
      id: memberId,
      ownerUid: ownerUid,
      lineUserId: ownerUid,
      fullName: cleanFullName,
      role: 'member',           // บังคับโดยเซิร์ฟเวอร์
      roles: ['member'],
      status: 'pending',         // บังคับเริ่มต้นเป็น pending เสมอ
      farmId: farmId,
      farmName: cleanFarmName,
      facePhotoUrl: cleanFacePhotoUrl,
      createdAt: createdDateOnly,
      updatedAt: nowIso,
      delegationStatus: 'none',
      fontSizePref: 'normal',
    };

    // 9.2 members/{memberId}/private/pii (PII ป้องกันข้อมูลรั่วไหล)
    const memberPiiDoc = {
      ownerUid: ownerUid,
      phone: cleanPhone,
      lineId: cleanLineId,
      lineUserId: ownerUid,
      facePhotoUrl: cleanFacePhotoUrl,
      trainingCourse: cleanTrainingCourse,
      trainingLocation: cleanTrainingLocation,
      isPublicPhone: cleanIsPublicPhone,
      isPublicLine: cleanIsPublicLine,
      updatedAt: nowIso,
    };

    // 9.3 farms/{farmId} (Public)
    const farmDoc = {
      id: farmId,
      memberId: memberId,
      ownerUid: ownerUid,
      ownerName: cleanFullName,
      farmName: cleanFarmName,
      status: 'pending',         // บังคับเริ่มต้นเป็น pending เสมอ
      tagline: cleanTagline,
      story: cleanStory,
      photos: cleanPhotos,
      district: cleanDistrict,
      subdistrict: cleanSubdistrict,
      publicZone: publicZone,
      practices: cleanPractices.length > 0 ? cleanPractices : ['กสิกรรมธรรมชาติ', 'ไร้สารเคมี 100%'],
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

    // 9.4 farms/{farmId}/private/contact (GPS จริงและเบอร์โทรส่วนตัว)
    const farmContactDoc = {
      ownerUid: ownerUid,
      internalCoordinates: internalCoordinates,
      phone: cleanPhone,
      lineId: cleanLineId,
      updatedAt: nowIso,
    };

    // 9.5 Audit Log
    const logId = `log-${timestamp}-${randomSuffix}`;
    const auditDoc = {
      id: logId,
      timestamp: nowIso,
      action: 'register_member',
      actorRole: 'member',
      actorName: cleanFullName,
      targetId: memberId,
      details: `สมัครสมาชิกแปลงกสิกรรมธรรมชาติ: ${cleanFullName} (แปลง: ${cleanFarmName})`,
      metadata: { farmId, district: cleanDistrict },
      ip: req.headers.get('x-forwarded-for') || 'local',
      userAgent: req.headers.get('user-agent') || 'unknown',
    };

    // 10. Atomic Batch Write (สำเร็จทั้งหมด หรือ ล้มเหลวทั้งหมด)
    const batch = db.batch();

    const memberRef = db.collection('members').doc(memberId);
    const memberPiiRef = memberRef.collection('private').doc('pii');
    const farmRef = db.collection('farms').doc(farmId);
    const farmContactRef = farmRef.collection('private').doc('contact');
    const auditRef = db.collection('auditLogs').doc(logId);

    batch.set(memberRef, memberDoc);
    batch.set(memberPiiRef, memberPiiDoc);
    batch.set(farmRef, farmDoc);
    batch.set(farmContactRef, farmContactDoc);
    batch.set(auditRef, auditDoc);

    // Guard document: registrations/{ownerUid} (Atomic create to guarantee no duplicate registration)
    batch.create(registrationRef, {
      ownerUid: ownerUid,
      memberId: memberId,
      farmId: farmId,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (cleanRequestId) {
      const idempRef = db.collection('idempotency').doc(cleanRequestId);
      batch.set(idempRef, {
        requestId: cleanRequestId,
        ownerUid: ownerUid,
        memberId: memberId,
        farmId: farmId,
        createdAt: nowIso,
      });
    }

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        member: memberDoc,
        farm: farmDoc,
        message: 'ลงทะเบียนสำเร็จเรียบร้อย อยู่ระหว่างรอการตรวจสอบและอนุมัติจากแอดมินเครือข่าย',
      },
      { status: 201 }
    );
  } catch (err: any) {
    // ป้องกัน Race Condition ชนซ้ำใน batch.create(registrationRef)
    if (
      err?.code === 6 ||
      err?.message?.includes('ALREADY_EXISTS') ||
      err?.message?.includes('already exists')
    ) {
      try {
        const db = getAdminDb();
        if (db && currentOwnerUid) {
          const regDoc = await db.collection('registrations').doc(currentOwnerUid).get();
          if (regDoc.exists) {
            const regData = regDoc.data();
            const existingMemberId = regData?.memberId || '';
            let existingStatus = regData?.status || 'pending';
            if (existingMemberId) {
              const memDoc = await db.collection('members').doc(existingMemberId).get();
              if (memDoc.exists) {
                existingStatus = memDoc.data()?.status || existingStatus;
              }
            }

            let thaiStatusMsg = 'ท่านได้ลงทะเบียนเข้าร่วมเครือข่ายไว้เรียบร้อยแล้ว ขณะนี้ใบสมัครของท่านอยู่ระหว่างรอการตรวจสอบและอนุมัติจากแอดมินเครือข่ายครับ';
            if (existingStatus === 'approved') {
              thaiStatusMsg = 'บัญชีของท่านได้รับการอนุมัติเป็นสมาชิกเครือข่ายเรียบร้อยแล้ว ท่านสามารถเข้าสู่ระบบเพื่อจัดการข้อมูลแปลงได้ทันทีครับ';
            } else if (existingStatus === 'rejected') {
              thaiStatusMsg = 'ใบสมัครของท่านไม่ผ่านการอนุมัติ กรุณาติดต่อผู้ประสานงานเครือข่ายเพื่อตรวจสอบข้อมูลเพิ่มเติมครับ';
            }

            return NextResponse.json(
              {
                success: false,
                code: 'DUPLICATE_REGISTRATION',
                memberId: existingMemberId,
                farmId: regData?.farmId,
                status: existingStatus,
                message: thaiStatusMsg,
              },
              { status: 409 }
            );
          }
        }
      } catch {}
    }

    console.error('[Register API Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการลงทะเบียน กรุณาลองใหม่อีกครั้ง',
      },
      { status: 500 }
    );
  }
}
