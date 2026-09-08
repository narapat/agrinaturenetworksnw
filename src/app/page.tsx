'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { Product, SKUGroup } from '@/types';
import { 
  ShoppingBag, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  HeartHandshake, 
  Flame, 
  Layers,
  PhoneCall,
  Search
} from 'lucide-react';

export default function HomePage() {
  const { getTextClass } = useFontSize();
  const [products, setProducts] = useState<Product[]>([]);
  const [skuGroups, setSkuGroups] = useState<SKUGroup[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    setProducts(dataService.getPublicProducts());
    setSkuGroups(dataService.getGroupedSKUs());
  }, []);

  return (
    <div className="relative overflow-hidden">
      
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-40 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* ================= HERO SECTION (Clean & Spacious) ================= */}
      <section className="pt-10 sm:pt-16 pb-14 md:pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-6 flex flex-col items-center">
          
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100/80 border border-brand-200/60 text-brand-900 text-xs sm:text-sm font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
            <span>🌾 เครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์</span>
            <span className="text-brand-500">•</span>
            <span className="text-brand-700">15 อำเภอ</span>
          </div>

          {/* Main Headline */}
          <h1 className={`${getTextClass('title')} text-3xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 leading-[1.38] space-y-1 sm:space-y-2 max-w-4xl`}>
            <span className="block">ของดีกสิกรรมธรรมชาติ</span>
            <span className="thai-gradient-text text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-emerald-600 to-teal-700">
              สดจากแปลง แบ่งปันน้ำใจ
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`${getTextClass('body')} text-stone-600 max-w-2xl text-base sm:text-lg leading-relaxed mx-auto`}>
            ศูนย์รวมผลผลิตอินทรีย์ ปัจจัยการผลิต By-product (ถ่านไบโอชาร์, น้ำส้มควันไม้, ปุ๋ยหมัก) 
            และเมล็ดพันธุ์พื้นบ้าน เชื่อมโยงพี่น้องเกษตรกรในจังหวัดนครสวรรค์ 
            เกื้อกูลกันแบบตรงไปตรงมา ปลอดภัย และไร้สารเคมี
          </p>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-base sm:text-lg shadow-lg shadow-brand-600/25 hover:shadow-brand-600/35 transition-all transform hover:-translate-y-0.5 touch-target-big"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>ดูของดีเครือข่าย</span>
            </Link>

            <Link
              href="/farms"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full border-2 border-stone-200 hover:border-brand-300 bg-white/80 hover:bg-stone-50 text-stone-700 font-bold text-base sm:text-lg transition-all touch-target-big"
            >
              <MapPin className="w-5 h-5 text-brand-600" />
              <span>ค้นหาแปลงกสิกรรม</span>
            </Link>
          </div>

          {/* Impact / Stats Row */}
          <div className="pt-8 border-t border-stone-200/80 w-full max-w-3xl mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
              <div className="p-3 rounded-2xl bg-white/60 border border-stone-100 sm:bg-transparent sm:border-0">
                <div className="text-3xl sm:text-4xl font-black text-stone-900 tracking-normal">15</div>
                <div className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">อำเภอในนครสวรรค์</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/60 border border-stone-100 sm:bg-transparent sm:border-0">
                <div className="text-3xl sm:text-4xl font-black text-brand-600 tracking-normal">48+</div>
                <div className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">แปลงกสิกรรมธรรมชาติ</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/60 border border-stone-100 sm:bg-transparent sm:border-0">
                <div className="text-3xl sm:text-4xl font-black text-blue-600 tracking-normal">100%</div>
                <div className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">วิถีไร้สารเคมี</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/60 border border-stone-100 sm:bg-transparent sm:border-0">
                <div className="text-3xl sm:text-4xl font-black text-amber-600 tracking-normal">ฟรี</div>
                <div className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">เมล็ดพันธุ์แบ่งปัน</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= FEATURED SKU GROUPS (Cross-Farm Highlights) ================= */}
      <section className="py-14 bg-white border-y border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full mb-2">
                <Layers className="w-3.5 h-3.5" />
                <span>รวมผลผลิตตามกลุ่ม (Cross-Farm SKU)</span>
              </div>
              <h2 className={`${getTextClass('subtitle')} text-2xl sm:text-3xl font-black text-stone-900`}>
                ของดีเด่นประจำเครือข่ายนครสวรรค์
              </h2>
              <p className="text-sm sm:text-base text-stone-500 mt-1">
                คลิกเพื่อดูว่าผลผลิตแต่ละชนิด มีอยู่ที่แปลงไหนบ้างในจังหวัด
              </p>
            </div>

            <Link
              href="/catalog"
              className="inline-flex items-center gap-1 text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
            >
              <span>ดูผลผลิตทั้งหมด</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* SKU Group Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {skuGroups.map((group) => (
              <Link
                key={group.skuTagId}
                href={`/catalog?sku=${group.skuTagId}`}
                className="bg-stone-50/80 hover:bg-white p-5 rounded-3xl border border-stone-200/80 hover:border-brand-300 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl p-2.5 bg-white rounded-2xl shadow-xs border border-stone-100">
                    {group.icon}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-brand-100/70 text-brand-800 text-xs font-bold">
                    มี {group.farmCount} แปลง
                  </span>
                </div>

                <h3 className="font-bold text-stone-900 text-base group-hover:text-brand-700 transition-colors line-clamp-1">
                  {group.name}
                </h3>

                <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                  📍 {group.districts.slice(0, 2).join(', ')} {group.districts.length > 2 ? `และอีก ${group.districts.length - 2} อำเภอ` : ''}
                </p>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-200/60">
                  {group.hasSharing ? (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      💙 มีแบ่งปันฟรี
                    </span>
                  ) : group.minPrice ? (
                    <span className="text-xs font-semibold text-stone-700">
                      เริ่มต้น <b className="text-brand-700 text-sm">฿{group.minPrice}</b>
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400">ติดต่อสอบถาม</span>
                  )}

                  <span className="text-xs text-stone-400 group-hover:text-brand-600 font-semibold flex items-center gap-0.5">
                    เลือกแปลง <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ================= COMMUNITY SOLIDARITY BANNER (Illustrated Vibe) ================= */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-brand-900 via-emerald-900 to-stone-900 rounded-[36px] text-white p-8 sm:p-12 relative overflow-hidden shadow-xl">
          
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
            <Sparkles className="w-96 h-96 text-white" />
          </div>

          <div className="max-w-2xl relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold backdrop-blur-xs">
              <HeartHandshake className="w-4 h-4 text-emerald-300" />
              <span>วิถีกสิกรรมธรรมชาติ: มีกิน มีใช้ มีแบ่งปัน</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold leading-[1.38]">
              เกษตรกรผู้ผลิตพบผู้บริโภค <br />
              เกื้อกูลกันโดยตรง ปลอดภัย ไร้คนกลาง
            </h2>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              เราใส่ใจในความปลอดภัยของเกษตรกร โดยการซ่อนเบอร์โทรศัพท์เป็นค่าเริ่มต้นเพื่อป้องกันมิจฉาชีพ 
              และแสดงพิกัดแบบโซนรัศมี ท่านสามารถทักไลน์หรือติดต่อแปลงเพื่อขอพิกัดเดินทางได้โดยตรง
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href="/member/dashboard"
                className="px-6 py-3.5 rounded-full bg-brand-500 hover:bg-brand-400 text-stone-950 font-bold text-sm sm:text-base transition-colors touch-target-big inline-flex items-center gap-2"
              >
                <span>สำหรับสมาชิก: เข้าสู่แปลงของฉัน</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/news"
                className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm sm:text-base transition-colors touch-target-big inline-flex items-center gap-2"
              >
                <span>ดูกิจกรรมเอามื้อสามัคคี</span>
              </Link>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
