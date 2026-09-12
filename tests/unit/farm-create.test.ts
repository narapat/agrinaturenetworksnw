import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as farmCreatePOST } from '@/app/api/farm/create/route';
import * as firebaseAdmin from '@/lib/firebaseAdmin';

describe('Server Farm Creation API (POST /api/farm/create) Tests', () => {
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
      const req = new NextRequest('http://localhost:3000/api/farm/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: 'mem-123', farmName: 'สวนพอใจ' }),
      });

      const res = await farmCreatePOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should return 401 when LINE OAuth rejects token', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_token' }),
      } as Response);

      const req = new NextRequest('http://localhost:3000/api/farm/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid.token',
        },
        body: JSON.stringify({ memberId: 'mem-123', farmName: 'สวนพอใจ' }),
      });

      const res = await farmCreatePOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });

  describe('2. Validation & Member Ownership Verification', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'U_LEGIT_OWNER_123',
          name: 'สมชาย',
        }),
      } as Response);
    });

    it('should return 400 when farmName is missing or too short', async () => {
      const req = new NextRequest('http://localhost:3000/api/farm/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.token',
        },
        body: JSON.stringify({ memberId: 'mem-123', farmName: 'a' }),
      });

      const res = await farmCreatePOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('ชื่อแปลง');
    });

    it('should return 404 when target member document does not exist', async () => {
      const mockDb = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(async () => ({ exists: false })),
          })),
        })),
      };
      vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(mockDb as any);

      const req = new NextRequest('http://localhost:3000/api/farm/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.token',
        },
        body: JSON.stringify({ memberId: 'mem-non-existent', farmName: 'สวนพอใจ' }),
      });

      const res = await farmCreatePOST(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('ไม่พบข้อมูลสมาชิก');
    });

    it('should return 403 Forbidden when member ownerUid does not match token sub', async () => {
      const mockDb = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(async () => ({
              exists: true,
              data: () => ({ id: 'mem-123', ownerUid: 'DIFFERENT_VICTIM_UID' }),
            })),
          })),
        })),
      };
      vi.spyOn(firebaseAdmin, 'getAdminDb').mockReturnValue(mockDb as any);

      const req = new NextRequest('http://localhost:3000/api/farm/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.token',
        },
        body: JSON.stringify({ memberId: 'mem-123', farmName: 'สวนพอใจ' }),
      });

      const res = await farmCreatePOST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('ไม่มีสิทธิ์');
    });
  });

  describe('3. Atomic Batch Creation & Invariants', () => {
    it('should write farms, farms/private/contact, and update member in single batch', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'U_LEGIT_OWNER_123',
          name: 'สมชาย เจ้าของตัวจริง',
        }),
      } as Response);

      const mockBatchWrites: { action: string; path: string; data?: any }[] = [];
      const mockBatch = {
        set: vi.fn((ref: any, data: any) => {
          mockBatchWrites.push({ action: 'set', path: ref.path, data });
        }),
        update: vi.fn((ref: any, data: any) => {
          mockBatchWrites.push({ action: 'update', path: ref.path, data });
        }),
        commit: vi.fn(async () => {}),
      };

      const mockDoc = (docPath: string) => ({
        path: docPath,
        get: vi.fn(async () => ({
          exists: true,
          data: () => ({
            id: 'mem-legit-123',
            fullName: 'สมชาย ชาวสวน',
            ownerUid: 'U_LEGIT_OWNER_123',
          }),
        })),
        collection: (subName: string) => mockCollection(`${docPath}/${subName}`),
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

      const req = new NextRequest('http://localhost:3000/api/farm/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid.token',
        },
        body: JSON.stringify({
          memberId: 'mem-legit-123',
          farmName: 'สวนเกษตรสมชาย',
          district: 'ท่าตะโก',
          subdistrict: 'ดอนคา',
          phone: '089-999-8888',
        }),
      });

      const res = await farmCreatePOST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.farm.status).toBe('pending');
      expect(data.farm.ownerUid).toBe('U_LEGIT_OWNER_123');

      // Verify batch commit was called
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      // Verify atomic operations
      expect(mockBatchWrites.some((w) => w.path.startsWith('farms/farm-') && !w.path.includes('/private/'))).toBe(true);
      expect(mockBatchWrites.some((w) => w.path.includes('/private/contact'))).toBe(true);
      expect(mockBatchWrites.some((w) => w.path === 'members/mem-legit-123' && w.action === 'update')).toBe(true);
      expect(mockBatchWrites.some((w) => w.path.startsWith('auditLogs/log-'))).toBe(true);
    });
  });
});
