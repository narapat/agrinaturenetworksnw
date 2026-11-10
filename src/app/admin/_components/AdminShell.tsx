'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  HelpCircle,
  History,
  KeyRound,
  Layers,
  ShieldCheck,
  Sprout,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useFontSize } from '@/context/FontSizeContext';
import { useAdminData } from './AdminDataContext';

/**
 * โครงหน้าร่วมของศูนย์แอดมิน: หัวหน้า + สถิติ, แถบแจ้งสถานะ/ข้อผิดพลาด และเมนูนำทางหน้าย่อย
 * แต่ละหน้าย่อยมี URL ของตัวเอง ลิงก์ตรงได้ และปุ่มย้อนกลับของเบราว์เซอร์ใช้ได้
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const { getTextClass } = useFontSize();
  const {
    actorName, session, isPasscodeSession,
    pendingMembers, rejectedMembers, assistQueue, newsList, categories, practices,
    syncError, actionError, setActionError, refreshFromServer,
  } = useAdminData();

  const navItems = [
    { href: '/admin/members', label: `อนุมัติสมาชิกใหม่ (${pendingMembers.length})`, icon: UserCheck, exact: true },
    { href: '/admin/members/rejected', label: `ไม่อนุมัติ / คัดออก (${rejectedMembers.length})`, icon: XCircle, tone: 'rose' as const },
    { href: '/admin/news', label: `ประกาศกิจกรรม (${newsList.length})`, icon: Calendar },
    { href: '/admin/assist', label: `คิวช่วยลงข้อมูล (${assistQueue.length})`, icon: HelpCircle },
    { href: '/admin/categories', label: `จัดการหมวดหมู่ & SKU (${categories.length})`, icon: Layers },
    { href: '/admin/practices', label: `จัดการวิถีและศาสตร์ (${practices.length})`, icon: Sprout },
    { href: '/admin/logs', label: 'ประวัติแก้ไข (Logs)', icon: History },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href || pathname === `${href}/` : pathname.startsWith(href);

  // บนมือถือเมนูเป็นแถวเดียวเลื่อนแนวนอนได้ — เลื่อนให้เมนูที่เปิดอยู่มองเห็นเสมอ
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    // เลื่อนเฉพาะแนวนอนภายในเมนู ไม่เลื่อนทั้งหน้า
    if (nav && el) nav.scrollLeft = el.offsetLeft - (nav.clientWidth - el.clientWidth) / 2;
  }, [pathname]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Center Header */}
      <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>ศูนย์ควบคุมแอดมินเครือข่าย จ.นครสวรรค์</span>
          </div>
          <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black`}>
            แผงบริหารจัดการ & คัดกรองสมาชิก
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            ผู้ดูแลระบบ: <b className="text-white">{actorName}</b>
            {session.method && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${isPasscodeSession ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {isPasscodeSession ? 'รหัสผ่านสำรอง' : 'LINE'}
              </span>
            )}
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-emerald-400">{pendingMembers.length}</div>
            <div className="text-[10px] text-stone-400">รออนุมัติ</div>
          </div>
          {rejectedMembers.length > 0 && (
            <div className="px-3.5 py-2 rounded-2xl bg-rose-500/20 text-center border border-rose-500/30">
              <div className="text-lg font-black text-rose-400">{rejectedMembers.length}</div>
              <div className="text-[10px] text-stone-400">ไม่อนุมัติ</div>
            </div>
          )}
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-amber-400">{assistQueue.length}</div>
            <div className="text-[10px] text-stone-400">คิวช่วยลงข้อมูล</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-cyan-300">{newsList.length}</div>
            <div className="text-[10px] text-stone-400">กิจกรรม</div>
          </div>

          <Link
            href="/admin/rich-menu"
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shrink-0"
          >
            <span>📱 ภาพริชเมนู LINE</span>
          </Link>
        </div>
      </div>

      {/* สถานะการเข้าสู่ระบบ: รหัสผ่านสำรองทำได้เฉพาะงานประจำวัน */}
      {isPasscodeSession && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-amber-950">
          <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">เข้าสู่ระบบด้วยรหัสผ่านสำรอง ในชื่อ &quot;{actorName}&quot;</p>
            <p className="text-amber-800 leading-relaxed">
              อนุมัติ/ไม่อนุมัติ ช่วยลงข้อมูล จัดการข่าว หมวดหมู่ และวิถีได้ตามปกติ แต่ <b>การลบทุกประเภทต้องเข้าสู่ระบบด้วย LINE</b>
              {session.expiresAt ? (
                <> · หมดเวลา {new Date(session.expiresAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</>
              ) : null}
            </p>
          </div>
        </div>
      )}

      {syncError && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-red-900">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ — ข้อมูลที่เห็นอาจไม่ใช่ข้อมูลล่าสุด</p>
            <p className="text-red-800">{syncError}</p>
          </div>
          <button onClick={() => refreshFromServer()} className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold shrink-0">
            ลองใหม่
          </button>
        </div>
      )}

      {actionError && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-red-900">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="flex-1"><b>บันทึกไม่สำเร็จ:</b> {actionError}</p>
          <button onClick={() => setActionError(null)} aria-label="ปิด" className="shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* เมนูหน้าย่อย */}
      <nav
        ref={navRef}
        aria-label="เมนูศูนย์แอดมิน"
        className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible border-b border-stone-200 pb-2 [scrollbar-width:none]"
      >
        {navItems.map(({ href, label, icon: Icon, exact, tone }) => {
          const active = isActive(href, exact);
          const activeClass = tone === 'rose' ? 'bg-rose-700 text-white shadow-sm' : 'bg-brand-600 text-white shadow-sm';
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                active ? activeClass : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${!active && tone === 'rose' ? 'text-rose-500' : ''}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
