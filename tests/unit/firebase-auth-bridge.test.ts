import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { formatPrivateKey, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';
import * as firebaseAdminAuth from '@/lib/firebaseAdminAuth';
import { POST as authLinePOST } from '@/app/api/auth/line/route';
import { POST as auditPOST } from '@/app/api/audit/route';

describe('Firebase Auth Bridge & Server Security Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_PASSCODE: 'test-admin-secret-passcode',
      ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars',
      ADMIN_LINE_USER_IDS: 'U_ADMIN_1111,U_ADMIN_2222',
      NEXT_PUBLIC_LIFF_ID: '2011512009-Zjd5Loph',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Private Key & Configuration Utilities', () => {
    it('formatPrivateKey should unescape \\n into real newline characters', () => {
      const escapedKey = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6\\n-----END PRIVATE KEY-----';
      const formatted = formatPrivateKey(escapedKey);
      expect(formatted).toContain('\n');
      expect(formatted).not.toContain('\\n');
    });

    it('formatPrivateKey should strip surrounding quotes', () => {
      const quotedKey = '"-----BEGIN PRIVATE KEY-----\\nMIIEvg==\\n-----END PRIVATE KEY-----"';
      const formatted = formatPrivateKey(quotedKey);
      expect(formatted?.startsWith('"')).toBe(false);
      expect(formatted?.endsWith('"')).toBe(false);
    });

    it('isFirebaseAdminConfigured should return false when credentials are not set', () => {
      delete process.env.FIREBASE_CLIENT_EMAIL;
      delete process.env.FIREBASE_PRIVATE_KEY;
      expect(isFirebaseAdminConfigured()).toBe(false);
    });

    it('isFirebaseAdminConfigured should return true when all 3 credentials are set', () => {
      process.env.FIREBASE_PROJECT_ID = 'test-agrinature';
      process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@test-agrinature.iam.gserviceaccount.com';
      process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nFAKE_KEY\\n-----END PRIVATE KEY-----';
      expect(isFirebaseAdminConfigured()).toBe(true);
    });
  });

  describe('2. POST /api/auth/line (LINE Auth Bridge)', () => {
    it('should return 400 when idToken is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await authLinePOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('idToken');
    });

    it('should return 401 when LINE API rejects the ID Token', async () => {
      // Mock global fetch for LINE verify endpoint
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'invalid_request', error_description: 'IdToken expired or invalid' }),
      } as Response);

      const req = new NextRequest('http://localhost:3000/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'invalid.jwt.token' }),
      });

      const res = await authLinePOST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('LINE ID Token ไม่ถูกต้อง');
    });

    it('should return 500 when getAdminAuth() returns null (Zero Silent Fallback)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_TEST_USER_123',
          name: 'สมหวัง ปลูกผัก',
          picture: 'https://profile.line-scdn.net/pic',
        }),
      } as Response);

      vi.spyOn(firebaseAdminAuth, 'getAdminAuth').mockReturnValue(null);

      const req = new NextRequest('http://localhost:3000/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid.token.but.no.admin' }),
      });

      const res = await authLinePOST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Firebase Admin Auth is not configured or unavailable');
      expect(data.customToken).toBeUndefined();
    });

    it('should assign role=admin and return customToken for whitelisted admin LINE User IDs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_ADMIN_1111',
          name: 'นายกสิกรรม นครสวรรค์',
          picture: 'https://profile.line-scdn.net/abc',
        }),
      } as Response);

      const mockCreateCustomToken = vi.fn(async (uid: string, claims: any) => {
        return `mock-custom-token-for-${uid}-${claims.role}`;
      });

      vi.spyOn(firebaseAdminAuth, 'getAdminAuth').mockReturnValue({
        createCustomToken: mockCreateCustomToken,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid.admin.jwt.token' }),
      });

      const res = await authLinePOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.role).toBe('admin');
      expect(data.userId).toBe('U_ADMIN_1111');
      expect(data.customToken).toBe('mock-custom-token-for-U_ADMIN_1111-admin');
      expect(mockCreateCustomToken).toHaveBeenCalledWith('U_ADMIN_1111', {
        role: 'admin',
        admin: true,
        lineUserId: 'U_ADMIN_1111',
      });
    });

    it('should assign role=member and return customToken for regular LINE User IDs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_REGULAR_FARMER_9999',
          name: 'สมหวัง ปลูกผัก',
          picture: 'https://profile.line-scdn.net/somwang',
        }),
      } as Response);

      const mockCreateCustomToken = vi.fn(async (uid: string, claims: any) => {
        return `mock-custom-token-for-${uid}-${claims.role}`;
      });

      vi.spyOn(firebaseAdminAuth, 'getAdminAuth').mockReturnValue({
        createCustomToken: mockCreateCustomToken,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid.member.jwt.token' }),
      });

      const res = await authLinePOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.role).toBe('member');
      expect(data.userId).toBe('U_REGULAR_FARMER_9999');
      expect(data.customToken).toBe('mock-custom-token-for-U_REGULAR_FARMER_9999-member');
      expect(mockCreateCustomToken).toHaveBeenCalledWith('U_REGULAR_FARMER_9999', {
        role: 'member',
        admin: false,
        lineUserId: 'U_REGULAR_FARMER_9999',
      });
    });

    it('should warn when falling back to LINE Channel ID from NEXT_PUBLIC_LIFF_ID', async () => {
      delete process.env.LINE_CHANNEL_ID;
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_WARN_TEST',
          name: 'ทดสอบ แจ้งเตือน',
        }),
      } as Response);

      vi.spyOn(firebaseAdminAuth, 'getAdminAuth').mockReturnValue({
        createCustomToken: vi.fn(async () => 'tok'),
      } as any);

      const req = new NextRequest('http://localhost:3000/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'token.for.warn' }),
      });

      await authLinePOST(req);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[LINE Auth Warning] LINE_CHANNEL_ID is not configured')
      );
    });
  });

  describe('3. POST /api/audit (Server-Only Audit Log)', () => {
    it('should reject invalid payloads without action or details', async () => {
      const req = new NextRequest('http://localhost:3000/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: '' }),
      });

      const res = await auditPOST(req);
      expect(res.status).toBe(400);
    });

    it('should accept valid audit payloads and return unique log ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_audit_event',
          actorRole: 'admin',
          actorName: 'แอดมินเครือข่าย',
          details: 'บันทึกการทดสอบระบบ Audit Log ผ่าน Server API',
        }),
      });

      const res = await auditPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.id).toMatch(/^log-\d+/);
    });
  });
});
