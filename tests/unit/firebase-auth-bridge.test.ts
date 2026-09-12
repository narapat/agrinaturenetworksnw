import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { formatPrivateKey, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';
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

    it('should assign role=admin for whitelisted admin LINE User IDs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_ADMIN_1111',
          name: 'นายกสิกรรม นครสวรรค์',
          picture: 'https://profile.line-scdn.net/abc',
        }),
      } as Response);

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
    });

    it('should assign role=member for regular LINE User IDs', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'U_REGULAR_FARMER_9999',
          name: 'สมหวัง ปลูกผัก',
          picture: 'https://profile.line-scdn.net/somwang',
        }),
      } as Response);

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
