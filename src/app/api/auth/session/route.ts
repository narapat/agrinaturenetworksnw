import { NextRequest, NextResponse } from 'next/server';
import { MEMBER_COOKIE_NAME, memberCookieOptions, verifyMemberSessionToken } from '@/lib/memberSession';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/auth/session
 * บอก client ว่าเบราว์เซอร์นี้ยังล็อกอินอยู่หรือไม่ (ตาม cookie ที่เซิร์ฟเวอร์ออกให้)
 */
export async function GET(req: NextRequest) {
  try {
    const session = verifyMemberSessionToken(req.cookies.get(MEMBER_COOKIE_NAME)?.value);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: noStore });
    }
    return NextResponse.json(
      { authenticated: true, lineUserId: session.sub, expiresAt: session.expiresAt },
      { headers: noStore }
    );
  } catch (err) {
    // เช่น ยังไม่ได้ตั้ง ADMIN_SESSION_SECRET: ตอบ 500 ให้ client รู้ว่า "ตรวจไม่ได้" ไม่ใช่ "ไม่ได้ล็อกอิน"
    console.error('[Member Session] verify error:', err);
    return NextResponse.json({ authenticated: false, error: 'session_check_unavailable' }, { status: 500, headers: noStore });
  }
}

/**
 * DELETE /api/auth/session
 * ออกจากระบบ: ลบ cookie ของสมาชิก
 */
export async function DELETE() {
  const res = NextResponse.json({ success: true }, { headers: noStore });
  res.cookies.set(memberCookieOptions('', 0));
  return res;
}
