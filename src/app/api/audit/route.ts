import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/adminSession';
import { getAdminLineUserIds, getBearerToken, verifyLineIdToken } from '@/lib/lineIdToken';

export const dynamic = 'force-dynamic';

/**
 * Payload ที่ client ส่งได้
 * หมายเหตุ: `actorRole` ที่ client ส่งมาจะถูกละเลย — server กำหนดเองจากตัวตนที่ยืนยันแล้ว
 */
export interface AuditLogPayload {
  action: string;
  actorName?: string;
  targetId?: string;
  details: string;
  metadata?: Record<string, any>;
}

type VerifiedActor = {
  actorRole: 'admin' | 'member';
  /** LINE User ID ที่ยืนยันแล้ว (null ถ้าแอดมินเข้าด้วย passcode อย่างเดียว) */
  actorUid: string | null;
  authMethod: 'admin_session' | 'line_id_token';
};

const MAX_ACTION = 64;
const MAX_DETAILS = 2000;
const MAX_NAME = 120;
const MAX_TARGET = 120;
const MAX_METADATA_BYTES = 4000;

/**
 * ยืนยันตัวตนผู้บันทึก log:
 * 1. LINE ID Token (Bearer) ที่ยืนยันกับ LINE Server แล้ว → role ตาม Whitelist แอดมิน
 * 2. Admin session cookie (HMAC) → role admin
 */
async function resolveActor(req: NextRequest): Promise<VerifiedActor | { error: string; status: 401 | 500 }> {
  const idToken = getBearerToken(req.headers);
  if (idToken) {
    const result = await verifyLineIdToken(idToken);
    if (!result.ok) {
      return { error: result.reason, status: result.status };
    }
    const isAdmin = getAdminLineUserIds().includes(result.sub);
    return { actorRole: isAdmin ? 'admin' : 'member', actorUid: result.sub, authMethod: 'line_id_token' };
  }

  const session = verifyAdminSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
  if (session) {
    return { actorRole: 'admin', actorUid: session.lineUserId || null, authMethod: 'admin_session' };
  }

  return { error: 'Unauthorized: ต้องยืนยันตัวตนด้วย LINE ID Token หรือ Admin session', status: 401 };
}

const clip = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

/**
 * POST /api/audit
 * บันทึก Audit Log ผ่าน Firebase Admin SDK บน Server เท่านั้น
 * - ต้องยืนยันตัวตน (ห้ามบันทึกแบบนิรนาม)
 * - actorRole / actorUid / authMethod มาจาก server เท่านั้น
 * - ถ้า Admin SDK ไม่พร้อม ตอบ 500 (Zero Silent Fallback)
 */
export async function POST(req: NextRequest) {
  try {
    const actor = await resolveActor(req);
    if ('error' in actor) {
      return NextResponse.json({ success: false, message: actor.error }, { status: actor.status });
    }

    const body = await req.json().catch(() => ({}));
    const { action, actorName, targetId, details, metadata } = (body || {}) as AuditLogPayload;

    const cleanAction = clip(action, MAX_ACTION);
    const cleanDetails = clip(details, MAX_DETAILS);
    if (!cleanAction || !cleanDetails) {
      return NextResponse.json(
        { success: false, message: 'Invalid audit payload: action and details are required' },
        { status: 400 }
      );
    }

    let cleanMetadata: Record<string, any> = {};
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      if (JSON.stringify(metadata).length > MAX_METADATA_BYTES) {
        return NextResponse.json(
          { success: false, message: 'Invalid audit payload: metadata too large' },
          { status: 400 }
        );
      }
      cleanMetadata = metadata;
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('[Audit API Error] Firebase Admin SDK is not configured. Audit log NOT recorded.');
      return NextResponse.json(
        { success: false, message: 'Server configuration error: Audit log storage is unavailable' },
        { status: 500 }
      );
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action: cleanAction,
      // ตัวตนที่ server ยืนยันแล้ว
      actorRole: actor.actorRole,
      actorUid: actor.actorUid,
      authMethod: actor.authMethod,
      // ชื่อที่แสดงผลซึ่ง client แจ้งมา (ไม่ได้ยืนยัน ใช้ actorUid เป็นหลักฐาน)
      actorName: clip(actorName, MAX_NAME) || 'ไม่ระบุชื่อ',
      targetId: clip(targetId, MAX_TARGET),
      details: cleanDetails,
      metadata: cleanMetadata,
      ip: req.headers.get('x-forwarded-for') || 'local',
      userAgent: req.headers.get('user-agent') || 'unknown',
    };

    await adminDb.collection('auditLogs').doc(logEntry.id).set(logEntry);
    return NextResponse.json({ success: true, id: logEntry.id });
  } catch (err: any) {
    console.error('[Audit API Error]:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to record audit log' },
      { status: 500 }
    );
  }
}
