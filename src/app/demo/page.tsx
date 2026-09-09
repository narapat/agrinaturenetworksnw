'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService, DEMO_MEMBER_IDS } from '@/services/dataService';
import { MemberProfile, hasAdminRole } from '@/types';
import { 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  User, 
  Check, 
  ChevronRight, 
  HelpCircle, 
  AlertTriangle,
  Sprout,
  Users
} from 'lucide-react';

interface DemoPersona {
  id: string;
  badge: string;
  badgeColor: string;
  roleTitle: string;
  description: string;
  features: string[];
  targetUrl: string;
  targetLabel: string;
  caution?: string;
}

export default function DemoHubPage() {
  const router = useRouter();
  const { getTextClass, setFontSize } = useFontSize();
  const currentUser = dataService.getCurrentUser();
  const demoMembers = dataService.getDemoMembers();

  const personas: Record<string, DemoPersona> = {
    guest: {
      id: 'guest',
      badge: 'บุคคลทั่วไป',
      badgeColor: 'bg-stone-100 text-stone-700 border-stone-300',
      roleTitle: 'ผู้เยี่ยมชมเครือข่าย (ยังไม่ได้เข้าสู่ระบบ)',
      description: 'สำหรับทดสอบมุมมองของบุคคลภายนอก หรือประชาชนทั่วไปที่สนใจเข้ามาค้นหาของดี ผลผลิต หรือข้อมูลแปลงกสิกรรม',
      features: [
        'ค้นหาและดูผลผลิตใน E-Catalog ได้',
        'ดูแผนที่และสารบบแปลงกสิกรรม 15 อำเภอ',
        'หากคลิก "แปลงฉัน" ระบบจะนำทางไปหน้าสมัครสมาชิกใหม่โดยอัตโนมัติ',
      ],
      targetUrl: '/',
      targetLabel: 'เข้าใช้งานในฐานะ บุคคลทั่วไป',
    },
    'mem-001': {
      id: 'mem-001',
      badge: 'สมาชิกแปลงเต็มรูปแบบ',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      roleTitle: 'ลุงสมชาย รักษ์ปฐพี (สวนสราญรมย์)',
      description: 'สมาชิกกสิกรรมธรรมชาติรุ่น 23 แปลงสมบูรณ์ 15 ไร่ มีสินค้าถ่านไบโอชาร์และผลผลิตวางจำหน่ายจริงในระบบ',
      features: [
        'จัดการผลผลิตของแปลงตนเอง (เพิ่ม/แก้ไข/ซ่อนสินค้า)',
        'แก้ไขข้อมูลแปลง เรื่องเล่า และอัปโหลดรูปถ่ายแปลงแบบสไลด์โชว์',
        'จัดการสวิตช์ความปลอดภัยเบอร์โทรศัพท์ (Anti-Scam)',
      ],
      targetUrl: '/member/dashboard',
      targetLabel: 'สลับเป็น ลุงสมชาย (ไปหน้าจัดการแปลง)',
    },
    'mem-002': {
      id: 'mem-002',
      badge: 'ฟอนต์ใหญ่พิเศษ',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      roleTitle: 'ป้าปราณี วิถีธรรมชาติ (สวนป้าปราณี)',
      description: 'สมาชิกแปลงเกษตรกรผู้สูงอายุ ตั้งค่าเริ่มต้นเป็นตัวหนังสือใหญ่พิเศษ (X-Large) เพื่อให้อ่านง่ายบนมือถือ',
      features: [
        'ทดสอบระบบสเกลขนาดตัวอักษรใหญ่พิเศษ (X-Large Font)',
        'มีสินค้ากล้วยน้ำว้าและไข่ไก่อารมณ์ดีวางจำหน่าย',
        'เปิดเผยช่องทาง LINE ID และเบอร์โทรส่วนตัว',
      ],
      targetUrl: '/member/dashboard',
      targetLabel: 'สลับเป็น ป้าปราณี (ฟอนต์ใหญ่พิเศษ)',
    },
    'mem-003': {
      id: 'mem-003',
      badge: 'ผู้สูงอายุ / ช่วยคีย์',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      roleTitle: 'ครูบุญชู โคกหนองนา (สวนพึ่งตนเอง)',
      description: 'สมาชิกสูงวัยที่ไม่ถนัดพิมพ์สมาร์ทโฟน ร้องขอให้แอดมินช่วยคีย์ข้อมูลแทน (Delegation Assistance)',
      features: [
        'มีสถานะร้องขอความช่วยเหลือไปยังศูนย์แอดมิน',
        'แอดมินสามารถสลับมาคีย์ข้อมูลผลผลิตให้แทนได้',
        'ซ่อนเบอร์โทรศัพท์และช่องทางติดต่อเพื่อความปลอดภัย 100%',
      ],
      targetUrl: '/member/dashboard',
      targetLabel: 'สลับเป็น ครูบุญชู (สมาชิกร้องขอแอดมินช่วยคีย์)',
    },
    'mem-004': {
      id: 'mem-004',
      badge: 'สมาชิกใหม่ รออนุมัติ',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      roleTitle: 'พี่ชัยณรงค์ ยังสมาร์ทฟาร์มเมอร์',
      description: 'เกษตรกรรุ่นใหม่เพิ่งลงทะเบียนแปลง อยู่ในสถานะรอการตรวจสอบและอนุมัติจากแอดมินเครือข่าย',
      features: [
        'มีป้ายแจ้งเตือนสีเหลือง "รอแอดมินอนุมัติ"',
        'สามารถลงผลผลิตล่วงหน้าเตรียมไว้ได้ทันที',
        'แปลงจะยังไม่ปรากฏในหน้าสาธารณะจนกว่าแอดมินจะกดยืนยันตัวตน',
      ],
      targetUrl: '/member/dashboard',
      targetLabel: 'สลับเป็น พี่ชัยณรงค์ (สถานะรออนุมัติ)',
    },
    'mem-005': {
      id: 'mem-005',
      badge: 'ยังไม่ได้สร้างแปลง',
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
      roleTitle: 'น้องกานต์ มือใหม่หัดปลูก',
      description: 'ผ่านการอนุมัติเป็นสมาชิกเครือข่ายแล้ว แต่ยังไม่ได้สร้างแปลงกสิกรรมของตนเอง',
      features: [
        'สำหรับทดสอบระบบ Auto-Redirect ไปยังหน้าสร้างแปลงใหม่ (/member/create-farm)',
        'ฟอร์มสร้างแปลงพร้อมระบบอัปโหลดและย่อรูปภาพ',
        'เมื่อสร้างแปลงเสร็จ จะเข้าสู่หน้าแดชบอร์ดฟาร์มของตนเองทันที',
      ],
      targetUrl: '/member/dashboard',
      targetLabel: 'สลับเป็น น้องกานต์ (ทดสอบ Flow สร้างแปลง)',
    },
    'admin-001': {
      id: 'admin-001',
      badge: 'แอดมินเครือข่าย & สมาชิก',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      roleTitle: 'นพรัตน์ แอดมินเครือข่ายนครสวรรค์',
      description: 'มี 2 บทบาทควบคู่: สมาชิกดูแลแปลงศูนย์ประสานงาน และ ผู้ดูแลระบบเครือข่ายนครสวรรค์ (Superadmin)',
      features: [
        'เข้าศูนย์แอดมิน (/admin) อนุมัติสมาชิกใหม่ และแต่งตั้งแอดมิน',
        'จัดการหมวดหมู่ SKU Tag และ SKU Smartfarm',
        'ลงประกาศกิจกรรมเอามื้อสามัคคี แก้ไข และซ่อนประกาศได้',
        'ดูแลแปลงทดลองและลงผลผลิตในฐานะสมาชิกแปลงตนเองได้',
      ],
      targetUrl: '/admin',
      targetLabel: 'สลับเป็น แอดมินนพรัตน์ (ไปศูนย์แอดมิน)',
      caution: '⚠️ หมายเหตุ: บัญชีแอดมินนี้เป็นบัญชีทดสอบระบบ กรุณาระมัดระวังการลบข้อมูลจริงที่อาจกระทบต่อสมาชิก',
    },
  };

  const handleSelectPersona = (id: string, targetUrl: string) => {
    dataService.switchUser(id);
    const user = dataService.getCurrentUser();
    if (user?.fontSizePref) {
      setFontSize(user.fontSizePref);
    }
    router.push(targetUrl);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-bold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าแรก</span>
        </Link>

        {currentUser && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 text-xs font-bold text-stone-700">
            <span>สถานะปัจจุบัน:</span>
            <span className="text-brand-700">{currentUser.fullName}</span>
          </div>
        )}
      </div>

      {/* Page Header Banner */}
      <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-stone-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-700/80 text-brand-200 text-xs font-bold backdrop-blur-xs border border-brand-500/30">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>ศูนย์ทดสอบระบบเครือข่ายกสิกรรมธรรมชาติ นครสวรรค์</span>
        </div>

        <h1 className={`${getTextClass('title')} text-2xl sm:text-4xl font-black tracking-tight`}>
          เลือกบัญชีทดสอบระบบ (Demo Mode)
        </h1>
        <p className="text-stone-300 text-sm sm:text-base max-w-2xl leading-relaxed">
          ท่านสามารถทดลองใช้งานระบบในมุมมองของบทบาทต่างๆ เช่น บุคคลทั่วไป, สมาชิกแปลง, สมาชิกสูงวัย, สมาชิกที่ยังไม่ได้สร้างแปลง หรือผู้ดูแลระบบ (Admin) เพื่อตรวจสอบประสบการณ์การใช้งานได้ครบทุกมิติ
        </p>

        <div className="pt-2 flex items-center gap-2 text-xs text-amber-300/90 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>บัญชีที่แสดงในหน้านี้เป็นข้อมูลตัวอย่างสำหรับทดสอบระบบเท่านั้น สมาชิกจริงที่ลงทะเบียนใหม่จะไม่ปรากฏในหน้านี้</span>
        </div>
      </div>

      {/* Persona Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Guest Card */}
        {(() => {
          const p = personas['guest'];
          const isCurrent = !currentUser;
          return (
            <div
              key="guest"
              className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between space-y-5 shadow-xs hover:shadow-md ${
                isCurrent ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20' : 'border-stone-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center font-black text-sm border border-stone-200">
                      ผช
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-base">บุคคลทั่วไป (Guest)</h3>
                      <p className="text-xs text-stone-500">ผู้เยี่ยมชมยังไม่ได้ล็อกอิน</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {p.description}
                </p>

                <div className="space-y-1.5 pt-1">
                  {p.features.map((f, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-stone-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectPersona('guest', p.targetUrl)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    isCurrent
                      ? 'bg-stone-200 text-stone-800 cursor-default'
                      : 'bg-stone-800 hover:bg-stone-900 text-white shadow-md shadow-stone-800/10'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="w-4 h-4 text-brand-600" />
                      <span>กำลังใช้งานอยู่ในบทบาทนี้</span>
                    </>
                  ) : (
                    <>
                      <span>{p.targetLabel}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Demo Members Cards */}
        {demoMembers.map((m) => {
          const p = personas[m.id];
          if (!p) return null;
          const isCurrent = currentUser?.id === m.id;

          return (
            <div
              key={m.id}
              className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between space-y-5 shadow-xs hover:shadow-md ${
                isCurrent ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/20' : 'border-stone-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.facePhotoUrl}
                      alt={m.fullName}
                      className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shrink-0"
                    />
                    <div>
                      <h3 className="font-bold text-stone-900 text-base">{m.fullName}</h3>
                      <p className="text-xs text-stone-500">
                        {hasAdminRole(m) && m.roles?.includes('member') 
                          ? '🛡️ แอดมิน & 🌾 แปลง' 
                          : hasAdminRole(m) 
                          ? '🛡️ แอดมินเครือข่าย' 
                          : m.farmId 
                          ? '🌾 สมาชิกแปลงกสิกรรม' 
                          : '🌾 สมาชิก (ยังไม่มีแปลง)'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {p.description}
                </p>

                <div className="space-y-1.5 pt-1">
                  {p.features.map((f, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-stone-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {p.caution && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                    {p.caution}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectPersona(m.id, p.targetUrl)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    isCurrent
                      ? 'bg-brand-100 text-brand-900 cursor-default border border-brand-200'
                      : hasAdminRole(m)
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="w-4 h-4 text-brand-600" />
                      <span>กำลังใช้งานอยู่ในบทบาทนี้</span>
                    </>
                  ) : (
                    <>
                      <span>{p.targetLabel}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

      </div>

    </div>
  );
}
