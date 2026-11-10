import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_DURATION_MS,
  adminCookieOptions,
  createAdminSessionToken,
  verifyAdminSessionToken,
  type AdminSessionPayload,
} from '@/lib/adminSession';
import { getAdminLineUserIds, getBearerToken, verifyLineIdToken } from '@/lib/lineIdToken';

export const dynamic = 'force-dynamic';

const getAdminPasscode = (): string => {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) {
    throw new Error('Server configuration error: ADMIN_PASSCODE is not configured');
  }
  return passcode;
};

/**
 * ตรวจสิทธิ์แอดมินผ่าน LINE ID Token (Authorization: Bearer <LINE_ID_TOKEN>)
 * - ตัวตนมาจาก `sub` ที่ LINE Server ยืนยันแล้วเท่านั้น
 * - ห้ามเชื่อ lineUserId ที่ส่งมาใน body หรือ query string (ไม่ใช่ความลับ อ่านได้จาก ownerUid สาธารณะ)
 */
async function verifyAdminLineToken(req: NextRequest): Promise<string | null> {
  const idToken = getBearerToken(req.headers);
  if (!idToken) return null;

  const adminLineIds = getAdminLineUserIds();
  if (adminLineIds.length === 0) return null;

  const result = await verifyLineIdToken(idToken);
  if (!result.ok) {
    if (result.status === 500) {
      console.error('[Admin Auth] LINE token verification unavailable:', result.reason);
    }
    return null;
  }
  return adminLineIds.includes(result.sub) ? result.sub : null;
}

function issueSession(
  response: NextResponse,
  method: AdminSessionPayload['method'],
  lineUserId?: string
): NextResponse {
  const now = Date.now();
  const token = createAdminSessionToken({
    role: 'admin',
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_DURATION_MS,
    lineUserId,
    method,
  });
  response.cookies.set(adminCookieOptions(token, Math.floor(ADMIN_SESSION_DURATION_MS / 1000)));
  return response;
}

/**
 * POST /api/admin/auth
 * ยืนยันสิทธิ์แอดมินด้วย (1) LINE ID Token ที่ยืนยันแล้วและอยู่ใน Whitelist หรือ (2) Passcode
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { passcode } = body as { passcode?: unknown };

    // ตรวจ config ให้ครบก่อน (Fail loudly ถ้า env ไม่ครบ)
    const validPasscode = getAdminPasscode();

    // 1. LINE ID Token (ยืนยันกับ LINE Server)
    const verifiedLineUserId = await verifyAdminLineToken(req);
    if (verifiedLineUserId) {
      return issueSession(
        NextResponse.json({ success: true, message: 'ยืนยันสิทธิ์แอดมินสำเร็จ', role: 'admin' }),
        'line',
        verifiedLineUserId
      );
    }

    // 2. Passcode
    if (passcode && typeof passcode === 'string') {
      const inputBuffer = Buffer.from(passcode.trim());
      const validBuffer = Buffer.from(validPasscode.trim());
      if (inputBuffer.length === validBuffer.length && crypto.timingSafeEqual(inputBuffer, validBuffer)) {
        return issueSession(
          NextResponse.json({ success: true, message: 'ยืนยันสิทธิ์แอดมินสำเร็จ', role: 'admin' }),
          'passcode'
        );
      }
    }

    return NextResponse.json(
      { success: false, message: 'รหัสผ่านแอดมินไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง' },
      { status: 401 }
    );
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
 * ตรวจสอบสถานะแอดมินจาก HTTP-Only Cookie
 * หรือออก session ใหม่ถ้าส่ง LINE ID Token (Bearer) ที่ยืนยันแล้วและอยู่ใน Whitelist
 */
export async function GET(req: NextRequest) {
  try {
    // 1. HTTP-Only Cookie
    const session = verifyAdminSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (session) {
      return NextResponse.json({
        authenticated: true,
        role: session.role,
        lineUserId: session.lineUserId,
      });
    }

    // 2. LINE ID Token ที่ยืนยันกับ LINE Server แล้ว (ไม่รับ lineUserId จาก query string)
    const verifiedLineUserId = await verifyAdminLineToken(req);
    if (verifiedLineUserId) {
      return issueSession(
        NextResponse.json({ authenticated: true, role: 'admin', autoVerified: true }),
        'line',
        verifiedLineUserId
      );
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
  response.cookies.set(adminCookieOptions('', 0));
  return response;
}
