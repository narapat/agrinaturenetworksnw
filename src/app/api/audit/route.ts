import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export interface AuditLogPayload {
  action: string;
  actorRole: 'admin' | 'member' | 'guest';
  actorName: string;
  targetId?: string;
  details: string;
  metadata?: Record<string, any>;
}

/**
 * POST /api/audit
 * บันทึก Audit Log ผ่าน Firebase Admin SDK บน Server เท่านั้น (Client เขียนตรงไม่ได้ 100%)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, actorRole, actorName, targetId, details, metadata } = body as AuditLogPayload;

    if (!action || !details) {
      return NextResponse.json(
        { success: false, message: 'Invalid audit payload: action and details are required' },
        { status: 400 }
      );
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      actorRole: actorRole || 'member',
      actorName: actorName || 'Anonymous',
      targetId: targetId || null,
      details,
      metadata: metadata || {},
      ip: req.headers.get('x-forwarded-for') || 'local',
      userAgent: req.headers.get('user-agent') || 'unknown',
    };

    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection('auditLogs').doc(logEntry.id).set(logEntry);
      return NextResponse.json({ success: true, id: logEntry.id });
    }

    // หากยังไม่ได้กำหนด Service Account ในฝั่ง Server ให้ตอบรับและบันทึก log ทางคอนโซล
    console.log('[Audit Log - Server Local Fallback]:', JSON.stringify(logEntry));
    return NextResponse.json({ success: true, id: logEntry.id, fallback: true });
  } catch (err: any) {
    console.error('[Audit API Error]:', err);
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to record audit log' },
      { status: 500 }
    );
  }
}
