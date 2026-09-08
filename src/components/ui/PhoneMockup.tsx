'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import { Search, MapPin, Sparkles, Phone, ChevronRight } from 'lucide-react';

interface PhoneMockupProps {
  sampleProducts: Product[];
}

export default function PhoneMockup({ sampleProducts }: PhoneMockupProps) {
  const [filter, setFilter] = useState<'all' | 'byproduct' | 'share'>('all');

  const filtered = sampleProducts.filter((p) => {
    if (filter === 'byproduct') return p.category === 'byproduct';
    if (filter === 'share') return p.status === 'share';
    return true;
  });

  return (
    <div className="relative mx-auto w-[310px] sm:w-[340px] h-[640px] bg-stone-900 rounded-[48px] p-3.5 shadow-2xl border-4 border-stone-800 ring-1 ring-stone-900/10">
      
      {/* Phone Speaker & Dynamic Island */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-end px-2">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 animate-pulse"></div>
      </div>

      {/* Screen Content */}
      <div className="w-full h-full bg-stone-50 rounded-[38px] overflow-hidden flex flex-col relative text-stone-900 font-sans">
        
        {/* Mobile Top Bar */}
        <div className="pt-8 px-4 pb-2 bg-gradient-to-b from-brand-100/60 to-transparent">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-2">
            <span>09:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <span className="w-4 h-2 rounded-xs border border-stone-400 inline-block"></span>
            </div>
          </div>

          {/* Search Input Mockup */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              placeholder="ค้นหา เช่น ถ่านไบโอชาร์, น้ำส้ม..."
              className="w-full pl-9 pr-3 py-2 bg-white rounded-full text-xs border border-stone-200 shadow-xs placeholder-stone-400 pointer-events-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${
                filter === 'all'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600'
              }`}
            >
              ทั้งหมด ({sampleProducts.length})
            </button>
            <button
              onClick={() => setFilter('byproduct')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${
                filter === 'byproduct'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600'
              }`}
            >
              🪵 ถ่าน & น้ำส้ม
            </button>
            <button
              onClick={() => setFilter('share')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${
                filter === 'share'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600'
              }`}
            >
              🔵 แบ่งปันฟรี
            </button>
          </div>
        </div>

        {/* Mini Zone Map Graphic */}
        <div className="mx-3 mt-1 p-2.5 bg-gradient-to-r from-brand-50 to-emerald-100/50 rounded-2xl border border-brand-100 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-700 shrink-0" />
              <span className="text-[11px] font-bold text-brand-900">
                โซน จ.นครสวรรค์ (15 อำเภอ)
              </span>
            </div>
            <span className="text-[10px] bg-brand-600/10 text-brand-800 px-1.5 py-0.5 rounded-full font-bold">
              พิกัดปลอดภัย
            </span>
          </div>
          <p className="text-[10px] text-stone-500 mt-1">
            แสดงรัศมีแปลงคร่าวๆ เพื่อความปลอดภัย ไม่เปิดเผยพิกัดส่วนตัว
          </p>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          <p className="text-[11px] font-bold text-stone-500 px-1">
            ผลผลิตสด & ปัจจัยการผลิต ({filtered.length} รายการ)
          </p>

          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/catalog/${item.id}`}
              className="block bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs hover:border-brand-300 transition-all group"
            >
              <div className="flex gap-2.5">
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="w-14 h-14 rounded-xl object-cover border border-stone-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-brand-700">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[10px] text-stone-500 truncate mt-0.5">
                    📍 {item.district} • {item.farmName.split(' ')[0]}
                  </p>
                  
                  <div className="flex items-center justify-between mt-1">
                    {item.status === 'share' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                        💙 มีแบ่งปันฟรี
                      </span>
                    ) : item.status === 'preorder' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                        จอง {item.price} บ.
                      </span>
                    ) : (
                      <span className="text-xs font-black text-brand-700">
                        ฿{item.price} <span className="text-[10px] font-normal text-stone-400">/{item.unit.split(' ')[0]}</span>
                      </span>
                    )}

                    <span className="text-[10px] text-brand-600 font-bold flex items-center gap-0.5">
                      ดู <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile Bottom Mockup Bar */}
        <div className="bg-white border-t border-stone-200 px-6 py-2.5 flex items-center justify-between text-[10px] text-stone-500 font-medium">
          <span className="text-brand-700 font-bold">🛒 ผลผลิต</span>
          <span>🌾 แปลง</span>
          <span>📢 ข่าว</span>
          <span>👤 ของฉัน</span>
        </div>

      </div>

    </div>
  );
}
