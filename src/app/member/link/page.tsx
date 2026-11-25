'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Link2, Loader2 } from 'lucide-react';
import { liffService, type LineUserProfile } from '@/services/liffService';
import { dataService } from '@/services/dataService';

type Phase = 'checking' | 'need_login' | 'ready' | 'linking' | 'done' | 'error';

/**
 * /member/link?t=<token>
 * สมาชิกเก่าที่ยังไม่เคยผูก LINE เปิดลิงก์ที่แอดมินส่งให้ แล้วเข้าสู่ระบบด้วย LINE ของตัวเองเพื่อผูกบัญชี
 * (ใช้ชื่อพารามิเตอร์ t ไม่ใช่ code เพราะ LINE Login ใช้ code ใน URL ตอนพากลับมา)
 */
function LinkAccount() {
  const params = useSearchParams();
  const token = params.get('t') || '';
  const [phase, setPhase] = useState<Phase>('checking');
  const [profile, setProfile] = useState<LineUserProfile | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setPhase('error');
      setMessage('ลิงก์ไม่ครบ กรุณาเปิดจากลิงก์ที่แอดมินส่งให้อีกครั้ง');
      return;
    }
    liffService.init().then(() => {
      if (cancelled) return;
      try {
        sessionStorage.removeItem('nsw_auth_redirect');
      } catch {}
      if (liffService.isLoggedIn() && liffService.getIdToken()) {
        setProfile(liffService.getProfile());
        setPhase('ready');
      } else {
        setPhase('need_login');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleLogin = () => {
    liffService.login(`/member/link?t=${encodeURIComponent(token)}`);
  };

  const handleLink = useCallback(async () => {
    const idToken = liffService.getIdToken();
    if (!idToken) {
      setPhase('need_login');
      return;
    }
    setPhase('linking');
    try {
      const res = await fetch('/api/member/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setPhase('error');
        setMessage(data.message || 'ผูกบัญชีไม่สำเร็จ กรุณาลองใหม่');
        return;
      }
      // ผูกแล้ว: ดึงข้อมูลล่าสุดและเข้าสู่ระบบในฐานะสมาชิกเดิม (ผู้ใช้กดยืนยันเอง จึงล้างสถานะ "ออกจากระบบ" ที่อาจค้างอยู่)
      try {
        localStorage.removeItem('nsw_user_logged_out');
        sessionStorage.removeItem('nsw_user_logged_out');
      } catch {}
      const lineProfile = liffService.getProfile();
      if (lineProfile) {
        await dataService.ensureFirestoreSync(true);
        await dataService.loginWithLineProfileAsync(lineProfile);
      }
      setPhase('done');
    } catch {
      setPhase('error');
      setMessage('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    }
  }, [token]);

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center">
          <Link2 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">ผูกบัญชี LINE กับข้อมูลสมาชิกเดิม</h1>
          <p className="text-sm text-stone-500 mt-1">
            แอดมินส่งลิงก์นี้ให้ท่าน เพื่อให้เข้าสู่ระบบด้วย LINE แล้วจัดการแปลงเดิมของท่านได้
          </p>
        </div>

        {phase === 'checking' && (
          <p className="text-sm text-stone-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสอบ...
          </p>
        )}

        {phase === 'need_login' && (
          <div className="space-y-3">
            <p className="text-sm text-stone-700">ขั้นแรก เข้าสู่ระบบด้วยบัญชี LINE ของท่านเอง</p>
            <button
              type="button"
              onClick={handleLogin}
              className="w-full py-3 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm"
            >
              เข้าสู่ระบบด้วย LINE
            </button>
          </div>
        )}

        {(phase === 'ready' || phase === 'linking') && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3 text-left">
              {profile?.pictureUrl && <img src={profile.pictureUrl} alt="" className="w-10 h-10 rounded-full" />}
              <div className="min-w-0">
                <p className="text-xs text-stone-500">บัญชี LINE ที่จะผูก</p>
                <p className="font-bold text-stone-900 truncate">{profile?.displayName || 'บัญชี LINE ของท่าน'}</p>
              </div>
            </div>
            <p className="text-xs text-stone-500">
              หลังผูกแล้ว ท่านจะเข้าสู่ระบบด้วยบัญชี LINE นี้ได้ทุกครั้ง ลิงก์นี้ใช้ได้ครั้งเดียว
            </p>
            <button
              type="button"
              onClick={handleLink}
              disabled={phase === 'linking'}
              className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {phase === 'linking' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังผูกบัญชี...
                </>
              ) : (
                'ยืนยันผูกบัญชี'
              )}
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-4">
            <p className="text-emerald-800 font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> ผูกบัญชีเรียบร้อยแล้ว
            </p>
            <Link
              href="/member/dashboard"
              className="block w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm"
            >
              ไปที่แปลงของฉัน
            </Link>
          </div>
        )}

        {phase === 'error' && (
          <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MemberLinkPage() {
  return (
    <Suspense fallback={null}>
      <LinkAccount />
    </Suspense>
  );
}
