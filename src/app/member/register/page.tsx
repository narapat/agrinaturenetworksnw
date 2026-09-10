'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { liffService } from '@/services/liffService';
import { DISTRICTS_NSW } from '@/data/mockData';
import { hasMemberRole } from '@/types';
import ImageCropperModal from '@/components/ui/ImageCropperModal';
import FarmPhotoUploader from '@/components/ui/FarmPhotoUploader';
import { 
  ArrowLeft, 
  Camera, 
  Check, 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  Sparkles,
  MapPin,
  Phone,
  MessageSquare,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function MemberRegisterPage() {
  const router = useRouter();
  const { getTextClass } = useFontSize();

  // Form State
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [tagline, setTagline] = useState('');
  const [district, setDistrict] = useState(DISTRICTS_NSW[0]);
  const [subdistrict, setSubdistrict] = useState('');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [trainingCourse, setTrainingCourse] = useState('');
  const [trainingLocation, setTrainingLocation] = useState('');
  const [story, setStory] = useState('');
  const [isPublicPhone, setIsPublicPhone] = useState(false); // ค่าเริ่มต้น: ซ่อนเบอร์โทร (Anti-Scam)
  const [isPublicLine, setIsPublicLine] = useState(true);
  const [selectedPractices, setSelectedPractices] = useState<string[]>(['โคก หนอง นา', 'กสิกรรมธรรมชาติ']);
  const [farmPhotos, setFarmPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop'
  ]);

  // Face Photo & Crop
  const [facePhotoUrl, setFacePhotoUrl] = useState(
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces'
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // LINE Auth Profile State
  const [isCheckingLine, setIsCheckingLine] = useState(true);
  const [lineProfile, setLineProfile] = useState<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkUserAndLine = () => {
      const profile = liffService.getProfile();
      if (profile) {
        setLineProfile(profile);
        setFullName((prev) => prev || profile.displayName || '');
        setLineId((prev) => prev || profile.displayName || '');
        if (profile.pictureUrl) {
          setFacePhotoUrl((prev) => (prev.includes('unsplash') ? profile.pictureUrl! : prev));
        }
      }

      const user = dataService.getCurrentUser();
      // ถ้ามี user อยู่แล้ว ตรวจสอบว่าตรงกับ LINE Profile หรือไม่
      if (user && hasMemberRole(user)) {
        // หากผู้ใช้เชื่อมต่อ LINE มา แต่ user ในระบบไม่ใช่บัญชีที่ผูกกับ LINE นี้ (เช่น demo account) ห้ามเด้งหนี
        if (profile && user.lineUserId && user.lineUserId !== profile.userId) {
          return;
        }

        const userFarm = user.farmId 
          ? (dataService.getFarmById(user.farmId) || dataService.getFarmByMemberId(user.id))
          : dataService.getFarmByMemberId(user.id);

        if (userFarm) {
          router.replace('/member/dashboard');
        } else {
          router.replace('/member/create-farm');
        }
        return;
      }
    };

    checkUserAndLine();
    dataService.ensureFirestoreSync().then(() => {
      liffService.init().then(() => {
        if (isMounted) {
          checkUserAndLine();
          setIsCheckingLine(false);
        }
      });
    });

    window.addEventListener('nsw_data_updated', checkUserAndLine);
    window.addEventListener('storage', checkUserAndLine);
    return () => {
      isMounted = false;
      window.removeEventListener('nsw_data_updated', checkUserAndLine);
      window.removeEventListener('storage', checkUserAndLine);
    };
  }, [router]);

  const [practiceOptions, setPracticeOptions] = useState<string[]>([]);

  useEffect(() => {
    setPracticeOptions(dataService.getActivePracticeNames());
  }, []);

  const handleTogglePractice = (item: string) => {
    if (selectedPractices.includes(item)) {
      setSelectedPractices(selectedPractices.filter((p) => p !== item));
    } else {
      setSelectedPractices([...selectedPractices, item]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setIsCropperOpen(true);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // กรองให้อยู่ในรูปแบบตัวเลขและขีดเท่านั้น ความยาวไม่เกิน 20
    const cleaned = val.replace(/[^\d+-]/g, '').slice(0, 20);
    setPhone(cleaned);

    const digitsOnly = cleaned.replace(/[^\d]/g, '');
    if (digitsOnly.length > 0 && (digitsOnly.length < 9 || digitsOnly.length > 10)) {
      setPhoneError('เบอร์โทรศัพท์ควรมีความยาว 9-10 หลัก (เช่น 081-234-5678)');
    } else {
      setPhoneError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineProfile) {
      alert('กรุณาเข้าสู่ระบบด้วย LINE ก่อนทำการลงทะเบียนครับ');
      return;
    }

    const cleanName = fullName.trim();
    const cleanFarm = farmName.trim();
    const digitsOnly = phone.replace(/[^\d]/g, '');

    if (cleanName.length < 2) {
      setErrorMessage('กรุณาระบุชื่อ-นามสกุล หรือชื่อเรียกให้ถูกต้อง (อย่างน้อย 2 ตัวอักษร)');
      return;
    }
    if (cleanFarm.length < 2) {
      setErrorMessage('กรุณาระบุชื่อแปลง / สวน / ศูนย์เรียนรู้ (อย่างน้อย 2 ตัวอักษร)');
      return;
    }
    if (digitsOnly.length < 9 || digitsOnly.length > 10) {
      setPhoneError('กรุณากรอกเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง (เช่น 081-234-5678)');
      setErrorMessage('กรุณาตรวจสอบความถูกต้องของเบอร์โทรศัพท์');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('saving');
    setErrorMessage('');

    try {
      const res = await dataService.registerNewMember({
        fullName: cleanName,
        facePhotoUrl,
        farmName: cleanFarm,
        tagline: tagline.trim() || 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง',
        story: story.trim() || 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์',
        district,
        subdistrict: subdistrict.trim() || 'เมือง',
        phone: phone.trim(),
        lineId: lineId.trim() || lineProfile.displayName || phone.trim(),
        lineUserId: lineProfile.userId,
        trainingCourse: trainingCourse.trim(),
        trainingLocation: trainingLocation.trim(),
        isPublicPhone,
        isPublicLine,
        practices: selectedPractices,
        photos: farmPhotos,
      });

      if (res.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          router.push('/member/dashboard');
        }, 1600);
      } else {
        setSubmitStatus('error');
        setErrorMessage('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setSubmitStatus('error');
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบฐานข้อมูล กรุณาลองใหม่อีกครั้ง');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับหน้าแรก</span>
      </Link>

      {/* Checking LINE State */}
      {isCheckingLine ? (
        <div className="bg-white rounded-3xl p-10 border border-stone-200 shadow-sm flex flex-col items-center justify-center space-y-4 min-h-[350px]">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
          <p className="text-stone-600 text-sm font-semibold">กำลังตรวจสอบสถานะการเชื่อมต่อ LINE...</p>
        </div>
      ) : !lineProfile ? (
        /* ==================== LINE CONNECTION GATE ==================== */
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm space-y-8 animate-in fade-in">
          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              ระบบสมาชิกเครือข่ายกสิกรรมธรรมชาติ
            </span>
            <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-stone-900 mt-2`}>
              สมัครสมาชิกแปลงกสิกรรมธรรมชาตินครสวรรค์
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              ร่วมเป็นส่วนหนึ่งของเครือข่ายเพื่อเผยแพร่ผลผลิต แลกเปลี่ยนเมล็ดพันธุ์ และเกื้อกูลกันในชุมชน
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-50 via-green-50/60 to-stone-50 border-2 border-[#06C755]/30 rounded-3xl space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="w-16 h-16 rounded-3xl bg-[#06C755] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#06C755]/20">
                <svg className="w-9 h-9 fill-current" viewBox="0 0 24 24">
                  <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.777.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.645 1.281-.54 6.91-4.069 9.428-6.967 1.739-1.909 2.672-3.834 2.672-5.99z"/>
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  กรุณาเชื่อมต่อด้วยบัญชี LINE ก่อนเริ่มต้นลงทะเบียน
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed">
                  เพื่อความปลอดภัย ป้องกันข้อมูลสูญหาย และยืนยันตัวตนเกษตรกรในเครือข่าย จ.นครสวรรค์ ระบบจำเป็นต้องเชื่อมต่อบัญชี LINE ของท่านเพื่อใช้เป็นช่องทางสื่อสารและตรวจสอบสิทธิ์ครับ
                </p>
              </div>
            </div>

            {/* Benefits Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200/60 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">กรอกข้อมูลง่ายและเร็ว</h4>
                  <p className="text-[11px] text-stone-500">ดึงชื่อและรูปจาก LINE อัตโนมัติ</p>
                </div>
              </div>

              <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200/60 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">ฟังก์ชั่นใหม่กับ LINE</h4>
                  <p className="text-[11px] text-stone-500">รองรับฟังก์ชั่นการทำงานใหม่ๆ กับไลน์ในอนาคต</p>
                </div>
              </div>

              <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200/60 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900">ปลอดภัย เป็นส่วนตัว</h4>
                  <p className="text-[11px] text-stone-500 leading-snug">
                    🔒 ระบบใช้มาตรฐาน LINE Login อย่างปลอดภัย และขออนุญาตเฉพาะข้อมูลพื้นฐาน (ชื่อ, รูปโปรไฟล์) เท่านั้น
                  </p>
                </div>
              </div>
            </div>

            {/* Login Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => liffService.login('/member/register')}
                className="w-full py-4 px-6 rounded-2xl bg-[#06C755] hover:bg-[#05b34c] text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#06C755]/25 transition-all transform active:scale-[0.99] cursor-pointer touch-target-big"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.777.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.645 1.281-.54 6.91-4.069 9.428-6.967 1.739-1.909 2.672-3.834 2.672-5.99z"/>
                </svg>
                <span>เข้าสู่ระบบด้วย LINE เพื่อเริ่มลงทะเบียน</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== REGISTRATION FORM ==================== */
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm space-y-8 animate-in fade-in">
          
          {/* Header */}
          <div>
            <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
              ลงทะเบียนเข้าสู่เครือข่าย
            </span>
            <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-stone-900 mt-2`}>
              สมัครสมาชิกแปลงกสิกรรมธรรมชาตินครสวรรค์
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              ร่วมเป็นส่วนหนึ่งของเครือข่ายเพื่อเผยแพร่ผลผลิต แลกเปลี่ยนเมล็ดพันธุ์ และเกื้อกูลกันในชุมชน
            </p>
          </div>

          {/* Connected LINE Badge */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border-2 border-[#06C755]/40 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {lineProfile.pictureUrl ? (
                <img
                  src={lineProfile.pictureUrl}
                  alt={lineProfile.displayName}
                  className="w-12 h-12 rounded-full border-2 border-[#06C755] object-cover shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#06C755] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <UserCheck className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#06C755] text-white text-[11px] font-bold inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> เชื่อมต่อ LINE แล้ว
                  </span>
                  <span className="text-sm font-bold text-stone-900">
                    สวัสดีคุณ {lineProfile.displayName}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5">
                  ระบบผูกบัญชี LINE นี้เข้ากับข้อมูลสมาชิกให้เรียบร้อยแล้ว กรุณากรอกข้อมูลแปลงด้านล่างครับ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => liffService.logout()}
              className="text-xs font-semibold text-stone-500 hover:text-rose-600 underline shrink-0 cursor-pointer self-end sm:self-center"
            >
              สลับบัญชี LINE อื่น
            </button>
          </div>

          {/* Anti-Scam Notice */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">นโยบายความปลอดภัยและป้องกันมิจฉาชีพ:</p>
              <p className="text-emerald-800 leading-relaxed">
                ระบบจะไม่เปิดเผยเบอร์โทรศัพท์สู่สาธารณะเป็นค่าเริ่มต้น และพิกัดแปลงจะแสดงผลเฉพาะระดับโซนรัศมี (ไม่ใช่พิกัดบ้านจริง)
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-sm text-rose-800 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">ไม่สามารถบันทึกข้อมูลได้</p>
                <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Face Photo for Verification */}
            <div className="space-y-3">
              <label className="block text-base font-bold text-stone-900">
                1. รูปหน้าตรงสมาชิกตัวจริง (ใช้สำหรับแอดมินตรวจคัดกรอง) <span className="text-rose-500">*</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-3xl bg-stone-50 border border-stone-200">
                <div className="relative w-28 h-28 rounded-full bg-stone-200 overflow-hidden shrink-0 border-2 border-brand-300 shadow-md">
                  <img
                    src={facePhotoUrl}
                    alt="รูปหน้าสมาชิก"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/20 cursor-pointer transition-colors touch-target-big">
                    <Camera className="w-4 h-4" />
                    <span>ถ่ายรูปหน้าตรง / เปลี่ยนรูปภาพ</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-stone-500">
                    *ระบบดึงรูปโปรไฟล์จาก LINE มาให้เป็นค่าเริ่มต้น สามารถเปลี่ยนรูปหน้าตรงคู่กับแปลงของท่านได้ครับ
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Personal & Farm Info */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-stone-900">
                2. ข้อมูลสมาชิกและชื่อแปลง
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    ชื่อ-นามสกุล หรือชื่อเรียกในกลุ่ม <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="เช่น ลุงสมชาย, ป้าปราณี..."
                    className="w-full p-3.5 rounded-2xl border border-stone-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    ชื่อแปลง / สวน / ศูนย์เรียนรู้ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="เช่น สวนป่าพอเพียง, ไร่สุขใจ..."
                    className="w-full p-3.5 rounded-2xl border border-stone-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  สโลแกนหรือแนวคิดของแปลงสั้นๆ (ถ้ามี)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="เช่น คืนชีวิตให้ดินด้วยถ่านไบโอชาร์, สวนกล้วยอินทรีย์วิถีพอเพียง..."
                  className="w-full p-3.5 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Multi-Photo Farm Uploader */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200">
                <FarmPhotoUploader
                  photos={farmPhotos}
                  onChange={(newPhotos) => setFarmPhotos(newPhotos)}
                  maxPhotos={10}
                  label="รูปภาพบรรยากาศแปลง / ผลผลิตเด่น (อัพโหลดได้สูงสุด 10 รูป)"
                  description="เลือกรูปภาพแปลงเพื่อแสดงบนหน้าเว็บ ระบบจะย่อขนาดให้อัตโนมัติ"
                />
              </div>
            </div>

            {/* 3. Location */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-stone-900">
                3. ที่ตั้งแปลง (จ.นครสวรรค์)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    อำเภอ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-stone-200 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {DISTRICTS_NSW.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    ตำบล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={subdistrict}
                    onChange={(e) => setSubdistrict(e.target.value)}
                    placeholder="เช่น หนองกรด, ตาสัง, ลาดยาว..."
                    className="w-full p-3.5 rounded-2xl border border-stone-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Contact & Privacy */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-stone-900">
                4. ช่องทางการติดต่อและความเป็นส่วนตัว
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    เบอร์โทรศัพท์มือถือ (หลัก) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={20}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="เช่น 081-234-5678"
                    className={`w-full p-3.5 rounded-2xl border ${
                      phoneError ? 'border-rose-400 focus:ring-rose-400' : 'border-stone-200 focus:ring-brand-500'
                    } text-base font-semibold focus:outline-none focus:ring-2`}
                  />
                  {phoneError && (
                    <p className="text-xs text-rose-600 mt-1">{phoneError}</p>
                  )}
                  
                  {/* Public Phone Checkbox */}
                  <label className="mt-2.5 flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublicPhone}
                      onChange={(e) => setIsPublicPhone(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs text-stone-600 font-medium">
                      ยินยอมให้แสดงเบอร์โทรศัพท์แก่บุคคลทั่วไปในหน้าแปลง
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1">
                    LINE ID หรือ ชื่อติดต่อใน LINE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="เช่น somchai_agri หรือเบอร์โทร"
                    className="w-full p-3.5 rounded-2xl border border-stone-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  {/* Public LINE Checkbox */}
                  <label className="mt-2.5 flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublicLine}
                      onChange={(e) => setIsPublicLine(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs text-stone-600 font-medium">
                      แสดงปุ่มติดต่อผ่าน LINE ในหน้าแปลง (แนะนำ)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 5. Practices */}
            <div className="space-y-3">
              <label className="block text-base font-bold text-stone-900">
                5. แนวทางกสิกรรมธรรมชาติที่ทำในแปลง (เลือกได้มากกว่า 1 ข้อ)
              </label>

              <div className="flex flex-wrap gap-2">
                {practiceOptions.map((item) => {
                  const isSelected = selectedPractices.includes(item);
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => handleTogglePractice(item)}
                      className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-brand-300'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Training Information (Admin Evaluation) */}
            <div className="space-y-4 p-5 rounded-3xl bg-amber-50/60 border border-amber-200/80">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-700" />
                <h2 className="text-base font-bold text-stone-900">
                  6. ข้อมูลการอบรมกสิกรรมธรรมชาติ (สำหรับแอดมินเครือข่ายพิจารณา)
                </h2>
              </div>

              <p className="text-xs text-amber-800 bg-white/80 p-3 rounded-2xl border border-amber-200/60 leading-relaxed">
                💡 ข้อมูล 2 ข้อนี้จะแสดงให้เฉพาะแอดมินเครือข่ายดูเพื่อพิจารณาอนุมัติเข้าเครือข่าย ไม่ได้เปิดเผยสู่สาธารณะครับ
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    1) ผ่านการอบรมหลักสูตรอะไรมา? (กรอกอิสระ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={trainingCourse}
                    onChange={(e) => setTrainingCourse(e.target.value)}
                    placeholder="เช่น พัฒนากสิกรรมธรรมชาติสู่ระบบเศรษฐกิจพอเพียง, โคกหนองนา..."
                    className="w-full p-3.5 rounded-2xl border border-stone-200 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    2) อบรมที่ไหนมา / ศูนย์เรียนรู้ใด? (กรอกอิสระ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={trainingLocation}
                    onChange={(e) => setTrainingLocation(e.target.value)}
                    placeholder="เช่น ศูนย์กสิกรรมธรรมชาติท่ามะขาม, ศูนย์ ปภ. เขต 8, ศูนย์เครือข่าย จ.นครสวรรค์..."
                    className="w-full p-3.5 rounded-2xl border border-stone-200 bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* 7. Story / About */}
            <div className="space-y-2">
              <label className="block text-base font-bold text-stone-900">
                7. เล่าเรื่องราวแปลงของท่านสั้นๆ (ถ้ามี)
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="เช่น ทำเกษตรอินทรีย์มา 5 ปี ปลูกกล้วย ขุดบ่อปลา เผาถ่านไบโอชาร์ใช้เอง มีผลผลิตพร้อมแบ่งปัน..."
                className="w-full p-4 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              ></textarea>
            </div>

            {/* Submission Feedback */}
            {submitStatus === 'saving' && (
              <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl flex items-center justify-center gap-3 text-brand-900 font-bold animate-in fade-in">
                <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                <span>กำลังบันทึกข้อมูลเข้าสู่ระบบฐานข้อมูลเครือข่าย กรุณารอสักครู่...</span>
              </div>
            )}

            {submitStatus === 'success' && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center text-emerald-900 font-bold space-y-1 animate-in fade-in">
                <p className="text-base flex items-center justify-center gap-2 text-emerald-700">
                  <Check className="w-5 h-5" />
                  <span>ส่งใบสมัครเรียบร้อยแล้ว!</span>
                </p>
                <p className="text-xs text-emerald-700">
                  ระบบได้บันทึกข้อมูลและส่งเรื่องไปยังแอดมินเครือข่ายเรียบร้อยแล้ว กำลังนำท่านไปยังหน้าแปลง...
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-stone-100">
              <button
                type="submit"
                disabled={isSubmitting || submitStatus === 'saving' || submitStatus === 'success'}
                className="w-full py-4 px-6 rounded-full bg-brand-600 hover:bg-brand-700 disabled:bg-stone-400 text-white font-black text-lg shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all touch-target-big cursor-pointer disabled:cursor-not-allowed"
              >
                {submitStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : submitStatus === 'success' ? (
                  <>
                    <Check className="w-6 h-6" />
                    <span>บันทึกสำเร็จเรียบร้อย!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    <span>ส่งใบสมัครสมาชิกเครือข่าย</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        file={selectedFile}
        onConfirm={(croppedUrl) => setFacePhotoUrl(croppedUrl)}
        aspectRatio={1} // สี่เหลี่ยมจัตุรัสสำหรับรูปหน้าตรง
        maxDimension={400} // ขนาดกะทัดรัดสำหรับ Avatar (< 50KB)
      />

    </div>
  );
}
