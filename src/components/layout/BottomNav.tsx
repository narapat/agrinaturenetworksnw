'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, MapPin, Newspaper, User, Home } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'หน้าแรก', icon: Home },
    { href: '/catalog', label: 'ของดีเครือข่าย', icon: ShoppingBag },
    { href: '/farms', label: 'แปลงกสิกรรม', icon: MapPin },
    { href: '/news', label: 'ข่าวสาร', icon: Newspaper },
    { href: '/member/dashboard', label: 'แปลงของฉัน', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200/80 px-2 py-1.5 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl min-w-[58px] transition-all touch-target-big ${
                isActive
                  ? 'text-brand-700 font-bold bg-brand-50'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-brand-600 scale-110' : 'text-stone-400'} transition-transform`} />
              <span className="text-[11px] mt-0.5 tracking-tight font-medium truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
