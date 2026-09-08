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
  ChevronDown
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
    if (user.fontSizePref) {
      setFontSize(user.fontSizePref);
    }
    window.location.reload();
  };

  const navLinks = [
    { href: '/catalog', label: 'ของดีเครือข่าย', icon: ShoppingBag },
    { href: '/farms', label: 'แปลงกสิกรรม', icon: MapPin },
    { href: '/news', label: 'ข่าวสาร & เอามื้อ', icon: Newspaper },
    { href: '/member/dashboard', label: 'แปลงของฉัน', icon: User },
    ...(currentUser?.role === 'admin' 
      ? [{ href: '/admin', label: 'ศูนย์แอดมิน', icon: ShieldCheck, isBadge: true }] 
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/70 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Sprout className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl md:text-2xl text-stone-900 font-sans">
                  กสิกรรมธรรมชาติ
                </span>
                <span className="inline-block px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                  นครสวรรค์
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                เครือข่ายแห่งการเกื้อกูล สดจากแปลง แบ่งปันน้ำใจ
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80'
                  } ${link.isBadge ? 'border border-amber-300 text-amber-900 bg-amber-50/50' : ''}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-stone-400'}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Font Size & User Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Font Size Toggle for Elderly */}
            <div className="relative">
              <button
                onClick={() => setShowFontMenu(!showFontMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-stone-200 bg-stone-50/90 text-stone-700 hover:bg-stone-100 transition-colors text-sm font-medium"
                title="ปรับขนาดตัวหนังสือสำหรับผู้สูงอายุ"
              >
                <Type className="w-4 h-4 text-brand-600" />
                <span className="font-bold">
                  {fontSize === 'xlarge' ? 'ก++' : fontSize === 'large' ? 'ก+' : 'ก'}
                </span>
              </button>

              {showFontMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-stone-400 border-b border-stone-100">
                    ขนาดตัวอักษร
                  </div>
                  <button
                    onClick={() => {
                      setFontSize('normal');
                      if (currentUser) dataService.updateFontSizePreference(currentUser.id, 'normal');
                      setShowFontMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-stone-50"
                  >
                    <span>ปกติ (Standard)</span>
                    {fontSize === 'normal' && <Check className="w-4 h-4 text-brand-600" />}
                  </button>
                  <button
                    onClick={() => {
                      setFontSize('large');
                      if (currentUser) dataService.updateFontSizePreference(currentUser.id, 'large');
                      setShowFontMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-base font-semibold flex items-center justify-between hover:bg-stone-50"
                  >
                    <span>ใหญ่ (สบายตา)</span>
                    {fontSize === 'large' && <Check className="w-4 h-4 text-brand-600" />}
                  </button>
                  <button
                    onClick={() => {
                      setFontSize('xlarge');
                      if (currentUser) dataService.updateFontSizePreference(currentUser.id, 'xlarge');
                      setShowFontMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-lg font-bold flex items-center justify-between hover:bg-stone-50"
                  >
                    <span>ใหญ่พิเศษ (ผู้สูงอายุ)</span>
                    {fontSize === 'xlarge' && <Check className="w-4 h-4 text-brand-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* Test User Switcher Dropdown (สลับสถานะจำลอง) */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-stone-200 bg-white hover:border-brand-300 transition-all shadow-xs"
              >
                {currentUser?.facePhotoUrl ? (
                  <img
                    src={currentUser.facePhotoUrl}
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full object-cover border border-brand-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                    ผช
                  </div>
                )}
                <span className="text-xs sm:text-sm font-medium text-stone-800 max-w-[100px] truncate hidden sm:inline-block">
                  {currentUser ? currentUser.fullName.split(' ')[0] : 'ผู้เข้าชม'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="text-xs text-stone-500 font-medium">สลับบทบาททดสอบระบบ</p>
                    <p className="text-sm font-bold text-stone-800 truncate">
                      {currentUser?.fullName} ({currentUser?.role === 'admin' ? 'แอดมิน' : 'สมาชิกแปลง'})
                    </p>
                  </div>
                  <div className="py-1">
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
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
