'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { CategoryTag, MemberProfile, Farm, ProductStatus } from '@/types';
import ImageCropperModal from '@/components/ui/ImageCropperModal';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Check, 
  Sparkles, 
  Layers, 
  HelpCircle,
  EyeOff
} from 'lucide-react';

export default function AddProductPage() {
  const router = useRouter();
  const { getTextClass } = useFontSize();
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [categories, setCategories] = useState<CategoryTag[]>([]);
  const [selectedCatGroup, setSelectedCatGroup] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [selectedSkuTag, setSelectedSkuTag] = useState<CategoryTag | null>(null);
  const [status, setStatus] = useState<ProductStatus>('sale');
  const [price, setPrice] = useState<string>('50');
  const [unit, setUnit] = useState('กิโลกรัม');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('https://images.unsplash.com/photo-1542385151-efd9000785a0?w=800&h=600&fit=crop');

  // Cropper Modal
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = dataService.getCurrentUser();
    if (!user) {
      router.push('/member/register');
      return;
    }
    setCurrentUser(user);
    if (user.farmId) {
      const f = dataService.getFarmById(user.farmId);
      if (f) setFarm(f);
    }
    const cats = dataService.getCategories().filter((c) => c.isActive);
    setCategories(cats);
    if (cats.length > 0) {
      setSelectedSkuTag(cats[0]);
    }
  }, [router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setIsCropperOpen(true);
    }
  };

  const handleCropped = (compressedDataUrl: string) => {
    setImageUrl(compressedDataUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farm) return;
    if (!selectedSkuTag) return;

    setIsSubmitting(true);

    try {
      await dataService.memberAddProduct({
        farmId: farm.id,
        farmName: farm.farmName,
        district: farm.district,
        subdistrict: farm.subdistrict,
        title: title.trim() || `${selectedSkuTag.name} (${farm.farmName})`,
        skuTagId: selectedSkuTag.id,
        skuTagName: selectedSkuTag.name,
        category: selectedSkuTag.category,
        categoryName: 
          selectedSkuTag.category === 'smartfarm' ? 'สมาร์ทฟาร์ม (Smart Farm)' :
          selectedSkuTag.category === 'tool' ? 'อุปกรณ์ เครื่องมือ' :
          selectedSkuTag.category === 'byproduct' ? 'ปัจจัยการผลิต/By-product' :
          selectedSkuTag.category === 'seed' ? 'เมล็ดพันธุ์/กิ่งพันธุ์' :
          selectedSkuTag.category === 'processed' ? 'แปรรูป' : 'ผลผลิตสด',
        status: status,
        price: status === 'share' ? 0 : Number(price) || 0,
        unit: unit,
        description: description.trim() || 'ผลผลิตอินทรีย์วิถีกสิกรรมธรรมชาติ ไร้สารเคมี ปลอดภัยต่อผู้บริโภค',
        images: [imageUrl],
        isPublicPhone: farm.isPublicPhone,
        isPublicLine: farm.isPublicLine,
        phone: farm.isPublicPhone ? farm.phone : undefined,
        lineId: farm.isPublicLine ? farm.lineId : undefined,
      });

      router.push('/member/dashboard');
    } catch (err) {
      console.error('Failed to add product:', err);
      setIsSubmitting(false);
    }
  };

  const commonUnits = ['กิโลกรัม', 'ขวด (1,000 มล.)', 'ถุง (5 กก.)', 'กระสอบ (15 กก.)', 'หวี', 'ชุด/ซอง', 'ชิ้น/เล่ม', 'เตา/ชุด', 'เครื่อง'];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      {/* Back Button */}
      <Link
        href="/member/dashboard"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold text-xs sm:text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปแปลงของฉัน</span>
      </Link>

      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-10 border border-stone-200 shadow-sm space-y-6 sm:space-y-8">
        
        {/* Title */}
        <div>
          <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
            ฟอร์มเรียบง่าย 1 นาที
          </span>
          <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-stone-900 mt-2`}>
            เพิ่มผลผลิต / ของดีประจำแปลง
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            แปลง: <b>{farm?.farmName}</b> ({farm?.district})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* STEP 1: Photo Upload with Auto-compression */}
          <div className="space-y-3">
            <label className="block text-base font-bold text-stone-900">
              1. รูปภาพผลผลิต (ถ่ายสดๆ หรือเลือกจากมือถือ)
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-3xl bg-stone-50 border border-stone-200">
              <div className="relative w-40 h-32 rounded-2xl bg-stone-200 overflow-hidden shrink-0 border border-stone-300">
                <img
                  src={imageUrl}
                  alt="รูปตัวอย่าง"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20 cursor-pointer transition-colors touch-target-big">
                  <Camera className="w-4 h-4" />
                  <span>ถ่ายรูป / เลือกรูปภาพ</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-stone-500">
                  *ระบบจะช่วยย่อรูปภาพให้อัตโนมัติ ไม่เปลืองเน็ตและไม่เปลืองพื้นที่
                </p>
              </div>
            </div>
          </div>

          {/* STEP 2: Pick SKU Category Tag */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-base font-bold text-stone-900">
                2. เลือกชนิดผลผลิต (เพื่อจัดกลุ่ม SKU กับพี่น้องเครือข่าย)
              </label>
              {selectedSkuTag && (
                <span className="text-xs text-brand-700 font-bold bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200 inline-block w-fit">
                  เลือกแล้ว: {selectedSkuTag.icon} {selectedSkuTag.name}
                </span>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'tool', label: '🛠️ อุปกรณ์ เครื่องมือ' },
                { id: 'smartfarm', label: '📡 สมาร์ทฟาร์ม' },
                { id: 'byproduct', label: '🪵 ปัจจัยการผลิต' },
                { id: 'raw', label: '🌾 ผลผลิตสด' },
                { id: 'processed', label: '🍯 แปรรูป' },
                { id: 'seed', label: '🌱 เมล็ดพันธุ์' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCatGroup(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    selectedCatGroup === tab.id
                      ? 'bg-brand-600 text-white shadow-xs font-black'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(selectedCatGroup === 'all' ? categories : categories.filter((c) => c.category === selectedCatGroup)).map((cat) => {
                const isSelected = selectedSkuTag?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedSkuTag(cat);
                      if (!title) setTitle(cat.name);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all touch-target-big ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/80 ring-2 ring-brand-500/20 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{cat.icon}</span>
                    <span className={`text-xs font-bold block truncate ${isSelected ? 'text-brand-900' : 'text-stone-800'}`}>
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-stone-400 block truncate mt-0.5">
                      {cat.category === 'smartfarm' ? '📡 สมาร์ทฟาร์ม' : cat.category === 'tool' ? '🛠️ อุปกรณ์' : cat.category === 'byproduct' ? '🪵 ปัจจัย' : cat.category === 'seed' ? '🌱 เมล็ดพันธุ์' : cat.category === 'processed' ? '🍯 แปรรูป' : '🌾 สด'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Title */}
          <div className="space-y-2">
            <label className="block text-base font-bold text-stone-900">
              3. ชื่อผลผลิตที่ต้องการแสดง
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ถ่านไบโอชาร์อุณหภูมิสูง, กล้วยน้ำว้าอินทรีย์..."
              className="w-full p-4 rounded-2xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* STEP 4: Status & Pricing */}
          <div className="space-y-3">
            <label className="block text-base font-bold text-stone-900">
              4. สถานะและราคา
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('sale')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  status === 'sale'
                    ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-sm font-black text-brand-700 block">🟢 มีจำหน่าย</span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">พร้อมขายสู่ตลาด</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('share')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  status === 'share'
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-sm font-black text-blue-700 block">🔵 แบ่งปันฟรี</span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">ร่วมเกื้อกูล</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('preorder')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  status === 'preorder'
                    ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-sm font-black text-amber-700 block">🟡 สั่งจองล่วงหน้า</span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">ใกล้เก็บเกี่ยว</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('hidden')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  status === 'hidden'
                    ? 'border-rose-600 bg-rose-50 ring-2 ring-rose-500/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-sm font-black text-rose-700 block">🔒 ไม่แสดง</span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">ซ่อนจาก e-Catalog</span>
              </button>
            </div>

            {status === 'hidden' && (
              <div className="p-3 bg-stone-100 border border-stone-200 rounded-2xl text-xs text-stone-700 flex items-start gap-2">
                <EyeOff className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">สถานะ "ไม่แสดง":</p>
                  <p>ผลผลิตนี้จะไม่ปรากฏบนตลาดของดีเครือข่าย (e-Catalog) หรือผลการค้นหาของบุคคลภายนอก จะมองเห็นได้เฉพาะในหน้าแปลงของฉันเท่านั้น</p>
                </div>
              </div>
            )}

            {/* Price Input (if status !== 'share') */}
            {status !== 'share' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    ราคา (บาท)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 text-lg font-bold text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    หน่วยนับ
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 text-base font-semibold text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {commonUnits.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* STEP 5: Description */}
          <div className="space-y-2">
            <label className="block text-base font-bold text-stone-900">
              5. รายละเอียด / สรรพคุณสั้นๆ
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="บอกเล่าวิธีการผลิตอินทรีย์ หรือความพิเศษของผลผลิตนี้..."
              className="w-full p-4 rounded-2xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
            ></textarea>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-stone-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-black text-lg shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all touch-target-big"
            >
              <Check className="w-6 h-6" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและเผยแพร่สู่ E-Catalog'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        file={selectedFile}
        onConfirm={handleCropped}
      />

    </div>
  );
}
