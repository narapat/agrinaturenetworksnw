import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerPOST } from '@/app/api/member/register/route';
import * as firebaseAdmin from '@/lib/firebaseAdmin';

describe('Server Registration API (POST /api/member/register) Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_LIFF_ID: '2011512009-Zjd5Loph',
      LINE_CHANNEL_ID: '2011512009',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Authentication & Token Verification', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'สมชาย ใจดี', farmName: 'สวนพอใจ', phone: '0812345678' }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authorization');
    });

    it('should return 401 when Authorization header is not Bearer token', async () => {
      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic invalid-token',
        },
        body: JSON.stringify({ fullName: 'สมชาย ใจดี', farmName: 'สวนพอใจ', phone: '0812345678' }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should return 401 when LINE OAuth API rejects the ID Token', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_request', error_description: 'IdToken expired or invalid' }),
      } as Response);

      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid.line.token',
        },
        body: JSON.stringify({ fullName: 'สมชาย ใจดี', farmName: 'สวนพอใจ', phone: '0812345678' }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('ไม่ถูกต้องหรือหมดอายุ');
    });

    it('should return 401 when LINE OAuth response does not contain sub (LINE user ID)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: 'Non-UID User' }),
      } as Response);

      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.but.no.sub.token',
        },
        body: JSON.stringify({ fullName: 'สมชาย ใจดี', farmName: 'สวนพอใจ', phone: '0812345678' }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('sub');
    });
  });

  describe('2. Input Validation & Anti-Tampering', () => {
    beforeEach(() => {
      // Mock valid LINE token verification returning ownerUid = U_VERIFIED_FARMER_123
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'U_VERIFIED_FARMER_123',
          name: 'สมชาย เกษตรกร',
          picture: 'https://profile.line-scdn.net/avatar.jpg',
        }),
      } as Response);
    });

    it('should return 400 when fullName is too short', async () => {
      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.line.token',
        },
        body: JSON.stringify({ fullName: 'ก', farmName: 'สวนพอใจ', phone: '0812345678' }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('ชื่อ-นามสกุล');
    });

    it('should return 400 when farmName is too short', async () => {
      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.line.token',
        },
        body: JSON.stringify({ fullName: 'สมชาย ใจดี', farmName: 'x', phone: '0812345678' }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('ชื่อแปลง');
    });

    it('should return 400 when phone number is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.line.token',
        },
        body: JSON.stringify({ fullName: 'สมชาย ใจดี', farmName: 'สวนพอใจ', phone: '123' }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('เบอร์โทรศัพท์');
    });
  });

  describe('3. Database Availability & Zero Silent Fallback (Commandment 7)', () => {
    it('should return 500 error when Firebase Admin DB is not configured or unavailable', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_VERIFIED_FARMER_123',
          name: 'สมชาย เกษตรกร',
        }),
      } as Response);

      // Force getAdminDb to return null
      vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(null);

      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.line.token',
        },
        body: JSON.stringify({
          fullName: 'สมชาย ใจดี',
          farmName: 'สวนพอใจ',
          phone: '0812345678',
        }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('ฐานข้อมูลเซิร์ฟเวอร์ขัดข้องชั่วคราว');
    });
  });

  describe('4. Atomic Batch Write & Invariants Enforcement', () => {
    it('should force ownerUid from token.sub, force status=pending, role=member, and commit atomic batch', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_GENUINE_LINE_UID_999',
          name: 'นายกสิกรรม นครสวรรค์',
          picture: 'https://profile.line-scdn.net/avatar.jpg',
        }),
      } as Response);

      const mockBatchWrites: { refPath: string; data: any }[] = [];
      const mockBatch = {
        set: vi.fn((docRef: any, data: any) => {
          mockBatchWrites.push({ refPath: docRef.path, data });
        }),
        create: vi.fn((docRef: any, data: any) => {
          mockBatchWrites.push({ refPath: docRef.path, data });
        }),
        commit: vi.fn(async () => {}),
      };

      const mockDoc = (path: string) => ({
        path,
        get: vi.fn(async () => ({ exists: false })),
        collection: (subName: string) => mockCollection(`${path}/${subName}`),
      });

      const mockCollection = (colPath: string): any => ({
        path: colPath,
        doc: (docId: string) => mockDoc(`${colPath}/${docId}`),
      });

      const mockDb = {
        collection: (name: string) => mockCollection(name),
        batch: () => mockBatch,
      };

      vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(mockDb as any);

      // Attempt to tamper with body by sending fake ownerUid, status: 'approved', role: 'admin'
      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.line.token',
        },
        body: JSON.stringify({
          fullName: 'สมชาย กสิกรรม',
          farmName: 'ไร่รื่นรมย์ นครสวรรค์',
          phone: '081-234-5678',
          ownerUid: 'ATTACKER_INJECTED_FAKE_UID',
          status: 'approved',
          role: 'admin',
          district: 'หนองบัว',
          subdistrict: 'หนองกลับ',
          requestId: 'req-test-unique-123',
        }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(201);
      const resJson = await res.json();
      expect(resJson.success).toBe(true);
      expect(resJson.member.status).toBe('pending');
      expect(resJson.member.role).toBe('member');
      expect(resJson.member.ownerUid).toBe('U_GENUINE_LINE_UID_999');

      // Verify batch commit was called
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      // Verify all 4 core documents + audit + idempotency + registrations guard were prepared in the batch
      const writtenPaths = mockBatchWrites.map((w) => w.refPath);
      expect(writtenPaths.some((p) => p.startsWith('members/mem-'))).toBe(true);
      expect(writtenPaths.some((p) => p.includes('/private/pii'))).toBe(true);
      expect(writtenPaths.some((p) => p.startsWith('farms/farm-'))).toBe(true);
      expect(writtenPaths.some((p) => p.includes('/private/contact'))).toBe(true);
      expect(writtenPaths.some((p) => p.startsWith('auditLogs/log-'))).toBe(true);
      expect(writtenPaths.some((p) => p === 'idempotency/req-test-unique-123')).toBe(true);
      expect(writtenPaths.some((p) => p === 'registrations/U_GENUINE_LINE_UID_999')).toBe(true);

      // Verify registrations guard doc invariants
      const regWrite = mockBatchWrites.find((w) => w.refPath === 'registrations/U_GENUINE_LINE_UID_999');
      expect(regWrite?.data.ownerUid).toBe('U_GENUINE_LINE_UID_999');
      expect(regWrite?.data.status).toBe('pending');
      expect(regWrite?.data.memberId).toBe(resJson.member.id);
      expect(regWrite?.data.farmId).toBe(resJson.farm.id);

      // Verify member doc invariants
      const memberWrite = mockBatchWrites.find((w) => w.refPath.startsWith('members/mem-') && !w.refPath.includes('/private/'));
      expect(memberWrite?.data.ownerUid).toBe('U_GENUINE_LINE_UID_999');
      expect(memberWrite?.data.status).toBe('pending');
      expect(memberWrite?.data.role).toBe('member');

      // Verify farm doc invariants
      const farmWrite = mockBatchWrites.find((w) => w.refPath.startsWith('farms/farm-') && !w.refPath.includes('/private/'));
      expect(farmWrite?.data.ownerUid).toBe('U_GENUINE_LINE_UID_999');
      expect(farmWrite?.data.status).toBe('pending');

      // Verify PII subdocument contains sensitive phone and LINE
      const piiWrite = mockBatchWrites.find((w) => w.refPath.includes('members/') && w.refPath.includes('/private/pii'));
      expect(piiWrite?.data.ownerUid).toBe('U_GENUINE_LINE_UID_999');
      expect(piiWrite?.data.phone).toBe('081-234-5678');

      // Verify contact subdocument contains sensitive phone
      const contactWrite = mockBatchWrites.find((w) => w.refPath.includes('farms/') && w.refPath.includes('/private/contact'));
      expect(contactWrite?.data.ownerUid).toBe('U_GENUINE_LINE_UID_999');
      expect(contactWrite?.data.phone).toBe('081-234-5678');
    });

    it('should return 409 Conflict when registrations/{ownerUid} already exists (duplicate registration prevention)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_ALREADY_REGISTERED_USER',
          name: 'เกษตรกร สมหวัง',
        }),
      } as Response);

      const mockBatch = {
        set: vi.fn(),
        create: vi.fn(),
        commit: vi.fn(async () => {}),
      };

      const mockDb = {
        collection: vi.fn((colName: string) => {
          if (colName === 'registrations') {
            return {
              doc: vi.fn((uid: string) => ({
                get: vi.fn(async () => ({
                  exists: true,
                  data: () => ({
                    ownerUid: uid,
                    memberId: 'mem-already-101',
                    farmId: 'farm-already-101',
                    status: 'pending',
                  }),
                })),
              })),
            };
          }
          if (colName === 'members') {
            return {
              doc: vi.fn((id: string) => ({
                get: vi.fn(async () => ({
                  exists: true,
                  data: () => ({
                    id,
                    status: 'pending',
                    fullName: 'เกษตรกร สมหวัง',
                  }),
                })),
              })),
            };
          }
          return {
            doc: vi.fn(() => ({ get: vi.fn(async () => ({ exists: false })) })),
          };
        }),
        batch: () => mockBatch,
      };

      vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(mockDb as any);

      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.line.token',
        },
        body: JSON.stringify({
          fullName: 'เกษตรกร สมหวัง',
          farmName: 'สวนเกษตรสมหวัง',
          phone: '089-999-8888',
        }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('DUPLICATE_REGISTRATION');
      expect(data.memberId).toBe('mem-already-101');
      expect(data.farmId).toBe('farm-already-101');
      expect(data.status).toBe('pending');
      expect(data.message).toContain('ท่านได้ลงทะเบียนเข้าร่วมเครือข่ายไว้เรียบร้อยแล้ว');

      // Crucial: batch.commit must NOT be called when registration already exists
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should catch ALREADY_EXISTS race condition on batch.commit and return 409 Conflict', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_RACE_CONDITION_USER',
          name: 'เกษตรกร สายฟ้า',
        }),
      } as Response);

      let getCallCount = 0;
      const mockBatch = {
        set: vi.fn(),
        create: vi.fn(),
        commit: vi.fn(async () => {
          const err: any = new Error('Document ALREADY_EXISTS');
          err.code = 6;
          throw err;
        }),
      };

      const mockDoc = (path: string) => ({
        path,
        get: vi.fn(async () => {
          if (path.startsWith('registrations/')) {
            getCallCount++;
            if (getCallCount === 1) {
              return { exists: false, data: () => null };
            }
            return {
              exists: true,
              data: () => ({
                ownerUid: 'U_RACE_CONDITION_USER',
                memberId: 'mem-race-winner-99',
                farmId: 'farm-race-winner-99',
                status: 'pending',
              }),
            };
          }
          if (path === 'members/mem-race-winner-99') {
            return {
              exists: true,
              data: () => ({ id: 'mem-race-winner-99', status: 'pending' }),
            };
          }
          return { exists: false, data: () => null };
        }),
        collection: (subName: string) => mockCollection(`${path}/${subName}`),
      });

      const mockCollection = (colPath: string): any => ({
        path: colPath,
        doc: (docId: string) => mockDoc(`${colPath}/${docId}`),
      });

      const mockDb = {
        collection: (name: string) => mockCollection(name),
        batch: () => mockBatch,
      };

      vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(mockDb as any);

      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.line.token',
        },
        body: JSON.stringify({
          fullName: 'เกษตรกร สายฟ้า',
          farmName: 'สวนสายฟ้าแลบ',
          phone: '081-111-2222',
        }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('DUPLICATE_REGISTRATION');
      expect(data.memberId).toBe('mem-race-winner-99');
      expect(data.status).toBe('pending');
    });

    it('should return idempotent success when identical requestId is re-sent without double-writing', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_GENUINE_LINE_UID_999',
          name: 'นายกสิกรรม นครสวรรค์',
        }),
      } as Response);

      const mockBatch = {
        set: vi.fn(),
        create: vi.fn(),
        commit: vi.fn(async () => {}),
      };

      const mockDb = {
        collection: vi.fn((colName: string) => {
          if (colName === 'idempotency') {
            return {
              doc: vi.fn((docId: string) => ({
                get: vi.fn(async () => ({
                  exists: true,
                  data: () => ({
                    requestId: 'req-already-processed-456',
                    memberId: 'mem-existing-1',
                    farmId: 'farm-existing-1',
                  }),
                })),
              })),
            };
          }
          return {
            doc: vi.fn(() => ({ get: vi.fn(async () => ({ exists: false })) })),
          };
        }),
        batch: () => mockBatch,
      };

      vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(mockDb as any);

      const req = new NextRequest('http://localhost:3000/api/member/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.line.token',
        },
        body: JSON.stringify({
          fullName: 'สมชาย กสิกรรม',
          farmName: 'ไร่รื่นรมย์ นครสวรรค์',
          phone: '081-234-5678',
          requestId: 'req-already-processed-456',
        }),
      });

      const res = await registerPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.idempotent).toBe(true);
      expect(data.memberId).toBe('mem-existing-1');
      expect(data.farmId).toBe('farm-existing-1');

      // Crucial: batch.commit must NOT be called when idempotent
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });
});
