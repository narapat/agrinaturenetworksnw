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
  Image as ImageIcon
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

  // Face Photo
  const [facePhotoUrl, setFacePhotoUrl] = useState(
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces'
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const checkUser = () => {
      const user = dataService.getCurrentUser();
      if (user && hasMemberRole(user)) {
        const userFarm = user.farmId 
          ? (dataService.getFarmById(user.farmId) || dataService.getFarmByMemberId(user.id))
          : dataService.getFarmByMemberId(user.id);

        if (userFarm) {
          router.replace('/member/dashboard');
        } else {
          router.replace('/member/create-farm');
        }
      }
    };

    checkUser();
    liffService.init().then(() => checkUser());

    window.addEventListener('nsw_data_updated', checkUser);
    window.addEventListener('storage', checkUser);
    return () => {
      window.removeEventListener('nsw_data_updated', checkUser);
      window.removeEventListener('storage', checkUser);
    };
  }, [router]);

  const practiceOptions = [
    'โคก หนอง นา',
    'เตาเผาไบโอชาร์ 1,000°C',
    'น้ำส้มควันไม้ไร้ทาร์',
    'ปุ๋ยหมักโบกาฉิ / จุลินทรีย์ IMO',
    'ป่า 3 อย่าง ประโยชน์ 4 อย่าง',
    'อนุรักษ์เมล็ดพันธุ์พื้นบ้าน',
    'กล้วยและไม้ผลอินทรีย์',
    'ไข่ไก่อารมณ์ดี',
  ];

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !farmName.trim() || !phone.trim()) return;

    dataService.registerNewMember({
      fullName: fullName.trim(),
      facePhotoUrl,
      farmName: farmName.trim(),
      tagline: tagline.trim() || 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง',
      story: story.trim() || 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์',
      district,
      subdistrict: subdistrict.trim() || 'เมือง',
      phone: phone.trim(),
      lineId: lineId.trim() || phone.trim(),
      trainingCourse: trainingCourse.trim(),
      trainingLocation: trainingLocation.trim(),
      isPublicPhone,
      isPublicLine,
      practices: selectedPractices,
      photos: farmPhotos,
    });

    setIsSubmitted(true);
    setTimeout(() => {
      router.push('/member/dashboard');
    }, 1800);
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

      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-sm space-y-8">
        
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

        {/* LINE Login CTA for Existing Members */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#06C755] flex items-center justify-center text-white shrink-0 shadow-sm">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.777.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.645 1.281-.54 6.91-4.069 9.428-6.967 1.739-1.909 2.672-3.834 2.672-5.99z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">เคยลงทะเบียนหรือมีบัญชีเครือข่ายแล้ว?</h3>
              <p className="text-xs text-stone-600">หากเปิดผ่านเบราว์เซอร์ปกติ กดเข้าสู่ระบบด้วย LINE เพื่อเชื่อมต่อบัญชีเดิมของคุณ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => liffService.login('/member/dashboard')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.777.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.645 1.281-.54 6.91-4.069 9.428-6.967 1.739-1.909 2.672-3.834 2.672-5.99z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย LINE</span>
          </button>
        </div>

        {/* Anti-Scam Notice */}
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-emerald-950">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">นโยบายความปลอดภัยและป้องกันมิจฉาชีพ:</p>
            <p className="text-emerald-800 leading-relaxed">
              ระบบจะไม่เปิดเผยเบอร์โทรศัพท์สู่สาธารณะเป็นค่าเริ่มต้น และพิกัดแปลงจะแสดงผลเฉพาะระดับโซนรัศมี (ไม่ใช่พิกัดบ้านจริง) 
              เพื่อให้เกษตรกรปลอดภัยจากแก๊งคอลเซ็นเตอร์ 100%
            </p>
          </div>
        </div>

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
                  <span>ถ่ายรูปหน้าตรง / เลือกรูปภาพ</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-stone-500">
                  *ถ่ายรูปใบหน้าพร้อมรอยยิ้มคู่กับแปลง เพื่อให้แอดมินเครือข่ายจำหน้าและอนุมัติได้รวดเร็วครับ
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
                onChange={setFarmPhotos}
                label="รูปภาพบรรยากาศแปลง / ศูนย์เรียนรู้ (อัพโหลดได้หลายรูป)"
                description="อัพโหลดรูปบรรยากาศแปลง โคก หนอง นา เตาเผาไบโอชาร์ หรือสวนผลไม้ได้หลายรูปพร้อมกัน ระบบจะย่อขนาดให้อัตโนมัติและแสดงผลแบบภาพวน (Slideshow)"
              />
            </div>
          </div>

          {/* 3. Location in Nakhon Sawan */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-stone-900">
              3. ที่ตั้งแปลง (15 อำเภอในจังหวัดนครสวรรค์)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  อำเภอ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-stone-200 text-base font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {DISTRICTS_NSW.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  ตำบล
                </label>
                <input
                  type="text"
                  value={subdistrict}
                  onChange={(e) => setSubdistrict(e.target.value)}
                  placeholder="เช่น หนองกรด, หัวดง, เกยไชย..."
                  className="w-full p-3.5 rounded-2xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Contact Channels & Privacy */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-stone-900">
              4. ช่องทางติดต่อสื่อสาร
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  LINE ID หรือเบอร์ที่ผูก LINE
                </label>
                <input
                  type="text"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  placeholder="เช่น somchai_farm"
                  className="w-full p-3.5 rounded-2xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Anti-Scam Toggles */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-stone-800">
                    อนุญาตให้บุคคลภายนอกเห็นเบอร์โทรศัพท์
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {isPublicPhone ? '🟢 เปิดแสดงเบอร์โทรศัพท์' : '🔒 ซ่อนไว้เพื่อความปลอดภัยจากมิจฉาชีพ (แนะนำ)'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublicPhone}
                  onChange={(e) => setIsPublicPhone(e.target.checked)}
                  className="w-5 h-5 rounded-md text-brand-600 focus:ring-brand-500 accent-brand-600"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-stone-200/60">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-stone-800">
                    อนุญาตให้แสดงปุ่มทัก LINE
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {isPublicLine ? '🟢 เปิดให้ผู้บริโภคทักแชทสอบถามสินค้าได้' : '🔴 ปิดไว้'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublicLine}
                  onChange={(e) => setIsPublicLine(e.target.checked)}
                  className="w-5 h-5 rounded-md text-brand-600 focus:ring-brand-500 accent-brand-600"
                />
              </label>
            </div>
          </div>

          {/* 5. Natural Agriculture Practices */}
          <div className="space-y-3">
            <label className="block text-base font-bold text-stone-900">
              5. วิถีและศาสตร์ที่ท่านทำในแปลง (เลือกได้หลายข้อ)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {practiceOptions.map((opt) => {
                const isSelected = selectedPractices.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleTogglePractice(opt)}
                    className={`p-3 rounded-2xl border text-left text-xs sm:text-sm font-bold transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>{isSelected ? '✓ ' : '+ '}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. ประวัติการอบรมกสิกรรมธรรมชาติ (สำหรับแอดมินคัดกรอง) */}
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
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="เช่น ทำเกษตรอินทรีย์มา 5 ปี ปลูกกล้วย ขุดบ่อปลา เผาถ่านไบโอชาร์ใช้เอง มีผลผลิตพร้อมแบ่งปัน..."
              className="w-full p-4 rounded-2xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            ></textarea>
          </div>

          {/* Submission Feedback */}
          {isSubmitted && (
            <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl text-center text-brand-900 font-bold space-y-1 animate-in fade-in">
              <p className="text-base flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-brand-600" />
                <span>ส่งใบสมัครเรียบร้อยแล้ว!</span>
              </p>
              <p className="text-xs text-brand-700">
                ระบบกำลังพาไปยังหน้าแปลงของท่าน อยู่ระหว่างรอแอดมินเครือข่ายอนุมัติครับ
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4 border-t border-stone-100">
            <button
              type="submit"
              disabled={isSubmitted}
              className="w-full py-4 px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-black text-lg shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all touch-target-big"
            >
              <Check className="w-6 h-6" />
              <span>{isSubmitted ? 'กำลังบันทึกข้อมูล...' : 'ส่งใบสมัครสมาชิกเครือข่าย'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        file={selectedFile}
        onConfirm={(croppedUrl) => setFacePhotoUrl(croppedUrl)}
        aspectRatio={1} // สี่เหลี่ยมจัตุรัสสำหรับรูปหน้าตรง
      />

    </div>
  );
}
