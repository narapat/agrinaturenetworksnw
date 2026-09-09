'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { liffService } from '@/services/liffService';
import { MemberProfile, Farm, Product, hasMemberRole } from '@/types';
import { DISTRICTS_NSW } from '@/data/mockData';
import FarmPhotoUploader from '@/components/ui/FarmPhotoUploader';
import ImageCropperModal from '@/components/ui/ImageCropperModal';
import FarmSlideshow from '@/components/ui/FarmSlideshow';
import { 
  Plus, 
  Shield, 
  Phone, 
  MessageSquare, 
  HelpCircle, 
  Check, 
  Lock, 
  Unlock, 
  AlertCircle, 
  Type, 
  Sparkles,
  ChevronRight,
  UserCheck,
  Edit3,
  Trash2,
  EyeOff,
  X,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

export default function MemberDashboardPage() {
  const router = useRouter();
  const { fontSize, setFontSize, getTextClass } = useFontSize();
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [assistNote, setAssistNote] = useState('');
  const [assistSuccess, setAssistSuccess] = useState(false);

  // Profile Photo Edit State
  const [selectedFaceFile, setSelectedFaceFile] = useState<File | null>(null);
  const [isFaceCropperOpen, setIsFaceCropperOpen] = useState(false);
  const [profileUpdateToast, setProfileUpdateToast] = useState(false);
  const faceFileInputRef = React.useRef<HTMLInputElement>(null);

  // Edit Farm Modal State
  const [showEditFarmModal, setShowEditFarmModal] = useState(false);
  const [editFarmName, setEditFarmName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editStory, setEditStory] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editSubdistrict, setEditSubdistrict] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [farmSaveSuccess, setFarmSaveSuccess] = useState(false);

  // Delete Product Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProd, setIsDeletingProd] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndLoad() {
      let user = dataService.getCurrentUser();
      if (user && hasMemberRole(user)) {
        if (isMounted) processUserFarm(user);
        return;
      }

      // ถ้ายังไม่พบสิทธิ์สมาชิก อาจกำลัง redirect กลับมาจาก LINE Login ให้รอ LIFF init
      try {
        await liffService.init();
      } catch (err) {
        console.warn('LIFF init in dashboard notice:', err);
      }

      if (!isMounted) return;

      user = dataService.getCurrentUser();
      if (!user || !hasMemberRole(user)) {
        router.replace('/member/register');
        return;
      }

      processUserFarm(user);
    }

    checkAuthAndLoad();

    const handleDataUpdated = () => {
      const u = dataService.getCurrentUser();
      if (u && hasMemberRole(u) && isMounted) {
        processUserFarm(u);
      }
    };
    window.addEventListener('nsw_data_updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('nsw_data_updated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
    };
  }, [router]);

  const processUserFarm = (user: MemberProfile) => {
    // ตรวจสอบว่าสมาชิกสร้างฟาร์มแล้วหรือยัง
    const userFarm = user.farmId 
      ? (dataService.getFarmById(user.farmId) || dataService.getFarmByMemberId(user.id))
      : dataService.getFarmByMemberId(user.id);

    if (!userFarm) {
      router.replace('/member/create-farm');
      return;
    }

    // ซิงค์ farmId ให้ตรงกันหากยังไม่ได้ผูก
    if (user.farmId !== userFarm.id) {
      user.farmId = userFarm.id;
      dataService.updateMember(user.id, { farmId: userFarm.id });
    }

    setCurrentUser(user);
    setFarm(userFarm);
    // ส่ง includeHidden: true เพื่อให้เจ้าของแปลงเห็นผลผลิตที่ซ่อนอยู่ได้ในหน้าแดชบอร์ด
    setProducts(dataService.getProductsByFarmId(userFarm.id, true));
    setIsLoadingAuth(false);
  };

  const loadData = () => {
    const user = dataService.getCurrentUser();
    if (user && hasMemberRole(user)) {
      processUserFarm(user);
    }
  };

  const handleTogglePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const isPublic = e.target.checked;
    dataService.updateContactPrivacy(currentUser.id, isPublic, currentUser.isPublicLine);
    loadData();
  };

  const handleToggleLine = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const isPublic = e.target.checked;
    dataService.updateContactPrivacy(currentUser.id, currentUser.isPublicPhone, isPublic);
    loadData();
  };

  const handleRequestAssist = () => {
    if (!currentUser) return;
    dataService.requestAdminAssistance(currentUser.id, assistNote || 'สมาชิกร้องขอให้แอดมินช่วยลงผลผลิตแทน');
    setAssistSuccess(true);
    setTimeout(() => {
      setAssistSuccess(false);
      setShowAssistModal(false);
      loadData();
    }, 2000);
  };

  const handleStatusChange = (productId: string, newStatus: Product['status']) => {
    dataService.updateProductStatus(productId, newStatus);
    loadData();
  };

  const handleOpenEditFarm = () => {
    if (!farm) return;
    setEditFarmName(farm.farmName);
    setEditTagline(farm.tagline || '');
    setEditStory(farm.story || '');
    setEditDistrict(farm.district);
    setEditSubdistrict(farm.subdistrict);
    setEditPhotos(farm.photos ? [...farm.photos] : []);
    setShowEditFarmModal(true);
  };

  const handleSaveFarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farm) return;
    dataService.updateFarm(farm.id, {
      farmName: editFarmName.trim() || farm.farmName,
      tagline: editTagline.trim(),
      story: editStory.trim(),
      district: editDistrict,
      subdistrict: editSubdistrict.trim(),
      photos: editPhotos.length > 0 ? editPhotos : farm.photos,
    });
    setFarmSaveSuccess(true);
    setTimeout(() => {
      setFarmSaveSuccess(false);
      setShowEditFarmModal(false);
      loadData();
    }, 800);
  };

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    setIsDeletingProd(true);
    dataService.deleteProduct(productToDelete.id);
    setTimeout(() => {
      setIsDeletingProd(false);
      setProductToDelete(null);
      loadData();
    }, 500);
  };

  const handleFaceCropConfirm = (croppedUrl: string) => {
    if (!currentUser) return;
    dataService.updateMember(currentUser.id, { facePhotoUrl: croppedUrl });
    setCurrentUser({ ...currentUser, facePhotoUrl: croppedUrl });
    window.dispatchEvent(new Event('nsw_data_updated'));
    setProfileUpdateToast(true);
    setTimeout(() => setProfileUpdateToast(false), 3500);
  };

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-stone-500 text-sm font-medium">กำลังตรวจสอบข้อมูลสมาชิก...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 overflow-hidden">
      
      {/* Toast Notification: Profile Picture Updated */}
      {profileUpdateToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Check className="w-5 h-5 text-white shrink-0" />
          <div>
            <p className="text-sm font-bold">อัพเดทรูปโปรไฟล์สำเร็จ!</p>
            <p className="text-xs text-emerald-100">รูปใหม่ของคุณได้รับการบันทึกและแสดงผลแล้วครับ</p>
          </div>
        </div>
      )}

      {/* Top Welcome Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-6 overflow-hidden w-full">
        {/* Profile Avatar with Camera Overlay */}
        <div className="relative group shrink-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-3 border-brand-200 shadow-md">
            <img
              src={currentUser.facePhotoUrl}
              alt={currentUser.fullName}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={() => faceFileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-md border-2 border-white transition-all hover:scale-110 active:scale-95 touch-target"
            title="กดเพื่อเปลี่ยนรูปโปรไฟล์ของคุณ"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input
            ref={faceFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setSelectedFaceFile(e.target.files[0]);
                setIsFaceCropperOpen(true);
              }
            }}
          />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
            <h1 className={`${getTextClass('title')} text-xl sm:text-3xl font-black text-stone-900`}>
              สวัสดี, {currentUser.fullName}
            </h1>
            {currentUser.status === 'approved' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[11px] sm:text-xs font-bold flex items-center gap-1">
                <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>ยืนยันแล้ว</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] sm:text-xs font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>รออนุมัติ</span>
              </span>
            )}
          </div>
          
          <p className="text-xs sm:text-sm font-semibold text-stone-500">
            แปลง: <b className="text-stone-800">{farm?.farmName || 'ยังไม่ได้ระบุแปลง'}</b> ({farm?.district})
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => faceFileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold border border-brand-200 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>เปลี่ยนรูปโปรไฟล์</span>
            </button>
            {farm && (
              <>
                <button
                  type="button"
                  onClick={handleOpenEditFarm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-brand-50 text-stone-700 hover:text-brand-800 text-xs font-bold border border-stone-200 hover:border-brand-300 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                  <span>✏️ ข้อมูลแปลง & รูปภาพ</span>
                </button>
                <Link
                  href={`/farms/${farm.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold border border-stone-200 transition-colors"
                >
                  <span>🌿 ดูหน้าแปลงสาธารณะ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {currentUser.status === 'pending' && (
            <p className="text-[11px] sm:text-xs text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-1.5 font-medium">
              ⏳ ใบสมัครแปลงอยู่ระหว่างรอแอดมินอนุมัติ ท่านสามารถลงผลผลิตเตรียมไว้ได้เลยครับ
            </p>
          )}
        </div>

        {/* Quick Add Product Button */}
        <Link
          href="/member/add-product"
          className="w-full sm:w-auto px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm sm:text-base shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 shrink-0 touch-target-big transition-colors"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>+ เพิ่มผลผลิตใหม่</span>
        </Link>
      </div>

      {/* Farm Photos Showcase with Auto-Rotating Slideshow */}
      {farm && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-stone-900 text-base sm:text-lg">
                  รูปภาพบรรยากาศแปลง {farm.farmName} ({farm.photos?.length || 0} รูป)
                </h2>
                <p className="text-xs text-stone-500">
                  {farm.photos && farm.photos.length > 1 
                    ? 'แสดงทีละรูปและหมุนเปลี่ยนไปเรื่อยๆ อัตโนมัติในหน้าแปลงสาธารณะ' 
                    : 'อัพโหลดรูปบรรยากาศแปลงเพิ่มเติม เพื่อให้ระบบหมุนแสดงภาพสวยงาม'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenEditFarm}
              className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>+ เพิ่ม/แก้ไขรูปแปลง</span>
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-900">
            <FarmSlideshow
              photos={farm.photos || []}
              farmName={farm.farmName}
              heightClass="h-56 sm:h-72 md:h-80"
              aspectRatioClass="aspect-21/9"
              autoPlayInterval={3500}
              showControls={farm.photos && farm.photos.length > 1}
              showIndicators={farm.photos && farm.photos.length > 1}
              showBadge={farm.photos && farm.photos.length > 1}
              showPlayPause={farm.photos && farm.photos.length > 1}
            />
          </div>
        </div>
      )}

      {/* Grid: Anti-Scam Privacy Settings & Admin Assistance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Anti-Scam Privacy Settings */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-sm space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-base sm:text-lg">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2>ความปลอดภัย & เบอร์ติดต่อ</h2>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            🔒 <b>ซ่อนเบอร์โทรศัพท์เป็นค่าเริ่มต้น</b> ป้องกันมิจฉาชีพและแก๊งคอลเซ็นเตอร์ 100% สลับเปิด-ปิดได้ด้านล่าง
          </div>

          <div className="space-y-2.5 pt-1">
            
            {/* Phone Toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition-colors">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                <div className={`p-2 rounded-xl shrink-0 ${currentUser.isPublicPhone ? 'bg-brand-100 text-brand-700' : 'bg-stone-200 text-stone-400'}`}>
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">แสดงเบอร์โทร ({currentUser.phone})</p>
                  <p className="text-[11px] text-stone-500">
                    {currentUser.isPublicPhone ? '🟢 เปิดให้โทรหาได้' : '🔴 ซ่อนไว้ คนนอกไม่เห็น'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentUser.isPublicPhone}
                onChange={handleTogglePhone}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md text-brand-600 focus:ring-brand-500 accent-brand-600 shrink-0"
              />
            </label>

            {/* LINE Toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition-colors">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
                <div className={`p-2 rounded-xl shrink-0 ${currentUser.isPublicLine ? 'bg-[#06C755]/10 text-[#06C755]' : 'bg-stone-200 text-stone-400'}`}>
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">ปุ่มทัก LINE ({currentUser.lineId})</p>
                  <p className="text-[11px] text-stone-500">
                    {currentUser.isPublicLine ? '🟢 เปิดให้ทักแชทได้' : '🔴 ปิดไว้'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentUser.isPublicLine}
                onChange={handleToggleLine}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-md text-brand-600 focus:ring-brand-500 accent-brand-600 shrink-0"
              />
            </label>

          </div>
        </div>

        {/* 1-Click Admin Assistance (ผู้ช่วยแอดมินสำหรับผู้สูงอายุ) */}
        <div className="bg-gradient-to-br from-emerald-50 to-brand-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-brand-200 shadow-sm space-y-3 sm:space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand-900 font-bold text-base sm:text-lg">
              <HelpCircle className="w-5 h-5 text-brand-700" />
              <h2>บริการผู้ช่วยลงข้อมูล (Assisted Entry)</h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              สำหรับสมาชิกที่ไม่สะดวกพิมพ์ หรือต้องการให้แอดมินช่วยถ่ายทอดข้อมูลลงระบบ 
              กดปุ่มนี้เพื่อส่งคำขอ แอดมินจะช่วยบันทึกข้อมูลแทนให้ทันที
            </p>

            {currentUser.delegationStatus === 'requested' && (
              <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>คำขอของท่านอยู่ในคิวแอดมินแล้วครับ</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowAssistModal(true)}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm sm:text-base shadow-md shadow-brand-700/20 flex items-center justify-center gap-2 transition-all touch-target-big"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>🤝 ขอให้แอดมินช่วยลงข้อมูลแทน</span>
            </button>
          </div>
        </div>

      </div>

      {/* Member's Product Management Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-xl font-black text-stone-900 truncate">
            ผลผลิตในแปลงของฉัน ({products.length} รายการ)
          </h2>
          <Link
            href="/member/add-product"
            className="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-full text-xs font-bold shrink-0 transition-colors whitespace-nowrap"
          >
            + เพิ่มรายการ
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white rounded-2xl sm:rounded-3xl border border-stone-200 space-y-3">
            <p className="text-base font-bold text-stone-700">แปลงของท่านยังไม่มีผลผลิตในระบบ</p>
            <p className="text-xs text-stone-400">กดปุ่มด้านล่างเพื่อเริ่มลงผลผลิตสด ถ่านไบโอชาร์ หรือน้ำส้มควันไม้ได้เลยครับ</p>
            <Link
              href="/member/add-product"
              className="inline-block px-6 py-3 bg-brand-600 text-white font-bold rounded-full text-sm shadow-md"
            >
              + เพิ่มผลผลิตรายการแรก
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {products.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden w-full max-w-full"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=800&h=600&fit=crop';
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover border border-stone-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                        {item.skuTagName}
                      </span>
                      {item.status === 'hidden' && (
                        <span className="text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <EyeOff className="w-3 h-3 text-stone-500" />
                          <span>🔒 ไม่แสดงบน e-Catalog</span>
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-stone-900 text-sm sm:text-base line-clamp-1 mt-0.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-500 font-semibold mt-0.5">
                      {item.status === 'share' ? '💙 แบ่งปันฟรี' : `฿${item.price} / ${item.unit}`}
                    </p>
                  </div>
                </div>

                {/* Right controls: Quick Status Switcher + Edit & Delete Actions */}
                <div className="w-full sm:w-auto pt-2 border-t border-stone-100 sm:pt-0 sm:border-0 flex flex-col sm:items-end gap-2">
                  <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'sale')}
                      className={`py-1.5 px-2 sm:px-2.5 sm:py-1 rounded-xl text-[11px] font-bold transition-all text-center ${
                        item.status === 'sale'
                          ? 'bg-brand-600 text-white shadow-xs font-black'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                      title="ตั้งค่าเป็นมีจำหน่าย"
                    >
                      🟢 มีขาย
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'share')}
                      className={`py-1.5 px-2 sm:px-2.5 sm:py-1 rounded-xl text-[11px] font-bold transition-all text-center ${
                        item.status === 'share'
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                      title="ตั้งค่าเป็นแบ่งปันฟรี"
                    >
                      🔵 แบ่งปัน
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'out_of_stock')}
                      className={`py-1.5 px-2 sm:px-2.5 sm:py-1 rounded-xl text-[11px] font-bold transition-all text-center ${
                        item.status === 'out_of_stock'
                          ? 'bg-stone-800 text-white shadow-xs font-black'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                      title="ตั้งค่าเป็นหมดชั่วคราว"
                    >
                      ⚪ หมด
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'hidden')}
                      className={`py-1.5 px-2 sm:px-2.5 sm:py-1 rounded-xl text-[11px] font-bold transition-all text-center ${
                        item.status === 'hidden'
                          ? 'bg-stone-700 text-white shadow-xs font-black'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                      title="ตั้งค่าเป็นไม่แสดงใน e-Catalog"
                    >
                      🔒 ซ่อน
                    </button>
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-0.5">
                    <Link
                      href={`/member/edit-product/${item.id}`}
                      className="px-3 py-1 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold border border-brand-200 flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(item)}
                      className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Assist Request Modal */}
      {showAssistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-brand-900 font-bold text-lg">
              <HelpCircle className="w-6 h-6 text-brand-700" />
              <h3>ส่งคำขอให้แอดมินช่วยลงข้อมูล</h3>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              เพียงพิมพ์บอกสั้นๆ ว่าต้องการให้ช่วยลงผลผลิตอะไร หรือถ่ายรูปส่งไว้ใน LINE เครือข่ายได้เลยครับ
            </p>

            <textarea
              rows={3}
              value={assistNote}
              onChange={(e) => setAssistNote(e.target.value)}
              placeholder="เช่น มีกล้วยน้ำว้า 50 หวี และถ่านไบโอชาร์ 20 ถุง วานแอดมินช่วยลงข้อมูลให้ทีจ้า..."
              className="w-full p-3 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            ></textarea>

            {assistSuccess && (
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl text-xs font-bold text-brand-900 text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-brand-600" />
                <span>ส่งคำขอสำเร็จ! แอดมินได้รับแจ้งเตือนแล้วครับ</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAssistModal(false)}
                className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleRequestAssist}
                disabled={assistSuccess}
                className="flex-1 py-3 rounded-2xl bg-brand-700 text-white font-bold text-sm hover:bg-brand-800 shadow-md shadow-brand-700/20"
              >
                ยืนยันส่งคำขอ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Farm Modal */}
      {showEditFarmModal && farm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl p-5 sm:p-8 space-y-5 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-lg sm:text-xl">
                <Edit3 className="w-5 h-5 text-brand-600" />
                <h3>แก้ไขข้อมูลแปลง & รูปภาพ</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditFarmModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFarm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ชื่อแปลง / สวน / ศูนย์เรียนรู้ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFarmName}
                  onChange={(e) => setEditFarmName(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  สโลแกนหรือแนวคิดของแปลง
                </label>
                <input
                  type="text"
                  value={editTagline}
                  onChange={(e) => setEditTagline(e.target.value)}
                  placeholder="เช่น คืนชีวิตให้ดินด้วยถ่านไบโอชาร์..."
                  className="w-full p-3 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    อำเภอ (จ.นครสวรรค์) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    className="w-full p-3 rounded-2xl border border-stone-200 text-sm font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {DISTRICTS_NSW.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ตำบล
                  </label>
                  <input
                    type="text"
                    value={editSubdistrict}
                    onChange={(e) => setEditSubdistrict(e.target.value)}
                    placeholder="เช่น หนองกรด, เกยไชย..."
                    className="w-full p-3 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  เรื่องเล่า & ปรัชญากสิกรรมธรรมชาติของแปลง
                </label>
                <textarea
                  rows={3}
                  value={editStory}
                  onChange={(e) => setEditStory(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                ></textarea>
              </div>

              {/* Multi-Photo Farm Uploader */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <FarmPhotoUploader
                  photos={editPhotos}
                  onChange={setEditPhotos}
                  label="รูปภาพบรรยากาศแปลง / ศูนย์เรียนรู้"
                  description="อัพโหลดได้หลายรูป ระบบจะย่อขนาดให้อัตโนมัติและแสดงผลแบบภาพวน (Slideshow) ในหน้าแปลง"
                />
              </div>

              {farmSaveSuccess && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl text-xs font-bold text-brand-900 text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-brand-600" />
                  <span>บันทึกข้อมูลแปลงสำเร็จแล้ว!</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditFarmModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={farmSaveSuccess}
                  className="flex-1 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20"
                >
                  💾 บันทึกข้อมูลแปลง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-stone-900 text-lg">
                ยืนยันการลบผลผลิต?
              </h3>
              <p className="text-xs text-stone-500">
                คุณต้องการลบ <b>"{productToDelete.title}"</b> ออกจากระบบใช่หรือไม่ การลบนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProd}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingProd}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20"
              >
                {isDeletingProd ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Photo Cropper Modal */}
      <ImageCropperModal
        isOpen={isFaceCropperOpen}
        onClose={() => {
          setIsFaceCropperOpen(false);
          setSelectedFaceFile(null);
        }}
        file={selectedFaceFile}
        onConfirm={handleFaceCropConfirm}
        aspectRatio={1}
      />

    </div>
  );
}
