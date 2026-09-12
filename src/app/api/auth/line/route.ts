import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';

const getAdminLineUserIds = (): string[] => {
  const raw = process.env.ADMIN_LINE_USER_IDS || '';
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

const getLineChannelId = (): string => {
  if (process.env.LINE_CHANNEL_ID) {
    return process.env.LINE_CHANNEL_ID.trim();
  }
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';
  if (liffId.includes('-')) {
    return liffId.split('-')[0].trim();
  }
  return '';
};

/**
 * POST /api/auth/line
 * รับ LINE ID Token จาก Client -> ตรวจสอบกับ LINE API -> สร้าง Firebase Custom Token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { success: false, message: 'กรุณาระบุ idToken' },
        { status: 400 }
      );
    }

    const channelId = getLineChannelId();
    if (!channelId) {
      return NextResponse.json(
        { success: false, message: 'Server configuration error: LINE Channel ID could not be determined' },
        { status: 500 }
      );
    }

    // 1. ตรวจสอบ ID Token กับ LINE OAuth2 API
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        id_token: idToken.trim(),
        client_id: channelId,
      }).toString(),
    });

    if (!verifyRes.ok) {
      const errorData = await verifyRes.json().catch(() => ({}));
      console.warn('[LINE Auth] ID Token verification failed:', errorData);
      return NextResponse.json(
        { success: false, message: 'LINE ID Token ไม่ถูกต้อง หรือหมดอายุแล้ว', error: errorData },
        { status: 401 }
      );
    }

    const lineProfile = await verifyRes.json();
    const lineUserId = lineProfile.sub; // LINE User ID ที่แน่นอนและเชื่อถือได้จาก LINE Server

    if (!lineUserId) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบ LINE User ID จาก Token' },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบสิทธิ์ (Role / Custom Claims)
    const adminLineIds = getAdminLineUserIds();
    const isAdmin = adminLineIds.includes(lineUserId.trim());
    const role = isAdmin ? 'admin' : 'member';

    const customClaims = {
      role,
      admin: isAdmin,
      lineUserId,
    };

    // 3. ตรวจสอบว่ามี Firebase Admin Auth พร้อมใช้งานหรือไม่
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      // กรณียังไม่ได้ตั้งค่า Service Account ใน .env
      return NextResponse.json({
        success: true,
        customToken: null,
        configured: false,
        userId: lineUserId,
        displayName: lineProfile.name,
        pictureUrl: lineProfile.picture,
        role,
        message: 'Firebase Admin credentials not configured yet. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.',
      });
    }

    // 4. ออก Firebase Custom Token ด้วย Firebase Admin SDK
    const customToken = await adminAuth.createCustomToken(lineUserId, customClaims);

    return NextResponse.json({
      success: true,
      customToken,
      configured: true,
      userId: lineUserId,
      displayName: lineProfile.name,
      pictureUrl: lineProfile.picture,
      role,
    });
  } catch (err: any) {
    console.error('[LINE Auth Bridge Error]:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตน LINE' },
      { status: 500 }
    );
  }
}
