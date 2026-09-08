'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { Farm, Product } from '@/types';
import { DISTRICTS_NSW } from '@/data/mockData';
import { MapPin, ArrowRight, ShieldCheck, Sprout, Search } from 'lucide-react';

export default function FarmsDirectoryPage() {
  const { getTextClass } = useFontSize();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let list = dataService.getPublicFarms(selectedDistrict);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.farmName.toLowerCase().includes(q) ||
          f.ownerName.toLowerCase().includes(q) ||
          f.story.toLowerCase().includes(q)
      );
    }
    setFarms(list);
  }, [selectedDistrict, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 rounded-3xl p-6 sm:p-10 text-white shadow-lg space-y-2">
        <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
          สารบบแปลงเกษตรกร
        </span>
        <h1 className={`${getTextClass('title')} text-3xl sm:text-4xl font-black tracking-tight`}>
          แปลงกสิกรรมธรรมชาติ จ.นครสวรรค์
        </h1>
        <p className={`${getTextClass('body')} text-stone-300 text-sm sm:text-base`}>
          ค้นพบศูนย์เรียนรู้และแปลงเกษตรกรต้นแบบ 15 อำเภอ สู่การพึ่งพาตนเองอย่างยั่งยืน
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อแปลง หรือเจ้าของ..."
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* District Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs sm:text-sm font-bold text-stone-500 shrink-0">เลือกอำเภอ:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-4 py-2.5 rounded-full border border-stone-200 bg-stone-50 text-xs sm:text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-auto"
          >
            <option value="ทั้งหมด">ทุกอำเภอในนครสวรรค์ (15 อำเภอ)</option>
            {DISTRICTS_NSW.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Farms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {farms.map((farm) => {
          const farmProducts = dataService.getProductsByFarmId(farm.id);

          return (
            <div
              key={farm.id}
              className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-brand-300 transition-all flex flex-col group"
            >
              {/* Farm Photo */}
              <Link href={`/farms/${farm.id}`} className="block relative aspect-16/9 overflow-hidden bg-stone-100">
                <img
                  src={farm.photos[0]}
                  alt={farm.farmName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brand-400" />
                    <span>{farm.district}</span>
                  </span>
                </div>
              </Link>

              {/* Farm Details */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-stone-500">
                      โดย {farm.ownerName}
                    </span>
                  </div>

                  <Link href={`/farms/${farm.id}`}>
                    <h3 className="font-bold text-stone-900 text-lg group-hover:text-brand-700 transition-colors line-clamp-1">
                      {farm.farmName}
                    </h3>
                  </Link>

                  {farm.tagline && (
                    <p className="text-xs font-semibold text-brand-700 mt-1 line-clamp-1">
                      "{farm.tagline}"
                    </p>
                  )}

                  <p className="text-xs text-stone-500 mt-2 line-clamp-2 leading-relaxed">
                    {farm.story}
                  </p>
                </div>

                {/* Practices Tags */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {farm.practices.slice(0, 3).map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                {/* Bottom Stats & CTA */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-500">
                    🌾 {farmProducts.length} ผลผลิตในระบบ
                  </span>

                  <Link
                    href={`/farms/${farm.id}`}
                    className="px-4 py-1.5 rounded-full bg-brand-50 hover:bg-brand-600 text-brand-700 hover:text-white text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span>ดูแปลง</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
