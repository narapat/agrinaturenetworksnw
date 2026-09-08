'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { MemberProfile } from '@/types';
import { 
  Sprout, 
  ShoppingBag, 
  MapPin, 
  Newspaper, 
  User, 
  ShieldCheck, 
  Type,
  Check,
  ChevronDown,
  BookOpen
} from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const { fontSize, setFontSize } = useFontSize();
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);

  useEffect(() => {
    const user = dataService.getCurrentUser();
    setCurrentUser(user);
    setAllMembers(dataService.getAllMembers());
  }, [pathname]);

  const handleSwitchUser = (userId: string) => {
    dataService.switchUser(userId);
    const user = dataService.getCurrentUser();
    setCurrentUser(user);
    setShowUserMenu(false);
    // sync font size preference
    if (user?.fontSizePref) {
      setFontSize(user.fontSizePref);
    }
    window.location.reload();
  };

  const navLinks = [
    { href: '/catalog', label: 'ของดีเครือข่าย', icon: ShoppingBag },
    { href: '/farms', label: 'แปลงกสิกรรม', icon: MapPin },
    { href: '/news', label: 'ข่าวสาร & เอามื้อ', icon: Newspaper },
    { href: '/guide', label: 'คู่มือใช้งาน', icon: BookOpen },
    { href: '/member/dashboard', label: 'แปลงของฉัน', icon: User },
    ...(currentUser?.role === 'admin' 
      ? [{ href: '/admin', label: 'ศูนย์แอดมิน', icon: ShieldCheck, isBadge: true }] 
      : []),
  ];

  return (
    <header 
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs text-stone-800 w-full max-w-full overflow-hidden"
      style={{ fontSize: '15px' }}
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between py-2.5 sm:py-4 min-h-[64px] sm:min-h-[76px] gap-1">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group min-w-0 shrink">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="font-bold text-sm sm:text-xl text-stone-900 font-sans tracking-normal truncate">
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

          {/* Desktop & Tablet Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 shrink-0">
            {navLinks.map((link) => {
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

          {/* Right Controls: Guide, Font Size & User Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Guide / Manual Button */}
            <Link
              href="/manual"
              className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full border border-stone-200 bg-stone-50/90 text-stone-700 hover:bg-stone-100 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap ${
                pathname === '/manual' || pathname === '/guide' ? 'bg-brand-50 text-brand-700 border-brand-200 font-bold' : ''
              }`}
              title="คู่มือการใช้งาน"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 shrink-0" />
              <span className="hidden xs:inline sm:inline">คู่มือ</span>
            </Link>

            {/* Font Size Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowFontMenu(!showFontMenu)}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full border border-stone-200 bg-stone-50/90 text-stone-700 hover:bg-stone-100 transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap"
                title="ปรับขนาดตัวอักษร"
              >
                <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600 shrink-0" />
                <span className="font-bold">
                  {fontSize === 'xlarge' ? 'ก++' : fontSize === 'large' ? 'ก+' : 'ก'}
                </span>
              </button>

              {showFontMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
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
              )}
            </div>

            {/* Test User Switcher Dropdown (สลับสถานะจำลอง) */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
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
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="text-xs text-stone-500 font-medium">สลับบทบาททดสอบระบบ</p>
                    <p className="text-sm font-bold text-stone-800 truncate">
                      {currentUser?.fullName} ({currentUser?.role === 'admin' ? 'แอดมิน' : 'สมาชิกแปลง'})
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
                            {m.role === 'admin' ? '🛡️ แอดมินเครือข่าย' : '🌾 สมาชิกแปลง'}
                          </span>
                        </div>
                        {currentUser?.id === m.id && <Check className="w-3.5 h-3.5 text-brand-600" />}
                      </button>
                    ))}
                  </div>

                  <div className="p-2 border-t border-stone-100">
                    <Link
                      href="/member/register"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>+ สมัครสมาชิกแปลงใหม่</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
