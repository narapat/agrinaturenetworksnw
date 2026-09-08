'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, MapPin, Newspaper, User, Home } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'หน้าแรก', icon: Home },
    { href: '/catalog', label: 'ของดี', icon: ShoppingBag },
    { href: '/farms', label: 'แปลง', icon: MapPin },
    { href: '/news', label: 'ข่าวสาร', icon: Newspaper },
    { href: '/member/dashboard', label: 'แปลงฉัน', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200/80 px-1 py-1.5 shadow-lg safe-area-bottom">
      <div className="grid grid-cols-5 w-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-700 font-bold bg-brand-50/80'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600 scale-105' : 'text-stone-400'} transition-transform`} />
              <span className="text-[11px] mt-0.5 font-medium leading-normal truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
