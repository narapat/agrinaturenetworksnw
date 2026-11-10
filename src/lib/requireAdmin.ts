import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken, type AdminAuthMethod } from './adminSession';
import { getAdminLineUserIds, getBearerToken, verifyLineIdToken } from './lineIdToken';

/**
 * Server-only: ตรวจสิทธิ์แอดมินสำหรับ Admin API routes
 *
 * ยอมรับ 2 ทาง:
 * 1. Authorization: Bearer <LINE_ID_TOKEN> ที่ LINE ยืนยันแล้ว และ sub อยู่ใน ADMIN_LINE_USER_IDS
 * 2. Admin session cookie (HMAC) จาก /api/admin/auth
 *    - method 'line': ตรวจซ้ำว่า lineUserId ยังอยู่ใน Whitelist (ถอดสิทธิ์มีผลทันที)
 *    - method 'passcode': ทางสำรอง อายุสั้น
 *
 * `requireLine: true` ใช้กับการกระทำที่ย้อนกลับไม่ได้ (ลบถาวร, ลบพร้อมโยกย้าย)
 * เพราะ passcode เป็นความลับใช้ร่วมกัน ระบุตัวคนกดไม่ได้
 */

export interface AdminActor {
  method: AdminAuthMethod;
  lineUserId: string | null;
  name: string;
}

export type RequireAdminResult =
  | { ok: true; actor: AdminActor }
  | { ok: false; response: NextResponse };

const deny = (status: number, message: string): RequireAdminResult => ({
  ok: false,
  response: NextResponse.json({ success: false, message }, { status }),
});

export async function requireAdmin(
  req: NextRequest,
  opts: { requireLine?: boolean } = {}
): Promise<RequireAdminResult> {
  const whitelist = getAdminLineUserIds();
  let actor: AdminActor | null = null;

  // 1. LINE ID Token (Bearer)
  const idToken = getBearerToken(req.headers);
  if (idToken && whitelist.length > 0) {
    const result = await verifyLineIdToken(idToken);
    if (result.ok && whitelist.includes(result.sub)) {
      actor = { method: 'line', lineUserId: result.sub, name: result.name || 'แอดมิน (LINE)' };
    } else if (!result.ok && result.status === 500) {
      console.error('[requireAdmin] LINE token verification unavailable:', result.reason);
    }
  }

  // 2. Admin session cookie
  if (!actor) {
    const session = verifyAdminSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
    if (session) {
      if (session.method === 'line') {
        if (session.lineUserId && whitelist.includes(session.lineUserId)) {
          actor = { method: 'line', lineUserId: session.lineUserId, name: session.actorName || 'แอดมิน (LINE)' };
        }
      } else {
        actor = { method: 'passcode', lineUserId: null, name: session.actorName || 'แอดมิน (passcode)' };
      }
    }
  }

  if (!actor) {
    return deny(401, 'ต้องเข้าสู่ระบบแอดมินก่อน');
  }

  if (opts.requireLine && actor.method !== 'line') {
    return deny(
      403,
      'การกระทำนี้ย้อนกลับไม่ได้ ต้องเข้าสู่ระบบแอดมินด้วย LINE (การเข้าด้วยรหัสผ่านสำรองทำได้เฉพาะงานประจำวัน)'
    );
  }

  return { ok: true, actor };
}
