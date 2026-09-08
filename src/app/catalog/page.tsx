'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { Product, SKUGroup } from '@/types';
import { DISTRICTS_NSW } from '@/data/mockData';
import { 
  Search, 
  Filter, 
  Layers, 
  Grid, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Check, 
  Share2, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck 
} from 'lucide-react';

function CatalogContent() {
  const { getTextClass } = useFontSize();
  const searchParams = useSearchParams();
  const initialSku = searchParams.get('sku') || '';

  const [viewMode, setViewMode] = useState<'sku_groups' | 'products'>(initialSku ? 'products' : 'sku_groups');
  const [products, setProducts] = useState<Product[]>([]);
  const [skuGroups, setSkuGroups] = useState<SKUGroup[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ทั้งหมด');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState<string>('ทั้งหมด');
  const [selectedSkuTag, setSelectedSkuTag] = useState<string>(initialSku);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedDistrict, selectedCategory, selectedStatus, selectedSkuTag]);

  const loadData = () => {
    let prods = dataService.getPublicProducts({
      district: selectedDistrict,
      category: selectedCategory,
      status: selectedStatus,
    });

    if (selectedSkuTag) {
      prods = prods.filter((p) => p.skuTagId === selectedSkuTag);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      prods = prods.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.farmName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    setProducts(prods);
    setSkuGroups(
      dataService.getGroupedSKUs({
        district: selectedDistrict,
        category: selectedCategory,
      })
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-emerald-600 to-teal-700 rounded-2xl sm:rounded-3xl p-5 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-1.5 sm:space-y-2">
          <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            ตลาดนัดออนไลน์เครือข่าย
          </span>
          <h1 className={`${getTextClass('title')} text-2xl sm:text-4xl font-extrabold leading-[1.38]`}>
            ของดีกสิกรรมธรรมชาตินครสวรรค์
          </h1>
          <p className={`${getTextClass('body')} text-brand-100 text-xs sm:text-base`}>
            ผลผลิตสด แปรรูป ถ่านไบโอชาร์ อุปกรณ์เครื่องมือ และเมล็ดพันธุ์แบ่งปัน จาก 15 อำเภอ
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs space-y-3 sm:space-y-4">
        
        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา เช่น ถ่านไบโอชาร์, น้ำส้มควันไม้, กล้วย..."
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-full border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm sm:text-base"
            />
          </div>
          <button
            type="submit"
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-full font-bold text-xs sm:text-base transition-colors shrink-0 touch-target-big"
          >
            ค้นหา
          </button>
        </form>

        {/* View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
          
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setViewMode('sku_groups');
                setSelectedSkuTag('');
              }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs sm:text-sm font-bold transition-all touch-target-big ${
                viewMode === 'sku_groups' && !selectedSkuTag
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>กลุ่มผลผลิต</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('products')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs sm:text-sm font-bold transition-all touch-target-big ${
                viewMode === 'products'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>สินค้า ({products.length})</span>
            </button>
          </div>

          {/* District Quick Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs sm:text-sm font-bold text-stone-500 shrink-0">อำเภอ:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-3 py-1.5 sm:py-2 rounded-full border border-stone-200 bg-stone-50 text-xs sm:text-sm font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-auto"
            >
              <option value="ทั้งหมด">ทั้งหมด (15 อำเภอ)</option>
              {DISTRICTS_NSW.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Filter Badges: Categories */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100">
          <span className="text-xs font-bold text-stone-400 shrink-0 mr-1">หมวดหมู่:</span>
          {[
            { id: 'ทั้งหมด', label: 'ทั้งหมด' },
            { id: 'raw', label: '🌾 ผลผลิตสด' },
            { id: 'processed', label: '🍯 แปรรูป' },
            { id: 'byproduct', label: '🪵 ปัจจัยการผลิต' },
            { id: 'seed', label: '🌱 เมล็ดพันธุ์' },
            { id: 'tool', label: '🛠️ อุปกรณ์ เครื่องมือ' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter Badges: Status */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-bold text-stone-400 shrink-0 mr-1">สถานะ:</span>
          {['ทั้งหมด', 'sale', 'share', 'preorder'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                selectedStatus === st
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st === 'ทั้งหมด' && 'ทั้งหมด'}
              {st === 'sale' && '🟢 พร้อมจำหน่าย'}
              {st === 'share' && '🔵 มีแบ่งปันฟรี'}
              {st === 'preorder' && '🟡 สั่งจองล่วงหน้า'}
            </button>
          ))}

          {(selectedSkuTag || selectedCategory !== 'ทั้งหมด' || selectedStatus !== 'ทั้งหมด' || selectedDistrict !== 'ทั้งหมด') && (
            <button
              type="button"
              onClick={() => {
                setSelectedSkuTag('');
                setSelectedCategory('ทั้งหมด');
                setSelectedStatus('ทั้งหมด');
                setSelectedDistrict('ทั้งหมด');
                setSearchQuery('');
              }}
              className="ml-auto text-xs text-rose-600 hover:underline font-bold"
            >
              ✕ ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>

      </div>

      {/* ================= VIEW 1: SKU GROUPS (รวมสินค้าชนิดเดียวกันจากหลายแปลง) ================= */}
      {viewMode === 'sku_groups' && !selectedSkuTag && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              <span>กลุ่มผลผลิตยอดนิยมในจังหวัดนครสวรรค์ ({skuGroups.length} กลุ่ม)</span>
            </h2>
            <span className="text-xs text-stone-500">คลิกที่กลุ่มเพื่อเปรียบเทียบแปลง</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {skuGroups.map((group) => {
              const groupProducts = products.filter((p) => p.skuTagId === group.skuTagId);

              return (
                <div
                  key={group.skuTagId}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs hover:shadow-md hover:border-brand-300 transition-all overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-6 border-b border-stone-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <span className="text-3xl sm:text-4xl p-2 sm:p-3 bg-brand-50 rounded-xl sm:rounded-2xl border border-brand-100 shrink-0">
                        {group.icon}
                      </span>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-stone-900 leading-snug">
                          {group.name}
                        </h3>
                        <span className="inline-block text-[11px] sm:text-xs font-semibold text-brand-700 mt-0.5">
                          {group.categoryName}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-brand-100 text-brand-900 text-[10px] sm:text-xs font-black shrink-0">
                      มี {group.farmCount} แปลง
                    </span>
                  </div>

                  {/* List of Farms Producing This SKU */}
                  <div className="p-3.5 sm:p-6 flex-1 space-y-2 sm:space-y-3 bg-stone-50/50">
                    <p className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-wider">
                      แปลงที่มีผลผลิตนี้:
                    </p>

                    {groupProducts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/catalog/${p.id}`}
                        className="block p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-stone-200 hover:border-brand-400 hover:shadow-xs transition-all group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-stone-800 truncate group-hover:text-brand-700">
                              {p.farmName}
                            </p>
                            <p className="text-[11px] sm:text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span>{p.district}</span>
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            {p.status === 'share' ? (
                              <span className="text-[10px] sm:text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                💙 แบ่งปัน
                              </span>
                            ) : p.price ? (
                              <span className="text-xs sm:text-sm font-black text-brand-700">
                                ฿{p.price} <span className="text-[10px] font-normal text-stone-400">/{p.unit.split(' ')[0]}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Card Action */}
                  <div className="p-3 sm:p-4 bg-white border-t border-stone-100 text-center">
                    <button
                      onClick={() => {
                        setSelectedSkuTag(group.skuTagId);
                        setViewMode('products');
                      }}
                      className="w-full py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-brand-700 hover:bg-brand-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <span>ดูรายละเอียดกลุ่มนี้ ({group.itemCount} รายการ)</span>
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: ALL PRODUCTS (หรือผลผลิตที่เลือกตาม SKU) ================= */}
      {(viewMode === 'products' || selectedSkuTag) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-xl font-bold text-stone-900 flex items-center gap-2 truncate">
              <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 shrink-0" />
              <span className="truncate">
                {selectedSkuTag 
                  ? `หมวด: ${skuGroups.find(g => g.skuTagId === selectedSkuTag)?.name || selectedSkuTag}` 
                  : `ผลผลิตทั้งหมด (${products.length})`}
              </span>
            </h2>
            {selectedSkuTag && (
              <button
                onClick={() => setSelectedSkuTag('')}
                className="text-xs font-bold text-brand-700 hover:underline shrink-0"
              >
                ← ดูทุกหมวด
              </button>
            )}
          </div>

          {products.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl sm:rounded-3xl border border-stone-200">
              <Sparkles className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-base font-bold text-stone-700">ไม่พบผลผลิตตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-stone-400 mt-1">ลองเปลี่ยนอำเภอ หรือล้างตัวกรองเพื่อค้นหาใหม่ครับ</p>
              <button
                onClick={() => {
                  setSelectedDistrict('ทั้งหมด');
                  setSelectedCategory('ทั้งหมด');
                  setSelectedStatus('ทั้งหมด');
                  setSelectedSkuTag('');
                  setSearchQuery('');
                }}
                className="mt-3 px-5 py-2 rounded-full bg-brand-600 text-white font-bold text-xs"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-6">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between group"
                >
                  {/* Image Container with Status Badge */}
                  <div>
                    <Link href={`/catalog/${item.id}`} className="block relative aspect-square sm:aspect-4/3 overflow-hidden bg-stone-100">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=800&h=600&fit=crop';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                        {item.status === 'share' ? (
                          <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-600/90 text-white text-[10px] sm:text-xs font-black shadow-md backdrop-blur-xs flex items-center gap-1">
                            💙 แบ่งปันฟรี
                          </span>
                        ) : item.status === 'preorder' ? (
                          <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-600/90 text-white text-[10px] sm:text-xs font-black shadow-md backdrop-blur-xs">
                            🟡 จอง
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-brand-600/90 text-white text-[10px] sm:text-xs font-black shadow-md backdrop-blur-xs">
                            🟢 มีขาย
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Card Body */}
                    <div className="p-3 sm:p-5 space-y-1.5 sm:space-y-3">
                      <div>
                        <span className="text-[9px] sm:text-[11px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-full">
                          {item.skuTagName}
                        </span>
                        
                        <Link href={`/catalog/${item.id}`}>
                          <h3 className="font-bold text-stone-900 text-xs sm:text-base mt-1 group-hover:text-brand-700 transition-colors line-clamp-2 leading-snug">
                            {item.title}
                          </h3>
                        </Link>

                        <p className="hidden sm:block text-xs text-stone-500 line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      </div>

                      <div className="pt-2 sm:pt-3 border-t border-stone-100 space-y-1 sm:space-y-2">
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                          <Link 
                            href={`/farms/${item.farmId}`}
                            className="font-semibold text-stone-600 hover:text-brand-700 truncate max-w-[90px] sm:max-w-[150px] flex items-center gap-0.5"
                          >
                            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate">{item.farmName}</span>
                          </Link>

                          <span className="text-stone-400 text-[10px] sm:text-xs shrink-0">
                            {item.district}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          {item.status === 'share' ? (
                            <span className="text-[11px] sm:text-xs font-bold text-blue-700">
                              แบ่งปันฟรี
                            </span>
                          ) : (
                            <div className="text-xs sm:text-base font-black text-brand-700">
                              ฿{item.price}{' '}
                              <span className="text-[10px] sm:text-xs font-normal text-stone-400">
                                /{item.unit.split(' ')[0]}
                              </span>
                            </div>
                          )}

                          <Link
                            href={`/catalog/${item.id}`}
                            className="px-2 py-1 sm:px-3 sm:py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[10px] sm:text-xs font-bold transition-colors"
                          >
                            ดูแปลง
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-stone-500 font-bold">
          กำลังโหลดข้อมูลของดีเครือข่าย...
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
