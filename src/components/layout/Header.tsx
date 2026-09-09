'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { MemberProfile, hasAdminRole, hasMemberRole } from '@/types';
import { 
  ShoppingBag, 
  MapPin, 
  Newspaper, 
  User, 
  ShieldCheck, 
  Type,
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Menu,
  X,
  Home,
  UserPlus,
  Sprout
} from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const { fontSize, setFontSize } = useFontSize();
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const refreshHeaderUser = () => {
      const user = dataService.getCurrentUser();
      setCurrentUser(user);
      setAllMembers(dataService.getAllMembers());
    };

    refreshHeaderUser();

    window.addEventListener('nsw_data_updated', refreshHeaderUser);
    window.addEventListener('storage', refreshHeaderUser);
    return () => {
      window.removeEventListener('nsw_data_updated', refreshHeaderUser);
      window.removeEventListener('storage', refreshHeaderUser);
    };
  }, [pathname]);

  // Close hamburger menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle ESC key and body scroll lock when drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleSwitchUser = (userId: string) => {
    dataService.switchUser(userId);
    const user = dataService.getCurrentUser();
    setCurrentUser(user);
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
    // sync font size preference
    if (user?.fontSizePref) {
      setFontSize(user.fontSizePref);
    }
    window.location.reload();
  };

  // Navigation links for full desktop (clean without duplicate manual button)
  const desktopNavLinks = [
    { href: '/catalog', label: 'ของดีเครือข่าย', icon: ShoppingBag },
    { href: '/farms', label: 'แปลงกสิกรรม', icon: MapPin },
    { href: '/news', label: 'ข่าวสาร & เอามื้อ', icon: Newspaper },
    { href: '/member/dashboard', label: 'แปลงของฉัน', icon: User },
    ...(hasAdminRole(currentUser)
      ? [{ href: '/admin', label: 'ศูนย์แอดมิน', icon: ShieldCheck, isBadge: true }] 
      : []),
  ];

  // Drawer links for hamburger menu (all links)
  const drawerLinks = [
    { href: '/', label: 'หน้าแรก', icon: Home, desc: 'ตลาดและภาพรวมเครือข่าย' },
    { href: '/catalog', label: 'ของดีเครือข่าย', icon: ShoppingBag, desc: 'ผลผลิตอินทรีย์ 15 อำเภอ' },
    { href: '/farms', label: 'แปลงกสิกรรม', icon: MapPin, desc: 'ทำเนียบแปลงและศูนย์เรียนรู้' },
    { href: '/news', label: 'ข่าวสาร & เอามื้อ', icon: Newspaper, desc: 'กิจกรรมและตารางเอามื้อสามัคคี' },
    { href: '/manual', label: 'คู่มือใช้งาน', icon: BookOpen, desc: 'วิธีใช้งานระบบและคู่มือออนไลน์' },
    { href: '/member/dashboard', label: 'แปลงของฉัน', icon: User, desc: 'จัดการผลผลิตและข้อมูลแปลง' },
    ...(hasAdminRole(currentUser)
      ? [{ href: '/admin', label: 'ศูนย์แอดมิน', icon: ShieldCheck, desc: 'อนุมัติสมาชิกและตรวจสอบระบบ', isBadge: true }] 
      : []),
  ];

  return (
    <>
      <header 
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs text-stone-800 w-full max-w-full"
      >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between py-2.5 sm:py-3.5 min-h-[64px] sm:min-h-[72px] gap-2">
          
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden border border-brand-200/90 shadow-sm bg-amber-50/60 group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center">
              <img
                src="/images/logo.jpg"
                alt="โลโก้กสิกรรมธรรมชาตินครสวรรค์"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm sm:text-lg text-stone-900 font-sans tracking-normal">
                  กสิกรรมธรรมชาติ
                </span>
                <span className="inline-block px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-800 text-[10px] sm:text-xs font-bold shrink-0">
                  นครสวรรค์
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block whitespace-nowrap">
                เครือข่ายแห่งการเกื้อกูล สดจากแปลง แบ่งปันน้ำใจ
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links (Only on xl: >= 1280px, otherwise Hamburger Menu triggers) */}
          <nav className="hidden xl:flex items-center gap-1 xl:gap-2 shrink-0">
            {desktopNavLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs lg:text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-bold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                  } ${link.isBadge ? 'border border-amber-300 text-amber-900 bg-amber-50/50' : ''}`}
                >
                  <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${isActive ? 'text-brand-600' : 'text-stone-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Guide (xl only), Font Size, User Switcher & Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Guide / Manual Button (Only shown on xl screens where nav is visible) */}
            <Link
              href="/manual"
              className={`hidden xl:flex items-center gap-1 px-3 py-2 rounded-full border border-stone-200 bg-stone-50/90 text-stone-700 hover:bg-stone-100 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap ${
                pathname === '/manual' || pathname === '/guide' ? 'bg-brand-50 text-brand-700 border-brand-200 font-bold' : ''
              }`}
              title="คู่มือการใช้งาน"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 shrink-0" />
              <span>คู่มือ</span>
            </Link>

            {/* Font Size Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFontMenu(!showFontMenu);
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full border border-stone-200 bg-stone-50/90 text-stone-700 hover:bg-stone-100 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap"
                title="ปรับขนาดตัวอักษร"
              >
                <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 shrink-0" />
                <span className="font-bold">
                  {fontSize === 'xlarge' ? 'ก++' : fontSize === 'large' ? 'ก+' : 'ก'}
                </span>
              </button>

              {showFontMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFontMenu(false)} 
                    aria-hidden="true" 
                  />
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3.5 py-1.5 text-xs font-semibold text-stone-400 border-b border-stone-100">
                      ขนาดตัวอักษร
                    </div>
                    <button
                      onClick={() => {
                        setFontSize('normal');
                        if (currentUser) dataService.updateFontSizePreference(currentUser.id, 'normal');
                        setShowFontMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between hover:bg-stone-50 transition-colors"
                    >
                      <span className="font-medium">ปกติ</span>
                      {fontSize === 'normal' && <Check className="w-4 h-4 text-brand-600" />}
                    </button>
                    <button
                      onClick={() => {
                        setFontSize('large');
                        if (currentUser) dataService.updateFontSizePreference(currentUser.id, 'large');
                        setShowFontMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-base flex items-center justify-between hover:bg-stone-50 transition-colors"
                    >
                      <span className="font-bold">ใหญ่</span>
                      {fontSize === 'large' && <Check className="w-4 h-4 text-brand-600" />}
                    </button>
                    <button
                      onClick={() => {
                        setFontSize('xlarge');
                        if (currentUser) dataService.updateFontSizePreference(currentUser.id, 'xlarge');
                        setShowFontMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-lg flex items-center justify-between hover:bg-stone-50 transition-colors"
                    >
                      <span className="font-extrabold text-brand-800">ใหญ่พิเศษ</span>
                      {fontSize === 'xlarge' && <Check className="w-4 h-4 text-brand-600" />}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Test User Switcher Dropdown (สลับสถานะจำลอง) */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowFontMenu(false);
                }}
                className="flex items-center gap-1 sm:gap-2 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-full border border-stone-200 bg-white hover:border-brand-300 transition-all shadow-xs"
              >
                {currentUser?.facePhotoUrl ? (
                  <img
                    src={currentUser.facePhotoUrl}
                    alt={currentUser.fullName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-brand-200 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px] sm:text-xs shrink-0">
                    ผช
                  </div>
                )}
                <span className="text-xs sm:text-sm font-medium text-stone-800 max-w-[90px] lg:max-w-[120px] truncate hidden md:inline-block">
                  {currentUser ? currentUser.fullName.split(' ')[0] : 'ผู้เข้าชม'}
                </span>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-400 shrink-0 hidden sm:inline-block" />
              </button>

              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)} 
                    aria-hidden="true" 
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs text-stone-500 font-medium">สลับบทบาททดสอบระบบ</p>
                      <p className="text-sm font-bold text-stone-800 truncate">
                        {currentUser?.fullName} ({currentUser && hasAdminRole(currentUser) && currentUser.roles?.includes('member') ? '🛡️ แอดมิน & 🌾 แปลง' : currentUser && hasAdminRole(currentUser) ? '🛡️ แอดมิน' : currentUser?.farmId ? '🌾 สมาชิกแปลง' : '🌾 สมาชิก (ยังไม่มีแปลง)'})
                      </p>
                    </div>
                    <div className="py-1 max-h-60 overflow-y-auto">
                      {/* Guest Switcher Option */}
                      <button
                        onClick={() => handleSwitchUser('guest')}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2.5 hover:bg-stone-50 transition-colors ${
                          !currentUser ? 'bg-stone-100 font-bold text-stone-900' : 'text-stone-600'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-[10px]">
                          ผช
                        </div>
                        <div className="flex-1 truncate">
                          <p className="truncate">บุคคลทั่วไป (Guest)</p>
                          <span className="text-[10px] text-stone-400">ยังไม่ลงทะเบียนแปลง</span>
                        </div>
                        {!currentUser && <Check className="w-3.5 h-3.5 text-brand-600" />}
                      </button>

                      {allMembers.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleSwitchUser(m.id)}
                          className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2.5 hover:bg-brand-50 transition-colors ${
                            currentUser?.id === m.id ? 'bg-brand-50/80 font-bold text-brand-800' : 'text-stone-700'
                          }`}
                        >
                          <img
                            src={m.facePhotoUrl}
                            alt={m.fullName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div className="flex-1 truncate">
                            <p className="truncate">{m.fullName}</p>
                            <span className="text-[10px] text-stone-400">
                              {hasAdminRole(m) && m.roles?.includes('member') ? '🛡️ แอดมิน & 🌾 แปลง' : hasAdminRole(m) ? '🛡️ แอดมินเครือข่าย' : m.farmId ? '🌾 สมาชิกแปลง' : '🌾 สมาชิก (ยังไม่มีแปลง)'}
                            </span>
                          </div>
                          {currentUser?.id === m.id && <Check className="w-3.5 h-3.5 text-brand-600" />}
                        </button>
                      ))}
                    </div>

                    <div className="p-2 border-t border-stone-100">
                      {currentUser && hasMemberRole(currentUser) && !currentUser.farmId ? (
                        <Link
                          href="/member/create-farm"
                          onClick={() => setShowUserMenu(false)}
                          className="w-full py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Sprout className="w-3.5 h-3.5" />
                          <span>+ สร้างแปลงกสิกรรมของคุณ</span>
                        </Link>
                      ) : (
                        <Link
                          href="/member/register"
                          onClick={() => setShowUserMenu(false)}
                          className="w-full py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>+ สมัครสมาชิกแปลงใหม่</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Hamburger Menu Toggle Button (Shows on < xl when desktop shrinks or on mobile) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="xl:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-stone-200 bg-stone-50/90 text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors shrink-0"
              aria-label="เปิดเมนูนำทาง"
              title="เมนู"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-stone-800" />
            </button>

          </div>

        </div>
      </div>
    </header>

    {/* Slide-over Drawer / Hamburger Menu (Rendered OUTSIDE <header> with z-[100] so it's ALWAYS visible on top) */}
    {isMobileMenuOpen && (
      <div className="fixed inset-0 z-[100] xl:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/90 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl overflow-hidden border border-brand-200/90 shadow-sm bg-amber-50/60 shrink-0 flex items-center justify-center">
                  <img
                    src="/images/logo.jpg"
                    alt="โลโก้กสิกรรมธรรมชาตินครสวรรค์"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-stone-900">กสิกรรมธรรมชาติ</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-brand-100 text-brand-800 text-[10px] font-bold">นครสวรรค์</span>
                  </div>
                  <p className="text-[10px] text-stone-500">เมนูนำทางเครือข่าย</p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-200/80 transition-colors"
                aria-label="ปิดเมนู"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* User Card */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-50/70 to-stone-50 border border-brand-100 flex items-center gap-3">
                {currentUser?.facePhotoUrl ? (
                  <img
                    src={currentUser.facePhotoUrl}
                    alt={currentUser.fullName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-800 font-bold flex items-center justify-center text-sm shrink-0 shadow-sm">
                    ผช
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-stone-900 truncate">
                    {currentUser ? currentUser.fullName : 'บุคคลทั่วไป (Guest)'}
                  </p>
                  <p className="text-xs text-brand-700 font-medium">
                    {currentUser && hasAdminRole(currentUser) && currentUser.roles?.includes('member')
                      ? '🛡️ แอดมิน & 🌾 สมาชิกแปลง'
                      : currentUser && hasAdminRole(currentUser)
                        ? '🛡️ แอดมินเครือข่าย'
                        : currentUser 
                          ? '🌾 สมาชิกแปลงกสิกรรม' 
                          : '🌿 ผู้เข้าชมทั่วไป'}
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <div className="px-2 pb-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  เมนูหลัก
                </div>
                {drawerLinks.map((link) => {
                  const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-brand-50 text-brand-800 font-bold border-l-4 border-brand-600 shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-600'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium leading-snug truncate">{link.label}</p>
                          {link.desc && (
                            <p className="text-[11px] text-stone-400 font-normal leading-tight truncate">
                              {link.desc}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 shrink-0 ml-2" />
                    </Link>
                  );
                })}
              </div>

              {/* Font Size Quick Selector */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                  <span className="flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-brand-600" />
                    <span>ปรับขนาดตัวอักษร</span>
                  </span>
                  <span className="text-[11px] text-stone-400">
                    {fontSize === 'xlarge' ? 'ใหญ่พิเศษ' : fontSize === 'large' ? 'ใหญ่' : 'ปกติ'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'normal', label: 'ปกติ (ก)' },
                    { id: 'large', label: 'ใหญ่ (ก+)' },
                    { id: 'xlarge', label: 'พิเศษ (ก++)' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setFontSize(item.id as any);
                        if (currentUser) dataService.updateFontSizePreference(currentUser.id, item.id as any);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        fontSize === item.id 
                          ? 'bg-brand-600 text-white shadow-xs' 
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Member Register / Create Farm CTA */}
              {currentUser && hasMemberRole(currentUser) && !currentUser.farmId ? (
                <Link
                  href="/member/create-farm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <Sprout className="w-4 h-4" />
                  <span>+ สร้างแปลงกสิกรรมของคุณ</span>
                </Link>
              ) : (
                <Link
                  href="/member/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ สมัครสมาชิกแปลงใหม่ (ฟรี)</span>
                </Link>
              )}

              {/* Quick Role Switcher (ทดสอบระบบ) */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-stone-500">สลับบทบาททดสอบระบบ</span>
                  <span className="text-[10px] text-stone-400">Demo Profiles</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  <button
                    onClick={() => handleSwitchUser('guest')}
                    className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                      !currentUser ? 'bg-stone-200 text-stone-900 font-bold' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-stone-300 text-stone-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                      ผช
                    </div>
                    <span className="truncate flex-1">บุคคลทั่วไป (Guest)</span>
                    {!currentUser && <Check className="w-3.5 h-3.5 text-brand-700 shrink-0" />}
                  </button>

                  {allMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSwitchUser(m.id)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                        currentUser?.id === m.id 
                          ? 'bg-brand-100/70 text-brand-900 font-bold' 
                          : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <img
                        src={m.facePhotoUrl}
                        alt={m.fullName}
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                      <span className="truncate flex-1">{m.fullName}</span>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {hasAdminRole(m) && m.roles?.includes('member') ? '🛡️ แอดมิน & 🌾 แปลง' : hasAdminRole(m) ? '🛡️ แอดมิน' : m.farmId ? '🌾 แปลง' : '🌾 ยังไม่มีแปลง'}
                      </span>
                      {currentUser?.id === m.id && <Check className="w-3.5 h-3.5 text-brand-700 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-stone-200 bg-stone-50 text-center text-xs text-stone-500 shrink-0">
              <p className="font-semibold text-stone-700">เครือข่ายกสิกรรมธรรมชาตินครสวรรค์</p>
              <p className="text-[10px] text-stone-400">ระบบฐานข้อมูลผลผลิตและการแบ่งปัน 15 อำเภอ</p>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
