'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { Farm, Product } from '@/types';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Share2, 
  Sparkles,
  ExternalLink,
  Lock,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Camera,
  Play,
  Pause
} from 'lucide-react';

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getTextClass } = useFontSize();
  const farmId = params.farmId as string;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Auto-rotating Slideshow State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!farmId) return;

    const loadFarm = () => {
      const f = dataService.getFarmById(farmId);
      if (!f) {
        router.push('/farms');
        return;
      }
      setFarm({ ...f });
      setProducts(dataService.getProductsByFarmId(farmId));
    };

    loadFarm();

    window.addEventListener('nsw_data_updated', loadFarm);
    window.addEventListener('storage', loadFarm);
    return () => {
      window.removeEventListener('nsw_data_updated', loadFarm);
      window.removeEventListener('storage', loadFarm);
    };
  }, [farmId, router]);

  // Slideshow Auto-Cycle (ภาพวนโชว์ไปเรื่อยๆ)
  useEffect(() => {
    if (!farm?.photos || farm.photos.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % farm.photos.length);
    }, 4000); // วนทุก 4 วินาที

    return () => clearInterval(interval);
  }, [farm?.photos, isPaused]);

  // Keep currentSlideIndex in valid range when photos change
  useEffect(() => {
    if (farm?.photos && currentSlideIndex >= farm.photos.length) {
      setCurrentSlideIndex(0);
    }
  }, [farm?.photos, currentSlideIndex]);

  if (!farm) return null;

  const handleShareLine = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`แปลงกสิกรรมธรรมชาติ: ${farm.farmName} (${farm.district}) จ.นครสวรรค์`);
    window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back Button */}
      <Link
        href="/farms"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปรายชื่อแปลง</span>
      </Link>

      {/* Farm Header Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        
        {/* Cover Photo Slideshow (แสดงทีละรูป และหมุนวนไปเรื่อยๆ อัตโนมัติ) */}
        <div 
          className="relative w-full h-80 sm:h-96 md:h-[440px] bg-stone-950 overflow-hidden group select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Images Stack with Smooth Cross-Fade (แสดงทีละรูป) หรือ Empty Case */}
          {farm.photos && farm.photos.length > 0 ? (
            farm.photos.map((photoUrl, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  idx === currentSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={photoUrl}
                  alt={`${farm.farmName} ภาพที่ ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900 text-stone-300 p-6 text-center select-none z-10">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3 backdrop-blur-xs">
                <Camera className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="font-bold text-base sm:text-lg text-white">ยังไม่มีรูปภาพแปลงกสิกรรม</p>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-sm">
                เจ้าของแปลงสามารถอัปโหลดรูปภาพบรรยากาศแปลงและผลผลิตได้ในหน้าแปลงของฉัน
              </p>
            </div>
          )}

          {/* Top Gradient & Dark Overlay for Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20 z-15 pointer-events-none"></div>

          {/* Top-Right Slideshow Controls & Counter */}
          {farm.photos && farm.photos.length > 1 && (
            <div className="absolute top-4 right-4 z-25 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-colors shadow-md"
                title={isPaused ? 'กดเพื่อเล่นภาพวนอัตโนมัติ' : 'กดเพื่อหยุดภาพวนชั่วคราว'}
              >
                {isPaused ? <Play className="w-3 h-3 text-amber-300 fill-amber-300" /> : <Pause className="w-3 h-3 text-emerald-300 fill-emerald-300" />}
                <span className="text-[11px] hidden sm:inline">{isPaused ? 'เล่นภาพวน' : 'พักชั่วคราว'}</span>
              </button>
              <span className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-mono font-bold backdrop-blur-md flex items-center gap-1.5 shadow-md">
                <Camera className="w-3.5 h-3.5 text-brand-400" />
                <span>{currentSlideIndex + 1} / {farm.photos.length}</span>
              </span>
            </div>
          )}

          {/* Previous / Next Arrow Buttons */}
          {farm.photos && farm.photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex((prev) => (prev - 1 + farm.photos.length) % farm.photos.length);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm shadow-lg transition-all z-25 hover:scale-105"
                title="รูปก่อนหน้า"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex((prev) => (prev + 1) % farm.photos.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm shadow-lg transition-all z-25 hover:scale-105"
                title="รูปถัดไป"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          )}

          {/* Bottom Dot Indicators */}
          {farm.photos.length > 1 && (
            <div className="absolute bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-25 flex items-center gap-1.5 bg-black/50 backdrop-blur-xs px-3 py-1.5 rounded-full shadow-md">
              {farm.photos.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlideIndex ? 'w-6 bg-brand-400' : 'w-2 bg-white/60 hover:bg-white'
                  }`}
                  title={`ไปยังรูปที่ ${idx + 1}`}
                />
              ))}
            </div>
          )}
          
          {/* Header Info Overlay */}
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-20">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-600/90 text-white text-xs font-bold mb-2 backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>สมาชิกเครือข่ายกสิกรรมธรรมชาตินครสวรรค์</span>
              </div>
              <h1 className={`${getTextClass('title')} text-2xl sm:text-4xl font-extrabold leading-[1.38]`}>
                {farm.farmName}
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
                <span>{farm.district} • ต.{farm.subdistrict}</span>
              </p>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareLine}
                className="px-3 py-1.5 rounded-full bg-[#06C755] text-white text-xs font-bold shadow-md hover:bg-[#05b34c] transition-colors"
              >
                แชร์ไป LINE
              </button>
              <button
                onClick={handleShareFacebook}
                className="px-3 py-1.5 rounded-full bg-[#1877F2] text-white text-xs font-bold shadow-md hover:bg-[#156cdb] transition-colors"
              >
                แชร์ไป FB
              </button>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-xs hover:bg-white/30 text-white text-xs font-bold transition-colors"
              >
                {copyFeedback ? 'คัดลอกแล้ว!' : 'คัดลอก'}
              </button>
            </div>

          </div>
        </div>

        {/* Farm Story & Details */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Story & Philosophy */}
          <div className="lg:col-span-8 space-y-6">
            
            {farm.tagline && (
              <blockquote className="p-4 rounded-2xl bg-brand-50/60 border-l-4 border-brand-600 text-brand-900 font-bold text-base sm:text-lg italic">
                "{farm.tagline}"
              </blockquote>
            )}

            <div>
              <h2 className="text-lg font-bold text-stone-900 mb-2">
                เรื่องเล่า & วิถีกสิกรรมธรรมชาติของแปลง:
              </h2>
              <p className={`${getTextClass('body')} text-stone-700 leading-relaxed text-base sm:text-lg whitespace-pre-line`}>
                {farm.story}
              </p>
            </div>

            {/* Practices */}
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-2">
                องค์ความรู้ & ศาสตร์ที่นำมาปรับใช้ในแปลง:
              </h3>
              <div className="flex flex-wrap gap-2">
                {farm.practices.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs sm:text-sm font-semibold border border-stone-200"
                  >
                    🌿 {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Zone Map Safe Visualizer */}
            <div className="p-5 rounded-3xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-600" />
                  <h3 className="font-bold text-stone-900 text-base">
                    ตำแหน่งที่ตั้งแปลง (แสดงระดับโซนปลอดภัย)
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  รัศมี ~{farm.publicZone.radiusKm} กม.
                </span>
              </div>

              {/* Graphic Zone Map Container */}
              <div className="h-44 rounded-2xl bg-gradient-to-br from-emerald-100/70 via-brand-50 to-stone-100 border border-brand-200 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                <div className="w-24 h-24 rounded-full bg-brand-500/10 border-2 border-dashed border-brand-500 flex items-center justify-center animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md">
                    <MapPin className="w-5 h-5" />
                  </div>
                </div>
                <p className="font-bold text-stone-800 text-sm mt-3">
                  📍 {farm.publicZone.name}
                </p>
                <p className="text-xs text-stone-500 mt-1 max-w-md">
                  *เพื่อความปลอดภัยของเกษตรกร ระบบแสดงเฉพาะโซนรัศมี หากประสงค์เข้าศึกษาดูงาน กรุณาติดต่อเพื่อนัดหมายและรับพิกัดเดินทางจริงครับ
                </p>
              </div>

            </div>

          </div>

          {/* Right Sidebar: Farmer Profile & Contact Actions */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Owner Profile Card */}
            <div className="p-6 rounded-3xl bg-stone-50 border border-stone-200 text-center space-y-3">
              <div className="relative w-24 h-24 mx-auto">
                <img
                  src={dataService.getAllMembers().find(m => m.id === farm.memberId)?.facePhotoUrl || farm.photos[0]}
                  alt={farm.ownerName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mx-auto"
                />
                <span className="absolute bottom-0 right-0 p-1 bg-brand-600 text-white rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-base sm:text-lg">
                  {farm.ownerName}
                </h3>
                <p className="text-xs text-stone-500">เจ้าของแปลง / ปราชญ์กสิกรรมธรรมชาติ</p>
              </div>

              {/* Anti-Scam Contact Buttons */}
              <div className="pt-3 border-t border-stone-200 space-y-2.5">
                
                {farm.isPublicPhone && farm.phone ? (
                  <a
                    href={`tel:${farm.phone}`}
                    className="w-full py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 transition-all touch-target-big"
                  >
                    <Phone className="w-4 h-4" />
                    <span>โทรติดต่อ {farm.phone}</span>
                  </a>
                ) : (
                  <div className="p-3 rounded-2xl bg-stone-100 text-stone-400 text-xs font-semibold flex items-center justify-center gap-1.5 border border-stone-200">
                    <Lock className="w-3.5 h-3.5" />
                    <span>เจ้าของแปลงตั้งค่าซ่อนเบอร์โทร</span>
                  </div>
                )}

                {farm.isPublicLine && farm.lineId ? (
                  <a
                    href={`https://line.me/R/ti/p/~${farm.lineId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#06C755]/20 transition-all touch-target-big"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>ทัก LINE: {farm.lineId}</span>
                  </a>
                ) : null}

                {farm.socials?.facebook && (
                  <a
                    href={farm.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-2xl bg-blue-50 text-[#1877F2] hover:bg-blue-100 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>ติดตามทาง Facebook</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Farm's Products Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            ผลผลิต & ของดีประจำแปลง ({products.length} รายการ)
          </h2>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
            แปลงนี้ยังไม่ได้ลงรายการผลผลิตเพิ่มเติม
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((item) => (
              <Link
                key={item.id}
                href={`/catalog/${item.id}`}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-brand-300 transition-all flex flex-col group"
              >
                <div className="aspect-4/3 relative overflow-hidden bg-stone-100">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    {item.status === 'share' ? (
                      <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-md">
                        💙 มีแบ่งปันฟรี
                      </span>
                    ) : item.status === 'preorder' ? (
                      <span className="px-3 py-1 rounded-full bg-amber-600 text-white text-xs font-bold shadow-md">
                        🟡 สั่งจองล่วงหน้า
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-brand-600 text-white text-xs font-bold shadow-md">
                        🟢 พร้อมจำหน่าย
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                      {item.skuTagName}
                    </span>
                    <h4 className="font-bold text-stone-900 text-base mt-1.5 group-hover:text-brand-700 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    {item.status === 'share' ? (
                      <span className="text-xs font-bold text-blue-700">
                        แบ่งปันฟรี
                      </span>
                    ) : (
                      <span className="text-base font-black text-brand-700">
                        ฿{item.price}{' '}
                        <span className="text-xs font-normal text-stone-400">
                          /{item.unit.split(' ')[0]}
                        </span>
                      </span>
                    )}

                    <span className="text-xs font-bold text-brand-700 flex items-center gap-0.5">
                      ดูรายละเอียด <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
