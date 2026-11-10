'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { dataService } from '@/services/dataService';
import { liffService } from '@/services/liffService';
import { ShieldCheck, Lock, ArrowLeft, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AdminDataProvider } from './_components/AdminDataContext';
import { AdminShell } from './_components/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  // หน้าเครื่องมือเดี่ยว (ภาพริชเมนู) ไม่ต้องใช้ข้อมูล/เมนูของศูนย์แอดมิน
  const isStandaloneTool = pathname.startsWith('/admin/rich-menu');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  // ชื่อผู้ดำเนินการ (บังคับเมื่อเข้าด้วยรหัสผ่านสำรอง เพื่อบันทึกในประวัติการทำงาน)
  const [actorName, setActorName] = useState<string>('');
  const [sessionName, setSessionName] = useState<string>('');
  const [sessionMethod, setSessionMethod] = useState<'line' | 'passcode' | ''>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nsw_admin_actor_name');
      if (saved) setActorName(saved);
    } catch {}
  }, []);

  useEffect(() => {
    checkAdminAuth();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nsw_admin_session' || e.key === 'nsw_user_logged_out') {
        checkAdminAuth();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const checkAdminAuth = async () => {
    if (typeof window === 'undefined') return;

    // หากผู้ใช้จงใจออกจากระบบ ให้ระงับการตรวจสอบอัตโนมัติและแสดงหน้าใส่รหัสทันที
    const isLoggedOut =
      localStorage.getItem('nsw_user_logged_out') === 'true' ||
      sessionStorage.getItem('nsw_user_logged_out') === 'true';
    if (isLoggedOut) {
      setIsAdminAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = dataService.getCurrentUser();
      // ส่ง LINE ID Token ให้ Server ยืนยันกับ LINE เอง (ห้ามส่ง lineUserId ดิบ เพราะไม่ใช่ความลับ)
      const lineIdToken = liffService.getIdToken();

      const res = await fetch('/api/admin/auth', {
        headers: lineIdToken ? { Authorization: `Bearer ${lineIdToken}` } : undefined,
      });
      if (res.status === 401) {
        // Server ยืนยันว่าไม่มีสิทธิ์: ล้าง flag ฝั่ง client ที่อาจค้างอยู่
        try {
          sessionStorage.removeItem('nsw_admin_session_token');
          localStorage.removeItem('nsw_admin_session_token');
        } catch {}
      }
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          dataService.setAdminSession();
          setSessionName(data.actorName || '');
          setSessionMethod(data.method || '');
          // สิทธิ์แอดมินมาจาก Whitelist ฝั่ง server (ADMIN_LINE_USER_IDS) เท่านั้น
          // ไม่เขียน role ลงเอกสารสมาชิกอีกต่อไป
          if (!currentUser || currentUser.id === 'guest') {
            dataService.switchUser('admin-001');
          }
          setIsAdminAuthenticated(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Admin auth verify notice:', e);
    }

    // Server เป็นผู้ตัดสินสิทธิ์แอดมินเพียงแหล่งเดียว
    // ไม่ fallback ไปเชื่อ flag ใน localStorage/sessionStorage (ผู้ใช้ตั้งค่าเองได้)
    setIsAdminAuthenticated(false);
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const lineIdToken = liffService.getIdToken();
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(lineIdToken ? { Authorization: `Bearer ${lineIdToken}` } : {}),
        },
        body: JSON.stringify({ passcode: passcode.trim(), actorName: actorName.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        try {
          localStorage.removeItem('nsw_user_logged_out');
          sessionStorage.removeItem('nsw_user_logged_out');
        } catch {}
        try {
          localStorage.setItem('nsw_admin_actor_name', actorName.trim());
        } catch {}
        dataService.setAdminSession();
        const freshUser = dataService.getCurrentUser();
        if (!freshUser || freshUser.id === 'guest') {
          dataService.switchUser('admin-001');
        }
        setIsAdminAuthenticated(true);
        window.location.reload();
      } else {
        setErrorMessage(data.message || 'รหัสผ่านแอดมินไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบรหัสผ่านได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await liffService.logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ถ้ายังไม่ได้ล็อกอินสิทธิ์ Admin ให้แสดงหน้า Login Gate เพื่อป้องกันคนนอก
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-stone-200 shadow-xl space-y-6 animate-in fade-in zoom-in-95">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-stone-900 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight mt-3">
              พื้นที่เฉพาะผู้ดูแลระบบ
            </h1>
            <p className="text-xs sm:text-sm text-stone-500">
              เครือข่ายกสิกรรมธรรมชาติ จังหวัดนครสวรรค์
            </p>
            <div className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-mono">
              agrinature.network.nsw@gmail.com
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed">
              แอดมินที่ล็อกอิน LINE อยู่แล้วจะเข้าได้อัตโนมัติ — ช่องด้านล่างคือ <b>รหัสผ่านสำรอง</b> ใช้เมื่อ LINE มีปัญหา
              (ใช้ได้ 3 ชั่วโมง และลบข้อมูลไม่ได้)
            </p>

            <div>
              <label htmlFor="admin-actor-name" className="block text-xs font-bold text-stone-700 mb-1">
                ชื่อผู้ดำเนินการ
              </label>
              <input
                id="admin-actor-name"
                type="text"
                required
                maxLength={60}
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                placeholder="เช่น ป้าศรี (ใช้บันทึกในประวัติการทำงาน)"
                className="w-full px-4 py-3.5 rounded-2xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="admin-passcode" className="block text-xs font-bold text-stone-700 mb-1">
                รหัสผ่านสำรองผู้ดูแลระบบ (Admin Passcode)
              </label>
              <div className="relative">
                <input
                  id="admin-passcode"
                  type={showPasscode ? 'text' : 'password'}
                  required
                  autoFocus
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="กรอกรหัสผ่านเพื่อปลดล็อก..."
                  className="w-full pl-4 pr-11 py-3.5 rounded-2xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-600 text-white font-bold text-base shadow-lg transition-all touch-target-big flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>เข้าสู่ระบบศูนย์แอดมิน</span>
                </>
              )}
            </button>
          </form>

          {/* Security Note & Back Link */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
            <Link
              href="/"
              className="text-stone-500 hover:text-stone-800 font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าแรก</span>
            </Link>
            <span className="text-stone-400">
              🔒 เข้ารหัสปลอดภัย
            </span>
          </div>

        </div>
      </div>
    );
  }

  // หากยืนยันสิทธิ์เรียบร้อยแล้ว ให้แสดงเนื้อหาในแอดมิน พร้อมปุ่มออกจากระบบ
  return (
    <div className="relative">
      
      {/* Admin Top Status Bar */}
      <div className="bg-stone-900 text-white text-xs py-2 px-4 border-b border-stone-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-stone-300">
              สิทธิ์ผู้ดูแลระบบ: <b className="text-white">{sessionName || dataService.getCurrentUser()?.fullName || 'แอดมินเครือข่ายนครสวรรค์'}</b>
              {sessionMethod === 'passcode' && <span className="ml-1.5 text-amber-300">(รหัสผ่านสำรอง)</span>}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="text-stone-400 hover:text-rose-400 font-bold transition-colors"
          >
            ออกจากระบบแอดมิน
          </button>
        </div>
      </div>

      {isStandaloneTool ? (
        children
      ) : (
        <AdminDataProvider>
          <AdminShell>{children}</AdminShell>
        </AdminDataProvider>
      )}
    </div>
  );
}
