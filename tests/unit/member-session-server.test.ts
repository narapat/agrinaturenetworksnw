import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import * as firebaseAdminAuth from '@/lib/firebaseAdminAuth';
import { POST as authLinePOST } from '@/app/api/auth/line/route';
import { GET as sessionGET, DELETE as sessionDELETE } from '@/app/api/auth/session/route';
import {
  MEMBER_COOKIE_NAME,
  MEMBER_SESSION_MS,
  createMemberSessionToken,
  verifyMemberSessionToken,
} from '@/lib/memberSession';
import { createAdminSessionToken, verifyAdminSessionToken } from '@/lib/adminSession';

/**
 * Session ของสมาชิกอยู่ที่เซิร์ฟเวอร์ (HTTP-Only cookie มีวันหมดอายุ) ไม่ใช่ใน localStorage
 */
describe('Member session (server)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ADMIN_SESSION_SECRET: 'test-hmac-sha256-super-secret-key-32chars',
      ADMIN_LINE_USER_IDS: 'U_ADMIN_1111',
      LINE_CHANNEL_ID: '2011512009',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const reqWithCookie = (token?: string) =>
    new NextRequest('http://localhost:3000/api/auth/session', {
      headers: token ? { cookie: `${MEMBER_COOKIE_NAME}=${token}` } : {},
    });

  describe('token', () => {
    it('round-trips a valid token', () => {
      const { token } = createMemberSessionToken('U_FARMER');
      expect(verifyMemberSessionToken(token)?.sub).toBe('U_FARMER');
    });

    it('rejects a tampered token (someone edits the LINE user id)', () => {
      const { token } = createMemberSessionToken('U_FARMER');
      const [, sig] = token.split('.');
      const forged = Buffer.from(
        JSON.stringify({ kind: 'member', sub: 'U_VICTIM', issuedAt: Date.now(), expiresAt: Date.now() + 1000 })
      ).toString('base64url');
      expect(verifyMemberSessionToken(`${forged}.${sig}`)).toBeNull();
    });

    it('expires after 7 days', () => {
      const { token } = createMemberSessionToken('U_FARMER', Date.now() - MEMBER_SESSION_MS - 1000);
      expect(verifyMemberSessionToken(token)).toBeNull();
    });

    it('rejects a token signed with a lifetime longer than policy', () => {
      const now = Date.now();
      const payload = { kind: 'member', sub: 'U_FARMER', issuedAt: now, expiresAt: now + MEMBER_SESSION_MS * 10 };
      const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const sig = crypto
        .createHmac('sha256', process.env.ADMIN_SESSION_SECRET!)
        .update(`member:${serialized}`)
        .digest('base64url');
      expect(verifyMemberSessionToken(`${serialized}.${sig}`)).toBeNull();
    });

    it('member and admin tokens cannot be swapped for each other', () => {
      const now = Date.now();
      const admin = createAdminSessionToken({ role: 'admin', method: 'line', issuedAt: now, expiresAt: now + 1000, lineUserId: 'U_ADMIN_1111' });
      expect(verifyMemberSessionToken(admin)).toBeNull();
      const { token: member } = createMemberSessionToken('U_FARMER');
      expect(verifyAdminSessionToken(member)).toBeNull();
    });
  });

  describe('GET / DELETE /api/auth/session', () => {
    it('401 without a cookie', async () => {
      const res = await sessionGET(reqWithCookie());
      expect(res.status).toBe(401);
      expect((await res.json()).authenticated).toBe(false);
    });

    it('returns the verified LINE user id for a valid cookie', async () => {
      const { token } = createMemberSessionToken('U_FARMER');
      const res = await sessionGET(reqWithCookie(token));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ authenticated: true, lineUserId: 'U_FARMER' });
    });

    it('401 for an expired cookie', async () => {
      const { token } = createMemberSessionToken('U_FARMER', Date.now() - MEMBER_SESSION_MS - 1000);
      expect((await sessionGET(reqWithCookie(token))).status).toBe(401);
    });

    it('500 (not 401) when the server cannot check sessions, so clients do not log people out', async () => {
      const { token } = createMemberSessionToken('U_FARMER');
      delete process.env.ADMIN_SESSION_SECRET;
      expect((await sessionGET(reqWithCookie(token))).status).toBe(500);
    });

    it('DELETE clears the cookie', async () => {
      const res = await sessionDELETE();
      const setCookie = res.headers.get('set-cookie') || '';
      expect(setCookie).toContain(`${MEMBER_COOKIE_NAME}=;`);
      expect(setCookie.toLowerCase()).toContain('max-age=0');
      expect(setCookie.toLowerCase()).toContain('httponly');
    });
  });

  describe('POST /api/auth/line issues the session cookie', () => {
    const lineReq = () =>
      new NextRequest('http://localhost:3000/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid.jwt' }),
      });

    const sessionFrom = (res: Response) => {
      const match = (res.headers.get('set-cookie') || '').match(new RegExp(`${MEMBER_COOKIE_NAME}=([^;]+)`));
      return match ? verifyMemberSessionToken(match[1]) : null;
    };

    it('sets a cookie for the LINE user verified by LINE', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 'U_FARMER', name: 'ชาวนา' }) } as Response);
      vi.spyOn(firebaseAdminAuth, 'getAdminAuth').mockReturnValue({ createCustomToken: vi.fn(async () => 'tok') } as any);
      const res = await authLinePOST(lineReq());
      expect(res.status).toBe(200);
      expect(sessionFrom(res)?.sub).toBe('U_FARMER');
    });

    it('still sets the cookie when Firebase Admin is unavailable (identity was verified by LINE)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 'U_FARMER' }) } as Response);
      vi.spyOn(firebaseAdminAuth, 'getAdminAuth').mockReturnValue(null);
      const res = await authLinePOST(lineReq());
      expect(res.status).toBe(500);
      expect(sessionFrom(res)?.sub).toBe('U_FARMER');
    });

    it('no cookie when LINE rejects the token', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) } as Response);
      const res = await authLinePOST(lineReq());
      expect(res.status).toBe(401);
      expect(res.headers.get('set-cookie')).toBeNull();
    });
  });
});
