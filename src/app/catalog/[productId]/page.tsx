'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { Product, Farm } from '@/types';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  Share2, 
  Check, 
  Layers, 
  ChevronRight,
  ExternalLink,
  Sparkles,
  Lock
} from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getTextClass } = useFontSize();
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [crossFarmProducts, setCrossFarmProducts] = useState<Product[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const prod = dataService.getProductById(productId);
    if (!prod) {
      router.push('/catalog');
      return;
    }
    setProduct(prod);

    // โหลดข้อมูลแปลง
    const farmData = dataService.getFarmById(prod.farmId);
    if (farmData) setFarm(farmData);

    // โหลดผลผลิตชนิดเดียวกันจากแปลงอื่นๆ ในเครือข่าย (Cross-Farm Showcase)
    const related = dataService.getRelatedCrossFarmProducts(prod.id, prod.skuTagId);
    setCrossFarmProducts(related);
  }, [productId, router]);

  if (!product) return null;

  const handleShareLine = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`ของดีกสิกรรมธรรมชาติ: ${product.title} จาก ${product.farmName} จ.นครสวรรค์`);
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back Button */}
      <Link
        href="/catalog"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปหน้ารวมผลผลิต</span>
      </Link>

      {/* Main Product Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
        
        {/* Left Column: Product Photo */}
        <div className="md:col-span-6 bg-stone-100 relative min-h-[320px] md:min-h-full">
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4">
            {product.status === 'share' ? (
              <span className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-md">
                💙 มีแบ่งปันฟรี / แลกเปลี่ยน
              </span>
            ) : product.status === 'preorder' ? (
              <span className="px-3.5 py-1.5 rounded-full bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-md">
                🟡 สั่งจองล่วงหน้า
              </span>
            ) : (
              <span className="px-3.5 py-1.5 rounded-full bg-brand-600 text-white text-xs sm:text-sm font-bold shadow-md">
                🟢 พร้อมจำหน่าย
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Product Info & Direct Actions */}
        <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          
          <div className="space-y-4">
            
            {/* Category Tag */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-100">
                {product.skuTagName}
              </span>
              <span className="text-xs text-stone-400 font-medium">
                {product.categoryName}
              </span>
            </div>

            {/* Title */}
            <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-stone-900 leading-snug`}>
              {product.title}
            </h1>

            {/* Price / Share Status */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-baseline justify-between">
              <div>
                <p className="text-xs text-stone-500 font-semibold">ราคาจากแปลง</p>
                {product.status === 'share' ? (
                  <div className="text-2xl font-black text-blue-700 mt-0.5">
                    แบ่งปันฟรี <span className="text-xs font-normal text-stone-500">(ร่วมเกื้อกูล/แลกเปลี่ยน)</span>
                  </div>
                ) : (
                  <div className="text-3xl font-black text-brand-700 mt-0.5">
                    ฿{product.price}{' '}
                    <span className="text-sm font-normal text-stone-500">
                      /{product.unit}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-stone-400">
                อัปเดต {product.updatedAt}
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-bold text-stone-900 mb-1.5">
                สรรพคุณ & วิธีผลิตแบบธรรมชาติ:
              </h3>
              <p className={`${getTextClass('body')} text-stone-600 text-sm sm:text-base leading-relaxed`}>
                {product.description}
              </p>
            </div>

            {/* Farm Info Card */}
            {farm && (
              <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-600"></span>
                    <h4 className="font-bold text-stone-900 text-sm">
                      {farm.farmName}
                    </h4>
                  </div>
                  <Link
                    href={`/farms/${farm.id}`}
                    className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>ดูแปลงนี้</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                
                <p className="text-xs text-stone-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span>{farm.publicZone.name} (แสดงรัศมีปลอดภัย)</span>
                </p>
              </div>
            )}

          </div>

          {/* Contact Actions (Protected by Anti-Scam Rules) */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            
            <p className="text-xs font-bold text-stone-500 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ช่องทางติดต่อสั่งซื้อโดยตรงกับเกษตรกร:</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Phone Button */}
              {product.isPublicPhone && product.phone ? (
                <a
                  href={`tel:${product.phone}`}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm sm:text-base shadow-md shadow-brand-600/20 transition-all touch-target-big"
                >
                  <Phone className="w-4 h-4" />
                  <span>โทร {product.phone}</span>
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-stone-100 text-stone-400 text-xs font-semibold border border-stone-200 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5" />
                  <span>ซ่อนเบอร์โทรเพื่อความปลอดภัย</span>
                </div>
              )}

              {/* LINE Button */}
              {product.isPublicLine && product.lineId ? (
                <a
                  href={`https://line.me/R/ti/p/~${product.lineId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm sm:text-base shadow-md shadow-[#06C755]/20 transition-all touch-target-big"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>ทัก LINE: {product.lineId}</span>
                </a>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-stone-100 text-stone-400 text-xs font-semibold border border-stone-200 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5" />
                  <span>ซ่อน LINE ส่วนตัว</span>
                </div>
              )}

            </div>

            {/* Social Share Buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-stone-400 font-medium">บอกต่อของดี:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareLine}
                  className="px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#06C755] text-xs font-bold transition-colors"
                >
                  แชร์ไป LINE
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1877F2] text-xs font-bold transition-colors"
                >
                  แชร์ไป Facebook
                </button>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
                >
                  {copyFeedback ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ================= CROSS-FARM SHOWCASE (ผลผลิตประเภทนี้จากพี่น้องในเครือข่าย) ================= */}
      <div className="bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 bg-brand-100/60 px-2.5 py-0.5 rounded-full mb-1">
              <Layers className="w-3 h-3" />
              <span>เครือข่ายเกื้อกูลกัน</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
              ผลผลิต “{product.skuTagName}” จากแปลงอื่นๆ ใน จ.นครสวรรค์
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              หากต้องการเปรียบเทียบสถานที่ หรือแปลงนี้ผลผลิตหมด สามารถดูจากพี่น้องแปลงอื่นได้ครับ
            </p>
          </div>

          <Link
            href={`/catalog?sku=${product.skuTagId}`}
            className="text-xs font-bold text-brand-700 hover:underline shrink-0"
          >
            ดูทั้งหมดในหมวดนี้ →
          </Link>
        </div>

        {crossFarmProducts.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-stone-200 text-center text-stone-500 text-sm">
            ปัจจุบันยังไม่มีแปลงอื่นลงผลผลิตชนิดนี้เพิ่มเติม หากแปลงของท่านมี สามารถเข้าสู่ระบบเพื่อลงผลผลิตได้ครับ
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {crossFarmProducts.map((other) => (
              <Link
                key={other.id}
                href={`/catalog/${other.id}`}
                className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-brand-300 hover:shadow-xs transition-all flex gap-3 group"
              >
                <img
                  src={other.images[0]}
                  alt={other.title}
                  className="w-16 h-16 rounded-xl object-cover border border-stone-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900 truncate group-hover:text-brand-700">
                    {other.title}
                  </h4>
                  <p className="text-xs text-stone-500 truncate mt-0.5">
                    {other.farmName}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    📍 {other.district}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    {other.status === 'share' ? (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        💙 แบ่งปันฟรี
                      </span>
                    ) : (
                      <span className="text-xs font-black text-brand-700">
                        ฿{other.price} <span className="text-[10px] font-normal text-stone-400">/{other.unit.split(' ')[0]}</span>
                      </span>
                    )}

                    <span className="text-[11px] text-brand-600 font-bold flex items-center gap-0.5">
                      ดู <ChevronRight className="w-3 h-3" />
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
