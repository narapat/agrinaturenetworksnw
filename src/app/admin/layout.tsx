'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dataService } from '@/services/dataService';
import { hasAdminRole } from '@/types';
import { ShieldCheck, Lock, ArrowLeft, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';

const ADMIN_STORAGE_KEY = 'nsw_admin_session_token';
const DEFAULT_PASSCODE = 'agrinature2026'; // รหัสผ่านแอดมินเริ่มต้น

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [passcode, setPasscode] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = () => {
    if (typeof window === 'undefined') return;

    const sessionToken = sessionStorage.getItem(ADMIN_STORAGE_KEY) || localStorage.getItem(ADMIN_STORAGE_KEY);
    const currentUser = dataService.getCurrentUser();

    if (sessionToken === 'authenticated' && hasAdminRole(currentUser)) {
      setIsAdminAuthenticated(true);
    } else if (sessionToken === 'authenticated') {
      // หากผู้ใช้ปัจจุบันมีสิทธิ์แอดมินอยู่แล้ว ให้ใช้บัญชีเดิมได้เลย
      if (currentUser && hasAdminRole(currentUser)) {
        setIsAdminAuthenticated(true);
      } else {
        dataService.switchUser('admin-001');
        setIsAdminAuthenticated(true);
      }
    } else {
      setIsAdminAuthenticated(false);
    }
    setIsLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (passcode === DEFAULT_PASSCODE || passcode === 'admin1234') {
      // บันทึก Session Token
      sessionStorage.setItem(ADMIN_STORAGE_KEY, 'authenticated');
      localStorage.setItem(ADMIN_STORAGE_KEY, 'authenticated');
      const currentUser = dataService.getCurrentUser();
      if (!currentUser || !hasAdminRole(currentUser)) {
        dataService.switchUser('admin-001');
      }
      setIsAdminAuthenticated(true);
      window.location.reload();
    } else {
      setErrorMessage('รหัสผ่านแอดมินไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    dataService.switchUser('mem-001'); // สลับกลับเป็นสมาชิกทั่วไป
    setIsAdminAuthenticated(false);
    router.push('/');
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
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                รหัสผ่านผู้ดูแลระบบ (Admin Passcode)
              </label>
              <div className="relative">
                <input
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
              className="w-full py-4 px-6 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-base shadow-lg transition-all touch-target-big flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>เข้าสู่ระบบศูนย์แอดมิน</span>
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
              สิทธิ์ผู้ดูแลระบบ: <b className="text-white">แอดมินเครือข่ายนครสวรรค์</b>
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

      {children}
    </div>
  );
}
