'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService, DEMO_MEMBER_IDS } from '@/services/dataService';
import { liffService } from '@/services/liffService';
import { MemberProfile, Farm, Product, hasMemberRole } from '@/types';
import { DISTRICTS_NSW, FARM_PRACTICE_OPTIONS } from '@/data/mockData';
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
  Image as ImageIcon,
  Loader2
} from 'lucide-react';

export default function MemberDashboardPage() {
  const router = useRouter();
  const { fontSize, setFontSize, getTextClass } = useFontSize();
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLineGateRequired, setIsLineGateRequired] = useState(false);
  const [isConnectingLine, setIsConnectingLine] = useState(false);
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
  const [editPractices, setEditPractices] = useState<string[]>([]);
  const [practiceOptions, setPracticeOptions] = useState<string[]>(FARM_PRACTICE_OPTIONS);
  const [isSavingPractices, setIsSavingPractices] = useState(false);
  const [practicesSavedToast, setPracticesSavedToast] = useState(false);
  const [isSavingFarm, setIsSavingFarm] = useState(false);
  const [farmSaveSuccess, setFarmSaveSuccess] = useState(false);
  const [farmSaveError, setFarmSaveError] = useState<string | null>(null);

  // Delete Product Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProd, setIsDeletingProd] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndLoad() {
      try {
        await Promise.all([
          dataService.ensureFirestoreSync(true),
          liffService.init(),
        ]);
      } catch (err) {
        console.warn('Dashboard auth init notice:', err);
      }

      if (!isMounted) return;

      const user = dataService.getCurrentUser();
      if (!user || !hasMemberRole(user)) {
        router.replace('/member/register?from_line=1');
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

    setPracticeOptions(dataService.getActivePracticeNames());

    // ซิงค์ farmId ให้ตรงกันหากแปลงมีอยู่จริง
    if (userFarm && user.farmId !== userFarm.id) {
      user.farmId = userFarm.id;
      dataService.updateMember(user.id, { farmId: userFarm.id });
    }

    const isDemo = DEMO_MEMBER_IDS.includes(user.id);
    const lineProf = liffService.getProfile();

    // 🌟 บังคับผูก LINE ก่อนไปต่อ สำหรับสมาชิกจริง (ไม่ว่าสถานะจะเป็น approved หรือ pending)
    if (!isDemo) {
      // ตรวจสอบว่ามี LINE Profile เชื่อมต่ออยู่ในเบราว์เซอร์นี้หรือไม่
      if (!lineProf) {
        setIsLineGateRequired(true);
        setCurrentUser(user);
        setFarm(userFarm || null);
        setIsLoadingAuth(false);
        return;
      }
    }

    setIsLineGateRequired(false);

    // ซิงค์ lineUserId เข้ากับ LINE Profile อัตโนมัติหากยังไม่ได้ผูก
    if (lineProf && (!user.lineUserId || user.lineUserId !== lineProf.userId)) {
      user.lineUserId = lineProf.userId;
      if (!user.facePhotoUrl || user.facePhotoUrl.includes('unsplash')) {
        user.facePhotoUrl = lineProf.pictureUrl || user.facePhotoUrl;
      }
      dataService.updateMember(user.id, { 
        lineUserId: lineProf.userId,
        facePhotoUrl: user.facePhotoUrl,
      });
    }

    setCurrentUser(user);
    if (userFarm) {
      setFarm(userFarm);
      setEditPractices(userFarm.practices ? [...userFarm.practices] : []);
      // ส่ง includeHidden: true เพื่อให้เจ้าของแปลงเห็นผลผลิตที่ซ่อนอยู่ได้ในหน้าแดชบอร์ด
      setProducts(dataService.getProductsByFarmId(userFarm.id, true));
    } else {
      setFarm(null);
      setEditPractices([]);
      setProducts([]);
    }
    setIsLoadingAuth(false);
  };

  const loadData = () => {
    const user = dataService.getCurrentUser();
    if (user && hasMemberRole(user)) {
      processUserFarm(user);
    }
  };

  const handleTogglePractice = (item: string) => {
    setEditPractices((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    );
  };

  const handleSavePracticesDirect = async () => {
    if (!farm) return;
    setIsSavingPractices(true);
    try {
      const updated = await dataService.updateFarm(farm.id, {
        practices: [...editPractices],
      });
      if (updated) {
        setFarm({ ...updated });
      }
      setPracticesSavedToast(true);
      setTimeout(() => setPracticesSavedToast(false), 3500);
      loadData();
    } catch (err) {
      console.error('Failed to update farm practices:', err);
    } finally {
      setIsSavingPractices(false);
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
    setEditPractices(farm.practices ? [...farm.practices] : []);
    setFarmSaveError(null);
    setShowEditFarmModal(true);
  };

  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farm) return;
    setIsSavingFarm(true);
    setFarmSaveError(null);
    try {
      const updated = await dataService.updateFarm(farm.id, {
        farmName: editFarmName.trim() || farm.farmName,
        tagline: editTagline.trim(),
        story: editStory.trim(),
        district: editDistrict,
        subdistrict: editSubdistrict.trim(),
        photos: [...editPhotos],
        practices: [...editPractices],
      });
      if (updated) {
        setFarm({ ...updated });
        setFarmSaveSuccess(true);
        setTimeout(() => {
          setFarmSaveSuccess(false);
          setShowEditFarmModal(false);
          loadData();
        }, 800);
      } else {
        setFarmSaveError('ไม่สามารถบันทึกข้อมูลแปลงได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      console.error('Error saving farm:', err);
      setFarmSaveError('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + (err?.message || 'กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setIsSavingFarm(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeletingProd(true);
    await dataService.deleteProduct(productToDelete.id);
    setIsDeletingProd(false);
    setProductToDelete(null);
    loadData();
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

  // 🌟 บังคับเชื่อมต่อ LINE ก่อนเข้าจัดการแปลง (ไม่ว่า admin จะอนุมัติหรือไม่อนุมัติ)
  if (isLineGateRequired && currentUser) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
          {/* Green LINE Icon Header */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center shadow-inner">
            <MessageSquare className="w-10 h-10 fill-current" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              <span>🌿 ระบบสมาชิกเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900">
              กรุณาเชื่อมต่อบัญชี LINE
            </h1>
            <p className="text-sm sm:text-base text-stone-600">
              เพื่อความปลอดภัยและใช้เป็นกุญแจสำคัญในการเข้าจัดการแปลงกสิกรรมของคุณ
            </p>
          </div>

          {/* Farm & Member Preview Box (ยืนยันว่าข้อมูลเดิมยังอยู่ครบถ้วน) */}
          <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">ข้อมูลแปลงของคุณ:</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                currentUser.status === 'approved' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {currentUser.status === 'approved' ? '✓ อนุมัติแล้ว' : '⏳ รอแอดมินอนุมัติ'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              {currentUser.facePhotoUrl ? (
                <img src={currentUser.facePhotoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-stone-300 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold shrink-0">
                  {currentUser.fullName.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-stone-900 text-base truncate">{currentUser.fullName}</p>
                <p className="text-xs text-stone-600 truncate">🏡 แปลง: {farm?.farmName || 'แปลงกสิกรรมธรรมชาติ'}</p>
                <p className="text-xs text-stone-500 truncate">📍 อ.{farm?.district || '-'} จ.นครสวรรค์</p>
              </div>
            </div>
          </div>

          {/* Explanation Features */}
          <div className="grid grid-cols-1 gap-2.5 text-left pt-1">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs sm:text-sm text-stone-700">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span>ข้อมูลใบสมัครและแปลงของคุณบันทึกเรียบร้อย 100% ไม่สูญหาย</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs sm:text-sm text-stone-700">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span>เชื่อมต่อ LINE เพื่อใช้จัดการผลผลิตและเข้าหน้าแปลงอัตโนมัติ</span>
            </div>
          </div>

          {/* LINE Connect Action Button */}
          <div className="space-y-3 pt-2">
            <button
              onClick={async () => {
                setIsConnectingLine(true);
                try {
                  await liffService.login('/member/dashboard');
                } catch (err) {
                  console.error('LIFF login error:', err);
                  setIsConnectingLine(false);
                }
              }}
              disabled={isConnectingLine}
              className="w-full py-4 px-6 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-base sm:text-lg shadow-lg shadow-[#06C755]/25 flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-75 cursor-pointer"
            >
              {isConnectingLine ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังเชื่อมต่อ LINE...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-6 h-6 fill-current" />
                  <span>เข้าสู่ระบบด้วย LINE เพื่อผูกบัญชีแปลง</span>
                </>
              )}
            </button>

            <p className="text-xs text-stone-400">
              🔒 ปลอดภัยตามมาตรฐาน LINE Official และ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
            </p>
          </div>
        </div>
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
            แปลง: <b className="text-stone-800">{farm?.farmName || 'ยังไม่มีข้อมูลแปลงในระบบ'}</b> {farm?.district ? `(${farm.district})` : ''}
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

        {/* Quick Add Product Button (only if farm exists) */}
        {farm ? (
          <Link
            href="/member/add-product"
            className="w-full sm:w-auto px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm sm:text-base shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 shrink-0 touch-target-big transition-colors"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>+ เพิ่มผลผลิตใหม่</span>
          </Link>
        ) : (
          <Link
            href="/member/create-farm"
            className="w-full sm:w-auto px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0 touch-target-big transition-colors"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>+ สร้างแปลงกสิกรรม</span>
          </Link>
        )}
      </div>

      {/* Missing Farm Notice Card (ถ้ายังไม่มีข้อมูลแปลงในระบบ) */}
      {!farm && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-amber-950">
              ยังไม่พบข้อมูลแปลงกสิกรรมของท่านในระบบ
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              บัญชีสมาชิกของท่านเชื่อมต่อแล้ว แต่ยังไม่มีรายละเอียดแปลงกสิกรรมธรรมชาติ (หรืออาจกำลังอยู่ระหว่างการสร้าง) เพื่อให้แปลงของท่านปรากฏในเครือข่าย กรุณากดสร้างข้อมูลแปลงด้านล่างครับ
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/member/create-farm"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>+ สร้างข้อมูลแปลงกสิกรรมทันที</span>
            </Link>
          </div>
        </div>
      )}

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

      {/* 5. Natural Agriculture Practices Section (วิถีและศาสตร์ที่ทำในแปลง) */}
      {farm && (
        <div id="farm-practices-section" className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-stone-900 text-base sm:text-lg">
                  5. วิถีและศาสตร์ที่ท่านทำในแปลง (เลือกได้หลายข้อ)
                </h2>
                <p className="text-xs text-stone-500">
                  เลือกศาสตร์และวิถีกสิกรรมธรรมชาติที่ปฏิบัติจริงในแปลง กดเลือกและบันทึกได้ทันที
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSavePracticesDirect}
              disabled={isSavingPractices}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              {isSavingPractices ? (
                <span>กำลังบันทึก...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>💾 บันทึกวิถีและศาสตร์</span>
                </>
              )}
            </button>
          </div>

          {practicesSavedToast && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>บันทึกข้อมูลวิถีและศาสตร์ที่ทำในแปลงสำเร็จแล้ว! ข้อมูลจะอัพเดตในหน้าแปลงทันที</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {practiceOptions.map((opt) => {
              const isSelected = editPractices.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleTogglePractice(opt)}
                  className={`p-3 sm:p-4 rounded-2xl border text-left text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-98 ${
                    isSelected
                      ? 'border-2 border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs'
                      : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <span className={`text-base leading-none shrink-0 ${isSelected ? 'text-emerald-600 font-black' : 'text-stone-400'}`}>
                    {isSelected ? '✓' : '+'}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </button>
              );
            })}
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
            🔒 <b>ซ่อนเบอร์โทรศัพท์เป็นค่าเริ่มต้น</b> เพื่อความเป็นส่วนตัวและความปลอดภัย สลับเปิด-ปิดได้ด้านล่าง
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

              {/* 5. Practices in Modal */}
              <div className="space-y-2 p-3 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <label className="block text-xs font-bold text-stone-700">
                  5. วิถีและศาสตร์ที่ท่านทำในแปลง (เลือกได้หลายข้อ)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {practiceOptions.map((opt) => {
                    const isSelected = editPractices.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleTogglePractice(opt)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'border-2 border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-xs'
                            : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <span className={`text-sm leading-none shrink-0 ${isSelected ? 'text-emerald-600 font-black' : 'text-stone-400'}`}>
                          {isSelected ? '✓' : '+'}
                        </span>
                        <span className="truncate">{opt}</span>
                      </button>
                    );
                  })}
                </div>
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

              {farmSaveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 text-center">
                  ⚠️ {farmSaveError}
                </div>
              )}

              {farmSaveSuccess && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-2xl text-xs font-bold text-brand-900 text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-brand-600" />
                  <span>บันทึกข้อมูลแปลงสำเร็จแล้ว!</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSavingFarm}
                  onClick={() => setShowEditFarmModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingFarm || farmSaveSuccess}
                  className="flex-1 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:bg-stone-300 text-white font-bold text-sm shadow-md shadow-brand-600/20 flex items-center justify-center gap-2"
                >
                  {isSavingFarm ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>กำลังบันทึกข้อมูล & บีบอัดรูป...</span>
                    </>
                  ) : (
                    <>💾 บันทึกข้อมูลแปลง</>
                  )}
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
