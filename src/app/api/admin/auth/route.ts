import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  ADMIN_COOKIE_NAME,
  adminCookieOptions,
  createAdminSessionToken,
  sessionDurationFor,
  verifyAdminSessionToken,
  type AdminAuthMethod,
} from '@/lib/adminSession';
import { getAdminLineUserIds, getBearerToken, verifyLineIdToken } from '@/lib/lineIdToken';
import { getAdminDb } from '@/lib/firebaseAdmin';
import {
  checkPasscodeLock,
  clearPasscodeFailures,
  getClientIp,
  recordPasscodeFailure,
} from '@/lib/passcodeRateLimit';

export const dynamic = 'force-dynamic';

const MAX_ACTOR_NAME = 60;

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
async function verifyAdminLineToken(req: NextRequest): Promise<{ sub: string; name?: string } | null> {
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
  return adminLineIds.includes(result.sub) ? { sub: result.sub, name: result.name } : null;
}

function issueSession(
  response: NextResponse,
  method: AdminAuthMethod,
  opts: { lineUserId?: string; actorName?: string }
): NextResponse {
  const now = Date.now();
  const duration = sessionDurationFor(method);
  const token = createAdminSessionToken({
    role: 'admin',
    issuedAt: now,
    expiresAt: now + duration,
    method,
    lineUserId: opts.lineUserId,
    actorName: opts.actorName,
  });
  response.cookies.set(adminCookieOptions(token, Math.floor(duration / 1000)));
  return response;
}

/**
 * POST /api/admin/auth
 * ยืนยันสิทธิ์แอดมินด้วย
 *  (1) LINE ID Token ที่ยืนยันแล้วและอยู่ใน Whitelist → session 7 วัน
 *  (2) Passcode (ทางสำรอง) + ชื่อผู้ดำเนินการ → session 3 ชั่วโมง, มีการล็อกเมื่อเดาผิดซ้ำ
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { passcode, actorName } = (body || {}) as { passcode?: unknown; actorName?: unknown };

    // ตรวจ config ให้ครบก่อน (Fail loudly ถ้า env ไม่ครบ)
    const validPasscode = getAdminPasscode();

    // 1. LINE ID Token (ยืนยันกับ LINE Server)
    const lineAdmin = await verifyAdminLineToken(req);
    if (lineAdmin) {
      return issueSession(
        NextResponse.json({ success: true, message: 'ยืนยันสิทธิ์แอดมินสำเร็จ', role: 'admin', method: 'line' }),
        'line',
        { lineUserId: lineAdmin.sub, actorName: lineAdmin.name }
      );
    }

    // 2. Passcode (ทางสำรอง)
    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านแอดมินไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง' },
        { status: 401 }
      );
    }

    const cleanName = typeof actorName === 'string' ? actorName.trim().slice(0, MAX_ACTOR_NAME) : '';
    if (!cleanName) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกชื่อผู้ดำเนินการ (ใช้บันทึกในประวัติการทำงาน)' },
        { status: 400 }
      );
    }

    // กัน brute force: ต้องมีที่เก็บตัวนับ ไม่มี = ไม่เปิดให้เดา (Fail closed)
    const db = getAdminDb();
    if (!db) {
      console.error('[Admin Auth] Firebase Admin SDK unavailable: passcode login disabled (rate limit storage missing).');
      return NextResponse.json(
        { success: false, message: 'Server configuration error: ระบบรหัสผ่านสำรองไม่พร้อมใช้งาน' },
        { status: 500 }
      );
    }

    const ip = getClientIp(req.headers);
    const lock = await checkPasscodeLock(db, ip);
    if (lock.locked) {
      const minutes = Math.ceil(lock.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          success: false,
          locked: true,
          message:
            lock.scope === 'global'
              ? `มีการใส่รหัสผ่านผิดหลายครั้ง ระบบปิดการเข้าด้วยรหัสผ่านชั่วคราว ${minutes} นาที (ยังเข้าด้วย LINE ได้)`
              : `ใส่รหัสผ่านผิดหลายครั้ง กรุณารอ ${minutes} นาทีแล้วลองใหม่`,
        },
        { status: 429, headers: { 'Retry-After': String(lock.retryAfterSeconds) } }
      );
    }

    const inputBuffer = Buffer.from(passcode.trim());
    const validBuffer = Buffer.from(validPasscode.trim());
    const matches = inputBuffer.length === validBuffer.length && crypto.timingSafeEqual(inputBuffer, validBuffer);

    if (!matches) {
      await recordPasscodeFailure(db, ip);
      return NextResponse.json(
        { success: false, message: 'รหัสผ่านแอดมินไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง' },
        { status: 401 }
      );
    }

    await clearPasscodeFailures(db, ip);
    return issueSession(
      NextResponse.json({ success: true, message: 'ยืนยันสิทธิ์แอดมินสำเร็จ', role: 'admin', method: 'passcode' }),
      'passcode',
      { actorName: cleanName }
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
    const sessionStillValid =
      session && (session.method === 'passcode' || (session.lineUserId && getAdminLineUserIds().includes(session.lineUserId)));
    if (session && sessionStillValid) {
      return NextResponse.json({
        authenticated: true,
        role: session.role,
        method: session.method,
        actorName: session.actorName,
        expiresAt: session.expiresAt,
      });
    }

    // 2. LINE ID Token ที่ยืนยันกับ LINE Server แล้ว (ไม่รับ lineUserId จาก query string)
    const lineAdmin = await verifyAdminLineToken(req);
    if (lineAdmin) {
      return issueSession(
        NextResponse.json({
          authenticated: true,
          role: 'admin',
          method: 'line',
          actorName: lineAdmin.name,
          autoVerified: true,
        }),
        'line',
        { lineUserId: lineAdmin.sub, actorName: lineAdmin.name }
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
