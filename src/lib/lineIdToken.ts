/**
 * Server-only helper: ตรวจสอบ LINE ID Token กับ LINE OAuth2 API
 *
 * ใช้ใน Route Handlers (src/app/api/...) เท่านั้น
 * ห้ามเชื่อ LINE User ID ที่ client ส่งมาเป็นข้อความธรรมดา (body / query param)
 * ตัวตนต้องมาจาก `sub` ของ ID Token ที่ LINE ยืนยันแล้วเท่านั้น
 */

export const getLineChannelId = (): string => {
  if (process.env.LINE_CHANNEL_ID) {
    return process.env.LINE_CHANNEL_ID.trim();
  }
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || process.env.LIFF_ID || '2011512009-Zjd5Loph';
  if (liffId.includes('-')) {
    return liffId.split('-')[0].trim();
  }
  return '';
};

export const getAdminLineUserIds = (): string[] => {
  const raw = process.env.ADMIN_LINE_USER_IDS || '';
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};

export type LineTokenResult =
  | { ok: true; sub: string; name?: string }
  | { ok: false; status: 401 | 500; reason: string };

/**
 * ดึง Bearer token จาก Authorization header (คืน null ถ้าไม่มี)
 */
export function getBearerToken(headers: Headers): string | null {
  const authHeader = headers.get('Authorization') || headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  return token || null;
}

/**
 * ยืนยัน LINE ID Token กับ LINE Server แล้วคืน `sub` (LINE User ID) ที่เชื่อถือได้
 */
export async function verifyLineIdToken(idToken: string): Promise<LineTokenResult> {
  const channelId = getLineChannelId();
  if (!channelId) {
    return { ok: false, status: 500, reason: 'Server configuration error: LINE Channel ID is not configured' };
  }

  let verifyRes: Response;
  try {
    verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken.trim(), client_id: channelId }).toString(),
    });
  } catch (err: any) {
    return { ok: false, status: 500, reason: `LINE verify request failed: ${err?.message || err}` };
  }

  if (!verifyRes.ok) {
    return { ok: false, status: 401, reason: 'LINE ID Token ไม่ถูกต้องหรือหมดอายุ' };
  }

  const payload = await verifyRes.json().catch(() => null);
  const sub = payload?.sub;
  if (!sub || typeof sub !== 'string' || !sub.trim()) {
    return { ok: false, status: 401, reason: 'ไม่พบ sub (LINE User ID) ใน Token' };
  }

  return { ok: true, sub: sub.trim(), name: typeof payload?.name === 'string' ? payload.name : undefined };
}
