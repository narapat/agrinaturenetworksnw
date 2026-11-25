import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { getBearerToken, verifyLineIdToken } from '@/lib/lineIdToken';
import { LINK_CODES_COLLECTION, hashLinkToken, isUnlinkedMember, isWellFormedLinkToken } from '@/lib/memberLink';

export const dynamic = 'force-dynamic';

class LinkError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ success: false, code, message }, { status });

/**
 * POST /api/member/link
 * Authorization: Bearer <LINE ID Token>, body: { token }
 *
 * ผูกบัญชี LINE ของผู้เรียก (sub ที่ LINE ยืนยันแล้ว) เข้ากับสมาชิกเก่าที่แอดมินออกลิงก์ให้
 * ทำใน transaction เดียว: ลิงก์ใช้ได้ครั้งเดียว และตรวจซ้ำทุกเงื่อนไขก่อนเขียน
 * เขียน: members/{id} + private/pii, แปลงของสมาชิก + private/contact, ผลผลิตของแปลงเหล่านั้น,
 *        registrations/{sub} (กันสมัครซ้ำ), ทำเครื่องหมายลิงก์ว่าใช้แล้ว และ audit log
 */
export async function POST(req: NextRequest) {
  const idToken = getBearerToken(req.headers);
  if (!idToken) return fail(401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบด้วย LINE ก่อน');
  const verified = await verifyLineIdToken(idToken);
  if (!verified.ok) {
    return fail(verified.status, 'UNAUTHENTICATED', verified.status === 401 ? 'การเข้าสู่ระบบ LINE หมดอายุ กรุณาเข้าสู่ระบบใหม่' : 'ระบบยืนยันตัวตนขัดข้อง');
  }
  const sub = verified.sub;

  const body = await req.json().catch(() => null);
  const token = body?.token;
  if (!isWellFormedLinkToken(token)) return fail(400, 'INVALID_LINK', 'ลิงก์ผูกบัญชีไม่ถูกต้อง');

  const db = getAdminDb();
  if (!db) return fail(500, 'SERVER_NOT_READY', 'ฐานข้อมูลฝั่งเซิร์ฟเวอร์ไม่พร้อมใช้งาน');

  try {
    const result = await db.runTransaction(async (tx) => {
      // ---------- อ่านทั้งหมดก่อน (กติกาของ Firestore transaction) ----------
      const codeRef = db.collection(LINK_CODES_COLLECTION).doc(hashLinkToken(token));
      const codeSnap = await tx.get(codeRef);
      if (!codeSnap.exists) throw new LinkError(404, 'INVALID_LINK', 'ไม่พบลิงก์นี้ หรือแอดมินสร้างลิงก์ใหม่แทนแล้ว กรุณาขอลิงก์ใหม่จากแอดมิน');
      const code = codeSnap.data() as Record<string, any>;
      if (code.usedAt) throw new LinkError(410, 'LINK_USED', 'ลิงก์นี้ถูกใช้ไปแล้ว');
      if (!code.expiresAt || Date.now() > Number(code.expiresAt)) {
        throw new LinkError(410, 'LINK_EXPIRED', 'ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่จากแอดมิน');
      }

      const memberRef = db.collection('members').doc(String(code.memberId));
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists) throw new LinkError(404, 'MEMBER_GONE', 'ไม่พบข้อมูลสมาชิกแล้ว กรุณาติดต่อแอดมิน');
      const member: Record<string, any> = { ...(memberSnap.data() as Record<string, any>), id: memberSnap.id };
      if (!isUnlinkedMember(member)) {
        throw new LinkError(409, 'ALREADY_LINKED', 'บัญชีสมาชิกนี้ผูกกับ LINE แล้ว');
      }

      const [byOwner, byLine, regSnap] = await Promise.all([
        tx.get(db.collection('members').where('ownerUid', '==', sub)),
        tx.get(db.collection('members').where('lineUserId', '==', sub)),
        tx.get(db.collection('registrations').doc(sub)),
      ]);
      if (!byOwner.empty || !byLine.empty || regSnap.exists) {
        throw new LinkError(
          409,
          'LINE_IN_USE',
          'บัญชี LINE นี้เป็นสมาชิกหรือมีใบสมัครอยู่แล้ว ถ้าเคยกดสมัครใหม่ไว้ กรุณาแจ้งแอดมินให้ลบใบสมัครนั้นก่อน'
        );
      }

      const farmDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>();
      const farmsByMember = await tx.get(db.collection('farms').where('memberId', '==', member.id));
      farmsByMember.docs.forEach((d) => farmDocs.set(d.id, d));
      if (typeof member.farmId === 'string' && member.farmId && !farmDocs.has(member.farmId)) {
        const f = await tx.get(db.collection('farms').doc(member.farmId));
        if (f.exists) farmDocs.set(f.id, f);
      }
      const farms = Array.from(farmDocs.values());
      for (const f of farms) {
        const owner = f.data()?.ownerUid;
        if (owner && owner !== sub) throw new LinkError(409, 'FARM_OWNED', 'แปลงของบัญชีนี้มีเจ้าของ LINE คนอื่นอยู่แล้ว กรุณาติดต่อแอดมิน');
      }
      const products: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      for (const f of farms) {
        const snap = await tx.get(db.collection('products').where('farmId', '==', f.id));
        for (const p of snap.docs) {
          const owner = p.data()?.ownerUid;
          if (owner && owner !== sub) throw new LinkError(409, 'PRODUCT_OWNED', 'ผลผลิตของบัญชีนี้มีเจ้าของ LINE คนอื่นอยู่แล้ว กรุณาติดต่อแอดมิน');
          products.push(p);
        }
      }

      // ---------- เขียน ----------
      const nowIso = new Date().toISOString();
      tx.update(memberRef, { ownerUid: sub, lineUserId: sub, updatedAt: nowIso });
      tx.set(memberRef.collection('private').doc('pii'), { ownerUid: sub, lineUserId: sub, updatedAt: nowIso }, { merge: true });
      for (const f of farms) {
        tx.update(f.ref, { ownerUid: sub, updatedAt: nowIso });
        tx.set(f.ref.collection('private').doc('contact'), { ownerUid: sub, updatedAt: nowIso }, { merge: true });
      }
      for (const p of products) tx.update(p.ref, { ownerUid: sub });
      tx.set(db.collection('registrations').doc(sub), {
        ownerUid: sub,
        memberId: member.id,
        farmId: member.farmId || farms[0]?.id || '',
        status: member.status || 'approved',
        createdAt: nowIso,
        updatedAt: nowIso,
        linkedViaAdminLink: true,
      });
      tx.update(codeRef, { usedAt: nowIso, usedByLineUserId: sub });

      const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      tx.set(db.collection('auditLogs').doc(logId), {
        id: logId,
        timestamp: nowIso,
        action: 'member_link_line_account',
        actorRole: 'member',
        actorUid: sub,
        actorName: member.fullName || '-',
        targetId: member.id,
        targetMemberId: member.id,
        targetMemberName: member.fullName || '-',
        targetFarmName: farms.map((f) => f.data()?.farmName).filter(Boolean).join(', ') || '-',
        details: `${member.fullName || member.id} ผูกบัญชี LINE ผ่านลิงก์ที่แอดมิน ${code.createdByName || ''} สร้างให้`.trim(),
        metadata: { farmIds: farms.map((f) => f.id), productCount: products.length },
        ip: req.headers.get('x-forwarded-for') || 'local',
        userAgent: req.headers.get('user-agent') || 'unknown',
      });

      return { memberId: member.id, farmIds: farms.map((f) => f.id), productCount: products.length };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof LinkError) return fail(err.status, err.code, err.message);
    console.error('[Member Link Error]:', err);
    return fail(500, 'SERVER_ERROR', 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์ กรุณาลองใหม่');
  }
}
