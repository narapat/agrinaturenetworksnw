import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = 'nsw_admin_auth_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 วัน

// Secret สำหรับ HMAC Signing บน Server เท่านั้น (Client จะมองไม่เห็น 100%)
const getSecret = (): string => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('Server configuration error: ADMIN_SESSION_SECRET is not configured');
  }
  return secret;
};

const getAdminPasscode = (): string => {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) {
    throw new Error('Server configuration error: ADMIN_PASSCODE is not configured');
  }
  return passcode;
};

const getAdminLineUserIds = (): string[] => {
  const raw = process.env.ADMIN_LINE_USER_IDS || '';
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

interface SessionPayload {
  role: 'admin';
  expiresAt: number;
  lineUserId?: string;
  issuedAt: number;
}

/**
 * สร้าง Signed Session Token ด้วย HMAC-SHA256
 */
function createSignedToken(payload: SessionPayload): string {
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(serialized)
    .digest('base64url');
  return `${serialized}.${signature}`;
}

/**
 * ตรวจสอบความถูกต้องของ Signed Session Token
 */
function verifySignedToken(token: string): { valid: boolean; payload?: SessionPayload } {
  if (!token || !token.includes('.')) return { valid: false };

  const [serialized, signature] = token.split('.');
  if (!serialized || !signature) return { valid: false };

  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(serialized)
    .digest('base64url');

  // ใช้ timingSafeEqual เพื่อป้องกัน Timing Attack
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf-8')) as SessionPayload;
    if (!payload.expiresAt || Date.now() > payload.expiresAt) {
      return { valid: false }; // หมดอายุ
    }
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * POST /api/admin/auth
 * ยืนยันรหัสผ่านแอดมิน หรือตรวจ LINE User ID Whitelist บนเซิร์ฟเวอร์
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { passcode, lineUserId } = body;

    let isAuthorized = false;

    // 1. ตรวจสอบผ่าน LINE User ID Whitelist (ถ้ามี)
    const adminLineIds = getAdminLineUserIds();
    if (lineUserId && adminLineIds.length > 0 && adminLineIds.includes(lineUserId.trim())) {
      isAuthorized = true;
    }

    // 2. ตรวจสอบผ่าน Passcode
    const validPasscode = getAdminPasscode();
    if (!isAuthorized && passcode && typeof passcode === 'string') {
      const inputBuffer = Buffer.from(passcode.trim());
      const validBuffer = Buffer.from(validPasscode.trim());
      if (inputBuffer.length === validBuffer.length && crypto.timingSafeEqual(inputBuffer, validBuffer)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านแอดมินไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง' },
        { status: 401 }
      );
    }

    // สร้าง Session Token
    const payload: SessionPayload = {
      role: 'admin',
      expiresAt: Date.now() + SESSION_DURATION_MS,
      lineUserId: lineUserId || undefined,
      issuedAt: Date.now(),
    };
    const signedToken = createSignedToken(payload);

    const response = NextResponse.json({
      success: true,
      message: 'ยืนยันสิทธิ์แอดมินสำเร็จ',
      role: 'admin',
    });

    // กำหนด HTTP-Only Cookie ป้องกัน JavaScript ขโมยหรือดักจับ Token
    response.cookies.set({
      name: COOKIE_NAME,
      value: signedToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    });

    return response;
  } catch (err: any) {
    console.error('Server Admin Auth Error:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth
 * ตรวจสอบสถานะการยืนยันตัวตนแอดมินจาก HTTP-Only Cookie หรือ LINE Whitelist
 */
export async function GET(req: NextRequest) {
  try {
    // 1. ตรวจสอบจาก HTTP-Only Cookie
    const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
    if (cookieToken) {
      const { valid, payload } = verifySignedToken(cookieToken);
      if (valid && payload) {
        return NextResponse.json({
          authenticated: true,
          role: payload.role,
          lineUserId: payload.lineUserId,
        });
      }
    }

    // 2. ตรวจสอบว่า query param มี lineUserId ตรงกับ Whitelist หรือไม่
    const { searchParams } = new URL(req.url);
    const lineUserId = searchParams.get('lineUserId');
    const adminLineIds = getAdminLineUserIds();
    if (lineUserId && adminLineIds.length > 0 && adminLineIds.includes(lineUserId.trim())) {
      const payload: SessionPayload = {
        role: 'admin',
        expiresAt: Date.now() + SESSION_DURATION_MS,
        lineUserId: lineUserId.trim(),
        issuedAt: Date.now(),
      };
      const signedToken = createSignedToken(payload);

      const response = NextResponse.json({
        authenticated: true,
        role: 'admin',
        autoVerified: true,
      });

      response.cookies.set({
        name: COOKIE_NAME,
        value: signedToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: Math.floor(SESSION_DURATION_MS / 1000),
      });

      return response;
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (err: any) {
    console.error('Server Admin Verify Error:', err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/auth
 * ออกจากระบบและล้าง HTTP-Only Cookie
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'ออกจากระบบแอดมินเรียบร้อยแล้ว',
  });

  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
