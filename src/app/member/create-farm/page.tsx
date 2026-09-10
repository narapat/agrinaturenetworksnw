'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { liffService } from '@/services/liffService';
import { MemberProfile, hasMemberRole } from '@/types';
import { DISTRICTS_NSW } from '@/data/mockData';
import FarmPhotoUploader from '@/components/ui/FarmPhotoUploader';
import { 
  ArrowLeft, 
  Sprout, 
  Check, 
  ShieldCheck, 
  Lock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function CreateFarmPage() {
  const router = useRouter();
  const { getTextClass } = useFontSize();
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Farm Form State
  const [farmName, setFarmName] = useState('');
  const [tagline, setTagline] = useState('');
  const [district, setDistrict] = useState(DISTRICTS_NSW[0]);
  const [subdistrict, setSubdistrict] = useState('');
  const [story, setStory] = useState('');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [isPublicPhone, setIsPublicPhone] = useState(false); // ค่าเริ่มต้น: ซ่อนเบอร์โทร (Anti-Scam)
  const [isPublicLine, setIsPublicLine] = useState(true);
  const [selectedPractices, setSelectedPractices] = useState<string[]>([
    'โคก หนอง นา', 
    'กสิกรรมธรรมชาติ'
  ]);
  const [farmPhotos, setFarmPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop'
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [practiceOptions, setPracticeOptions] = useState<string[]>([]);

  useEffect(() => {
    setPracticeOptions(dataService.getActivePracticeNames());
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      let user = dataService.getCurrentUser();
      if (!user || !hasMemberRole(user)) {
        try {
          await liffService.init();
        } catch (err) {
          console.warn('LIFF init in create-farm notice:', err);
        }
        user = dataService.getCurrentUser();
      }

      if (!isMounted) return;

      // ถ้ายังไม่ได้เป็นสมาชิก ให้ส่งไปหน้าลงทะเบียน
      if (!user || !hasMemberRole(user)) {
        router.replace('/member/register');
        return;
      }

      // ถ้ามีแปลงแล้ว ให้ส่งไปที่หน้าแดชบอร์ดแปลงของตนเองทันที
      const userFarm = user.farmId 
        ? (dataService.getFarmById(user.farmId) || dataService.getFarmByMemberId(user.id))
        : dataService.getFarmByMemberId(user.id);

      if (userFarm) {
        router.replace('/member/dashboard');
        return;
      }

      setCurrentUser(user);
      if (user.phone) setPhone(user.phone);
      if (user.lineId) setLineId(user.lineId);
      setIsPublicPhone(user.isPublicPhone ?? false);
      setIsPublicLine(user.isPublicLine ?? true);
      setIsLoading(false);
    }

    checkAuth();

    const handleDataUpdated = () => {
      const user = dataService.getCurrentUser();
      if (user && hasMemberRole(user) && isMounted) {
        setCurrentUser(user);
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

  const handleTogglePractice = (item: string) => {
    if (selectedPractices.includes(item)) {
      setSelectedPractices(selectedPractices.filter((p) => p !== item));
    } else {
      setSelectedPractices([...selectedPractices, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!farmName.trim()) return;

    setIsSubmitting(true);
    setCreateError(null);

    try {
      await dataService.createFarm(currentUser.id, {
        farmName: farmName.trim(),
        tagline: tagline.trim() || 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง',
        story: story.trim() || 'แปลงกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง เครือข่ายนครสวรรค์',
        district,
        subdistrict: subdistrict.trim() || 'เมือง',
        phone: phone.trim() || currentUser.phone,
        lineId: lineId.trim() || currentUser.lineId,
        isPublicPhone,
        isPublicLine,
        practices: selectedPractices,
        photos: farmPhotos,
      });

      setIsSubmitted(true);
      setTimeout(() => {
        router.replace('/member/dashboard');
      }, 1200);
    } catch (err: any) {
      console.error('Error creating farm:', err);
      setCreateError('เกิดข้อผิดพลาดในการบันทึกข้อมูลแปลง: ' + (err?.message || 'กรุณาลองใหม่อีกครั้ง'));
      setIsSubmitting(false);
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-stone-500 text-sm font-medium">กำลังตรวจสอบข้อมูลสมาชิก...</p>
      </div>
    );
  }

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
              <Sprout className="w-3.5 h-3.5" />
              <span>สร้างแปลงกสิกรรมของคุณ</span>
            </div>
            <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-stone-900 mt-2`}>
              ลงทะเบียนข้อมูลแปลงกสิกรรม
            </h1>
            <p className="text-sm text-stone-500">
              ยินดีต้อนรับคุณ <b className="text-stone-800">{currentUser.fullName}</b> กรอกข้อมูลแปลงของคุณเพื่อนำผลผลิตและของดีมาเผยแพร่ในเครือข่าย
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3 bg-stone-50 p-2.5 rounded-2xl border border-stone-200">
            <img
              src={currentUser.facePhotoUrl}
              alt={currentUser.fullName}
              className="w-12 h-12 rounded-full object-cover border border-brand-200"
            />
            <div className="text-left pr-2">
              <p className="text-xs font-bold text-stone-800">{currentUser.fullName}</p>
              <span className="text-[10px] text-brand-700 bg-brand-100/60 px-2 py-0.5 rounded-md font-medium">
                🌾 สมาชิกเครือข่าย
              </span>
            </div>
          </div>
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

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. ข้อมูลแปลงและที่ตั้ง */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              <MapPin className="w-5 h-5 text-brand-600" />
              <h2>1. ข้อมูลชื่อแปลง & ที่ตั้งในจังหวัดนครสวรรค์</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  ชื่อแปลงเกษตร หรือ ศูนย์เรียนรู้ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="เช่น สวนเกษตรอินทรีย์ร่มเย็น, ศูนย์กสิกรรมธรรมชาติ..."
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  คำขวัญ / ปรัชญาประจำแปลง (สโลแกนสั้นๆ)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="เช่น ปลูกทุกอย่างที่กิน กินทุกอย่างที่ปลูก พึ่งพาตนเอง"
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  อำเภอ (15 อำเภอของนครสวรรค์) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
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
                  value={subdistrict}
                  onChange={(e) => setSubdistrict(e.target.value)}
                  placeholder="เช่น หนองกรด, เกรียงไกร..."
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* 2. เรื่องเล่าความเป็นมา & กิจกรรมเด่น */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              <Layers className="w-5 h-5 text-brand-600" />
              <h2>2. เรื่องเล่าแปลง และ องค์ความรู้ / กิจกรรมเด่น</h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 mb-1">
                เรื่องเล่าความเป็นมา & แรงบันดาลใจในการทำแปลง
              </label>
              <textarea
                rows={3}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="เล่าจุดเริ่มต้น พื้นที่กี่ไร่ ทำอะไรบ้าง ประโยชน์ที่ได้รับจากการทำกสิกรรมธรรมชาติ..."
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 mb-2">
                กิจกรรมและแนวทางปฏิบัติเด่นในแปลง (เลือกได้หลายข้อ)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {practiceOptions.map((item) => {
                  const isChecked = selectedPractices.includes(item);
                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => handleTogglePractice(item)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between gap-1.5 ${
                        isChecked
                          ? 'bg-brand-50 border-brand-500 text-brand-900 shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. รูปถ่ายแปลง (Carousel & Multi-upload) */}
          <div className="space-y-4">
            <FarmPhotoUploader
              photos={farmPhotos}
              onChange={(newPhotos) => setFarmPhotos(newPhotos)}
              maxPhotos={6}
            />
          </div>

          {/* 4. ช่องทางติดต่อและสวิตช์ความปลอดภัย */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-stone-900 border-b border-stone-100 pb-2">
              <Phone className="w-5 h-5 text-brand-600" />
              <h2>4. ช่องทางติดต่อประจำแปลง</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  เบอร์โทรศัพท์ติดต่อแปลง
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  LINE ID สำหรับติดต่อแปลง
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="เช่น somchai_farm"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <p className="text-xs font-bold text-stone-700">การตั้งค่าความเป็นส่วนตัวของแปลง (Anti-Scam):</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-stone-800">แสดงเบอร์โทรศัพท์บนหน้าแปลงสาธารณะ</p>
                    <p className="text-[11px] text-stone-500">ค่าเริ่มต้นปิดไว้ เพื่อป้องกันมิจฉาชีพโทรคุกคาม</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublicPhone}
                    onChange={(e) => setIsPublicPhone(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-bold text-stone-800">เปิดปุ่มแอดไลน์ (LINE ID) สู่สาธารณะ</p>
                    <p className="text-[11px] text-stone-500">แนะนำให้เปิดไว้ เพื่อให้สมาชิกอื่นติดต่อเกื้อกูลกันได้</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublicLine}
                    onChange={(e) => setIsPublicLine(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {createError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold text-center">
              ⚠️ {createError}
            </div>
          )}

          {/* Submit Button & Feedback */}
          {isSubmitted ? (
            <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-center font-bold text-base flex items-center justify-center gap-2 animate-bounce">
              <Check className="w-5 h-5 text-emerald-700" />
              <span>สร้างแปลงกสิกรรมสำเร็จ! กำลังนำท่านไปยังหน้าแดชบอร์ดแปลง...</span>
            </div>
          ) : (
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-full bg-brand-600 hover:bg-brand-700 disabled:bg-stone-400 text-white font-black text-lg shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all touch-target-big"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>กำลังบันทึกข้อมูลแปลง...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>บันทึกและสร้างแปลงกสิกรรมทันที</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
