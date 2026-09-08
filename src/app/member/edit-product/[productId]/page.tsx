'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { CategoryTag, MemberProfile, Farm, Product, ProductStatus } from '@/types';
import ImageCropperModal from '@/components/ui/ImageCropperModal';
import { 
  ArrowLeft, 
  Camera, 
  Check, 
  Trash2, 
  AlertTriangle, 
  EyeOff,
  Sparkles
} from 'lucide-react';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { getTextClass } = useFontSize();

  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [categories, setCategories] = useState<CategoryTag[]>([]);
  const [selectedCatGroup, setSelectedCatGroup] = useState<string>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [selectedSkuTag, setSelectedSkuTag] = useState<CategoryTag | null>(null);
  const [status, setStatus] = useState<ProductStatus>('sale');
  const [price, setPrice] = useState<string>('0');
  const [unit, setUnit] = useState('กิโลกรัม');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');

  // Image Cropper Modal
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  // States for submission and deletion
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const user = dataService.getCurrentUser();
    if (!user) {
      router.push('/member/register');
      return;
    }
    setCurrentUser(user);

    const prod = dataService.getRawProductById(productId);
    if (!prod) {
      setErrorMsg('ไม่พบข้อมูลผลผลิตนี้ในระบบ หรือผลผลิตอาจถูกลบไปแล้ว');
      return;
    }

    // Check permission: must be owner or admin
    const isOwner = user.farmId === prod.farmId;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      setErrorMsg('ท่านไม่มีสิทธิ์แก้ไขผลผลิตของแปลงอื่น');
      return;
    }

    setProduct(prod);
    setTitle(prod.title);
    setStatus(prod.status);
    setPrice(prod.price ? String(prod.price) : '0');
    setUnit(prod.unit || 'กิโลกรัม');
    setDescription(prod.description || '');
    setImageUrl(prod.images && prod.images.length > 0 ? prod.images[0] : '');

    const f = dataService.getFarmById(prod.farmId);
    if (f) setFarm(f);

    const cats = dataService.getCategories().filter((c) => c.isActive);
    setCategories(cats);

    const currentCat = cats.find((c) => c.id === prod.skuTagId);
    if (currentCat) {
      setSelectedSkuTag(currentCat);
    } else if (cats.length > 0) {
      setSelectedSkuTag(cats[0]);
    }
  }, [productId, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setIsCropperOpen(true);
    }
  };

  const handleCropped = (compressedDataUrl: string) => {
    setImageUrl(compressedDataUrl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !selectedSkuTag) return;

    setIsSubmitting(true);

    const categoryName = 
      selectedSkuTag.category === 'smartfarm' ? 'สมาร์ทฟาร์ม (Smart Farm)' :
      selectedSkuTag.category === 'tool' ? 'อุปกรณ์ เครื่องมือ' :
      selectedSkuTag.category === 'byproduct' ? 'ปัจจัยการผลิต/By-product' :
      selectedSkuTag.category === 'seed' ? 'เมล็ดพันธุ์/กิ่งพันธุ์' :
      selectedSkuTag.category === 'processed' ? 'แปรรูป' : 'ผลผลิตสด';

    dataService.updateProduct(productId, {
      title: title.trim() || product.title,
      skuTagId: selectedSkuTag.id,
      skuTagName: selectedSkuTag.name,
      category: selectedSkuTag.category,
      categoryName: categoryName,
      status: status,
      price: status === 'share' ? 0 : Number(price) || 0,
      unit: unit,
      description: description.trim() || 'ผลผลิตวิถีกสิกรรมธรรมชาติ',
      images: [imageUrl || product.images[0]],
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/member/dashboard');
    }, 800);
  };

  const handleDelete = () => {
    if (!product) return;
    setIsDeleting(true);
    dataService.deleteProduct(product.id);
    setTimeout(() => {
      setIsDeleting(false);
      setShowDeleteModal(false);
      router.push('/member/dashboard');
    }, 600);
  };

  const commonUnits = ['กิโลกรัม', 'ขวด (1,000 มล.)', 'ถุง (5 กก.)', 'กระสอบ (15 กก.)', 'หวี', 'ชุด/ซอง', 'ชิ้น/เล่ม', 'เตา/ชุด', 'เครื่อง'];

  if (errorMsg) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="p-4 rounded-full bg-rose-100 text-rose-600 w-16 h-16 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">{errorMsg}</h2>
        <Link
          href="/member/dashboard"
          className="inline-block px-6 py-2.5 rounded-full bg-brand-600 text-white font-bold text-sm"
        >
          กลับไปแปลงของฉัน
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-stone-400">
        กำลังโหลดข้อมูลผลผลิต...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      {/* Back Button & View Public Page */}
      <div className="flex items-center justify-between">
        <Link
          href="/member/dashboard"
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold text-xs sm:text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปแปลงของฉัน</span>
        </Link>

        {status !== 'hidden' && (
          <Link
            href={`/catalog/${product.id}`}
            className="text-xs text-brand-700 hover:underline font-bold"
          >
            ดูหน้าแสดงผลใน e-Catalog ↗
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-10 border border-stone-200 shadow-sm space-y-6 sm:space-y-8">
        
        {/* Title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                ✏️ โหมดแก้ไขข้อมูลผลผลิต
              </span>
              {status === 'hidden' && (
                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-bold flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>ไม่แสดงใน e-Catalog</span>
                </span>
              )}
            </div>
            <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-stone-900 mt-2`}>
              แก้ไขข้อมูลผลผลิต
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              แปลง: <b>{farm?.farmName || product.farmName}</b> ({product.district})
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors touch-target-big shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">ลบรายการนี้</span>
          </button>
        </div>

        {isSaved && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-sm flex items-center gap-2 animate-in fade-in">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>บันทึกการแก้ไขเรียบร้อยแล้ว กำลังนำท่านกลับสู่หน้าหลัก...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* STEP 1: Photo Upload with Auto-compression */}
          <div className="space-y-3">
            <label className="block text-base font-bold text-stone-900">
              1. รูปภาพผลผลิต
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
                <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-sm shadow-md cursor-pointer transition-colors touch-target-big">
                  <Camera className="w-4 h-4" />
                  <span>เปลี่ยนรูปภาพใหม่</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-stone-500">
                  *ระบบจะช่วยตัดและย่อภาพให้อัตโนมัติ สัดส่วนสวยงาม
                </p>
              </div>
            </div>
          </div>

          {/* STEP 2: Pick SKU Category Tag */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-base font-bold text-stone-900">
                2. ชนิดผลผลิต / กลุ่มของดี (SKU Tag)
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('sale')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  status === 'sale'
                    ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-sm font-black text-brand-700 block">🟢 มีขาย</span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">พร้อมจำหน่าย</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('share')}
                className={`p-3 rounded-2xl border text-left transition-all ${
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
                className={`p-3 rounded-2xl border text-left transition-all ${
                  status === 'preorder'
                    ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-sm font-black text-amber-700 block">🟡 จองล่วงหน้า</span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">ใกล้เก็บเกี่ยว</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('out_of_stock')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  status === 'out_of_stock'
                    ? 'border-stone-700 bg-stone-100 ring-2 ring-stone-700/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <span className="text-sm font-black text-stone-700 block">⚪ หมด</span>
                <span className="text-[11px] text-stone-500 mt-0.5 block">พักจำหน่าย</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('hidden')}
                className={`p-3 rounded-2xl border text-left transition-all ${
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
                    ราคา (บาท) {status === 'hidden' && '(ซ่อนไว้)'}
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
              5. รายละเอียด / เรื่องเล่าสรรพคุณ
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="บอกเล่าวิธีการผลิตอินทรีย์ หรือความพิเศษของผลผลิตนี้..."
              className="w-full p-4 rounded-2xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
            ></textarea>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-4 px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-black text-base sm:text-lg shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all touch-target-big"
            >
              <Check className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}</span>
            </button>

            <Link
              href="/member/dashboard"
              className="w-full sm:w-auto px-6 py-4 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold text-center text-sm sm:text-base transition-colors touch-target-big"
            >
              ยกเลิก
            </Link>
          </div>

        </form>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-stone-900">
                ยืนยันการลบผลผลิต?
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                คุณกำลังจะลบ <b>"{product.title}"</b> ออกจากระบบ การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-colors"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

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
