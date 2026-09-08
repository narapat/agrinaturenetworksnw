'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { 
  BookOpen, 
  ShoppingBag, 
  User, 
  ShieldCheck, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  HelpCircle, 
  GraduationCap, 
  ArrowRight,
  ChevronRight,
  Shield,
  Clock
} from 'lucide-react';

export default function GuidePage() {
  const { getTextClass } = useFontSize();
  const [activeTab, setActiveTab] = useState<'consumer' | 'member' | 'admin'>('consumer');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-700 via-brand-800 to-stone-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-brand-100 text-xs font-bold backdrop-blur-xs">
            <BookOpen className="w-4 h-4" />
            <span>คู่มือการใช้งานบนสมาร์ทโฟน & LINE OA</span>
          </div>
          <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-white leading-tight`}>
            คู่มือการใช้งานระบบเครือข่ายกสิกรรมธรรมชาติ
          </h1>
          <p className="text-brand-100/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            คู่มือฉบับสมบูรณ์สำหรับใช้งานผ่านหน้าจอมือถือและ LINE Official Account พร้อมภาพจำลองขั้นตอนและวิธีใช้งานอย่างละเอียด
          </p>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="bg-stone-100 p-1.5 rounded-2xl grid grid-cols-3 gap-1 shadow-inner">
        <button
          onClick={() => setActiveTab('consumer')}
          className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'consumer'
              ? 'bg-white text-brand-800 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>สำหรับผู้บริโภค</span>
        </button>
        <button
          onClick={() => setActiveTab('member')}
          className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'member'
              ? 'bg-white text-brand-800 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>สมาชิกเกษตรกร</span>
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'admin'
              ? 'bg-white text-brand-800 shadow-sm'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>แอดมินเครือข่าย</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: สำหรับผู้บริโภค / ประชาชนทั่วไป */}
      {/* ========================================================================= */}
      {activeTab === 'consumer' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Quick Intro */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 text-sm flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">เข้าถึงของดีกสิกรรมธรรมชาติตรงจากแปลง 15 อำเภอในนครสวรรค์</p>
              <p className="text-xs sm:text-sm text-amber-800/90 leading-relaxed">
                ท่านสามารถเลือกดูผลผลิตสด ผัก ผลไม้ปลอดสาร และปัจจัยการผลิต (ถ่านไบโอชาร์ น้ำส้มควันไม้) พร้อมติดต่อเกษตรกรผู้ผลิตได้โดยตรง ไม่ผ่านคนกลาง
              </p>
            </div>
          </div>

          {/* Section 1: Bottom Navigation */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  แถบเมนูด้านล่างบนมือถือ (Bottom Navigation)
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">แตะใช้งานได้สะดวกด้วยนิ้วโป้งเดียว</p>
              </div>
            </div>

            {/* Simulated Phone Bar Mockup */}
            <div className="bg-stone-900 text-stone-300 p-3.5 rounded-2xl space-y-2">
              <div className="text-[11px] text-stone-400 font-mono text-center">ภาพจำลองแถบล่างสุดของหน้าจอมือถือ</div>
              <div className="bg-white text-stone-800 rounded-xl p-2 shadow-inner grid grid-cols-5 gap-1 text-center">
                <div className="py-1 px-0.5 bg-brand-50 rounded-lg text-brand-700 font-bold text-[11px]">
                  🏠<br />หน้าแรก
                </div>
                <div className="py-1 px-0.5 text-stone-600 text-[11px]">
                  🛒<br />ของดี
                </div>
                <div className="py-1 px-0.5 text-stone-600 text-[11px]">
                  🌾<br />แปลง
                </div>
                <div className="py-1 px-0.5 text-stone-600 text-[11px]">
                  📢<br />ข่าวสาร
                </div>
                <div className="py-1 px-0.5 text-stone-600 text-[11px]">
                  👨‍🌾<br />แปลงฉัน
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-stone-600 list-disc list-inside">
              <li><strong className="text-stone-800">หน้าแรก:</strong> ภาพรวมของดีเด่น, สถิติเครือข่าย, ข่าวสารล่าสุด</li>
              <li><strong className="text-stone-800">ของดี:</strong> ตลาดรวมผลผลิต แยกตามชนิดและอำเภอ</li>
              <li><strong className="text-stone-800">แปลง:</strong> ค้นหาแปลงกสิกรรมธรรมชาติและศูนย์เรียนรู้ 15 อำเภอ</li>
              <li><strong className="text-stone-800">ข่าวสาร:</strong> ตารางงานเอามื้อสามัคคีและกิจกรรมอบรม</li>
              <li><strong className="text-stone-800">แปลงฉัน:</strong> พื้นที่จัดการสำหรับสมาชิกเกษตรกร</li>
            </ul>
          </div>

          {/* Section 2: Font Size Adjustment */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  การขยายขนาดตัวหนังสือ (Senior-Friendly Font)
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">อ่านสบายตา ปรับได้ 3 ระดับที่มุมบนขวา</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50 text-center space-y-1">
                <div className="text-xs font-bold text-brand-700 bg-white border border-brand-200 py-1 rounded-lg">ปุ่ม ก</div>
                <p className="text-xs font-bold text-stone-800">ขนาดปกติ (18px)</p>
                <p className="text-[11px] text-stone-500">มาตรฐานมือถือ</p>
              </div>
              <div className="p-3.5 rounded-2xl border border-brand-200 bg-brand-50 text-center space-y-1">
                <div className="text-sm font-bold text-brand-800 bg-white border border-brand-300 py-1 rounded-lg">ปุ่ม ก+</div>
                <p className="text-sm font-bold text-brand-900">ขนาดใหญ่ (22px)</p>
                <p className="text-[11px] text-stone-600">อ่านง่าย สบายตา</p>
              </div>
              <div className="p-3.5 rounded-2xl border border-brand-300 bg-brand-100/60 text-center space-y-1">
                <div className="text-base font-extrabold text-brand-900 bg-white border border-brand-400 py-1 rounded-lg">ปุ่ม ก++</div>
                <p className="text-base font-extrabold text-brand-950">ใหญ่พิเศษ (26px)</p>
                <p className="text-[11px] text-brand-800">ชัดเจน ไม่ต้องเพ่ง</p>
              </div>
            </div>
          </div>

          {/* Section 3: SKU Grouping & Contacting */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  การเลือกดูผลผลิต และการติดต่อเกษตรกร
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">เชื่อมต่อตรงกับพี่น้องเกษตรกรตัวจริง</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    🟢 พร้อมจำหน่าย
                  </span>
                  <span className="text-xs text-stone-500">อ.เก้าเลี้ยว</span>
                </div>
                <h4 className="font-bold text-stone-900 text-base">ถ่านไบโอชาร์ (Biochar) เกรดปรับปรุงดิน</h4>
                <p className="text-sm font-bold text-brand-700">50 บาท / ถุง (5 กก.)</p>
                <div className="flex gap-2 pt-2 border-t border-stone-200/80">
                  <span className="flex-1 py-2 text-center rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> โทรติดต่อ
                  </span>
                  <span className="flex-1 py-2 text-center rounded-xl bg-[#06C755] text-white font-bold text-xs flex items-center justify-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> ทัก LINE
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              * ข้อมูลเบอร์โทรและ LINE จะแสดงเฉพาะแปลงที่เกษตรกรเปิดเผยสู่สาธารณะเท่านั้น เพื่อความปลอดภัยและเป็นส่วนตัวของพี่น้องสมาชิก
            </p>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-600 text-white font-bold text-sm shadow-md hover:bg-brand-700 transition-all"
            >
              <span>ไปที่ตลาดของดีเครือข่าย</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: สำหรับสมาชิกเกษตรกรกสิกรรมธรรมชาติ */}
      {/* ========================================================================= */}
      {activeTab === 'member' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-900 text-sm flex items-start gap-3">
            <User className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">พื้นที่สำหรับพี่น้องสมาชิกแปลงกสิกรรมธรรมชาติ จ.นครสวรรค์</p>
              <p className="text-xs sm:text-sm text-emerald-800/90 leading-relaxed">
                ลงทะเบียนแปลงฟรี นำผลผลิตและ By-product มาร่วมรวบรวมในตลาดกลางจังหวัด จัดการง่ายผ่านมือถือเพียงเครื่องเดียว
              </p>
            </div>
          </div>

          {/* Registration 6 Steps */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  ขั้นตอนการสมัครสมาชิกแปลง (ลงทะเบียนฟรี)
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">แตะเมนู "แปลงฉัน" แล้วกดปุ่มเขียวเพื่อเริ่มสมัคร</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-xs font-bold text-brand-700">ขั้นตอนที่ 1</span>
                <p className="font-bold text-stone-900">ข้อมูลเกษตรกร & รูปหน้าตรง</p>
                <p className="text-xs text-stone-500">อัปโหลดรูปหน้าตรงชัดเจน เพื่อสร้างความน่าเชื่อถือให้ผู้บริโภค</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-xs font-bold text-brand-700">ขั้นตอนที่ 2</span>
                <p className="font-bold text-stone-900">ชื่อแปลง & เรื่องเล่าวิถีเกษตร</p>
                <p className="text-xs text-stone-500">บอกเล่าความเป็นมา แรงบันดาลใจในการทำกสิกรรมธรรมชาติ</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-xs font-bold text-brand-700">ขั้นตอนที่ 3</span>
                <p className="font-bold text-stone-900">ที่ตั้งแปลง (อำเภอ/ตำบล)</p>
                <p className="text-xs text-stone-500">เลือก 1 ใน 15 อำเภอของนครสวรรค์</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-xs font-bold text-brand-700">ขั้นตอนที่ 4</span>
                <p className="font-bold text-stone-900">สวิตช์ปิด/เปิด เบอร์โทร & LINE</p>
                <p className="text-xs text-stone-500">เลือกได้ว่าจะเปิดเบอร์ให้คนนอกโทรหา หรือจะปิดไว้เพื่อความเป็นส่วนตัว</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
                <span className="text-xs font-bold text-brand-700">ขั้นตอนที่ 5</span>
                <p className="font-bold text-stone-900">วิถีการทำกสิกรรม</p>
                <p className="text-xs text-stone-500">เช่น โคกหนองนา, ไร้สารเคมี 100%, ปุ๋ยหมักชีวภาพ</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-brand-50 border border-brand-200 space-y-1">
                <span className="text-xs font-bold text-brand-800">ขั้นตอนที่ 6 (สำคัญ)</span>
                <p className="font-bold text-brand-900">ประวัติการอบรมกสิกรรมธรรมชาติ</p>
                <p className="text-xs text-brand-700">ระบุหลักสูตรและศูนย์เรียนรู้ที่เคยอบรมมา เพื่อให้แอดมินพิจารณาอนุมัติ</p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/member/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 transition-all"
              >
                <span>เข้าสู่แบบฟอร์มสมัครสมาชิกแปลง</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 1-Tap Status Switch */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  การเปลี่ยนสถานะผลผลิตใน 1 วินาทีด้วยนิ้วโป้ง
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">ผลผลิตหมดหรือเก็บเกี่ยวใหม่ ไม่ต้องพิมพ์ใหม่ แค่แตะปุ่มสถานะ</p>
              </div>
            </div>

            {/* Mockup Status Buttons */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>ผลผลิต: กล้วยน้ำว้าอินทรีย์</span>
                <span className="text-emerald-700 font-bold">สถานะ: มีขาย 🟢</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="py-2.5 px-1 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center shadow-xs">
                  🟢 มีขาย
                </div>
                <div className="py-2.5 px-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold text-center">
                  🎁 แบ่งปัน
                </div>
                <div className="py-2.5 px-1 rounded-xl bg-stone-100 border border-stone-300 text-stone-600 text-xs font-bold text-center">
                  ⏸️ หมด
                </div>
              </div>
              <p className="text-[12px] text-stone-500">
                * แตะปุ่มเดียว ข้อมูลในตลาดจะอัปเดตทันทีแบบ Real-time ลูกค้าจะไม่โทรสั่งสินค้าที่หมดแล้ว
              </p>
            </div>
          </div>

          {/* Request Admin Assistance */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  ปุ่ม "ขอให้แอดมินช่วยลงข้อมูลแทน"
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">สำหรับพี่น้องเกษตรกรสูงวัย หรือไม่ถนัดพิมพ์ข้อมูลบนมือถือ</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold">
                <HelpCircle className="w-4 h-4" />
                <span>🤝 ขอให้แอดมินช่วยลงข้อมูลแทน</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                เพียงกดปุ่มนี้ในหน้า "แปลงฉัน" แล้วพิมพ์ข้อความสั้นๆ เช่น <em>"มีถ่านไบโอชาร์ 30 ถุง ถุงละ 40 บาท"</em> คำขอจะถูกส่งไปที่ศูนย์แอดมินเครือข่ายทันที เพื่อให้ทีมงานช่วยลงรูปและข้อมูลสินค้าให้ท่านอย่างสะดวกสบาย
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: สำหรับผู้ดูแลระบบเครือข่าย (Admin) */}
      {/* ========================================================================= */}
      {activeTab === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div className="bg-stone-900 text-white rounded-2xl p-5 text-sm flex items-start gap-3 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-300">ศูนย์จัดการแอดมินเครือข่ายกสิกรรมธรรมชาตินครสวรรค์ (/admin)</p>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                ดูแลความถูกต้อง คัดกรองสมาชิก ตรวจสอบประวัติการอบรม ช่วยเหลือสมาชิกสูงวัย และบริหารจัดการหมวดหมู่ของดีประจำจังหวัด
              </p>
            </div>
          </div>

          {/* Pending Approval Inspection */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  การตรวจสอบและอนุมัติสมาชิกใหม่ (Pending Approvals)
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">ป้องกันบุคคลภายนอกที่ไม่ใช่สมาชิกแอบอ้าง</p>
              </div>
            </div>

            {/* Mockup Member Card for Admin */}
            <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-bold text-sm">
                  รูปหน้า
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">นายสมเกียรติ พึ่งตน</h4>
                  <p className="text-xs text-stone-500">แปลงสวนพอเพียงเก้าเลี้ยว | อ.เก้าเลี้ยว</p>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-brand-800">
                  <GraduationCap className="w-4 h-4 text-brand-600" />
                  <span>ประวัติการอบรมกสิกรรมธรรมชาติ:</span>
                </div>
                <p className="text-stone-700"><strong>หลักสูตร:</strong> พัฒนากสิกรรมธรรมชาติสู่ระบบเศรษฐกิจพอเพียง</p>
                <p className="text-stone-700"><strong>อบรมที่:</strong> ศูนย์เรียนรู้กสิกรรมธรรมชาติท่ามะขาม</p>
              </div>

              <div className="flex gap-2 pt-1">
                <span className="flex-1 py-2 text-center rounded-xl bg-emerald-600 text-white font-bold text-xs">
                  ✓ อนุมัติเข้าเครือข่าย
                </span>
                <span className="py-2 px-3 text-center rounded-xl bg-stone-200 text-stone-600 font-bold text-xs">
                  ปฏิเสธ
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              * เมื่อแอดมินกดอนุมัติ แปลงและผลผลิตของสมาชิกจะเปิดสู่สาธารณะทันที และระบบจะบันทึกชื่อแอดมินผู้อนุมัติลง Audit Log อัตโนมัติ
            </p>
          </div>

          {/* Assisted Entry & Audit Logs */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  ระบบช่วยลงข้อมูล & บันทึกประวัติ (Audit Log)
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">ช่วยเหลือสมาชิกอย่างโปร่งใส ตรวจสอบย้อนหลังได้ 100%</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-xs">
                <Clock className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-stone-800 font-bold">แอดมินสมชาย ช่วยลงข้อมูลผลผลิต "ถ่านไบโอชาร์" ให้กับแปลงลุงหวัง</p>
                  <p className="text-[11px] text-stone-500">บันทึกอัตโนมัติเมื่อ 09/09/2026 02:40 น.</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-xs">
                <Clock className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-stone-800 font-bold">แอดมินสมศรี อนุมัติการเป็นสมาชิกของ ป้าสมใจ (สวนสุขใจ)</p>
                  <p className="text-[11px] text-stone-500">บันทึกอัตโนมัติเมื่อ 09/09/2026 01:15 น.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rich Menu Configuration */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className={`${getTextClass('title')} text-lg font-bold text-stone-900`}>
                  การติดตั้ง LINE Rich Menu
                </h3>
                <p className="text-xs sm:text-sm text-stone-500">ดาวน์โหลดภาพ 6 ช่องมาตรฐานไปใส่ใน LINE Official Account</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              เข้าไปที่หน้า <strong>/admin/rich-menu</strong> เพื่อดาวน์โหลดภาพ JPEG ความละเอียด 2500x1686 px พร้อมดูตาราง Action URL สำหรับนำไปผูกในระบบ LINE Official Account Manager ได้ทันที
            </p>

            <Link
              href="/admin/rich-menu"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-800 text-white font-bold text-xs shadow-sm hover:bg-stone-900 transition-all"
            >
              <span>ไปที่หน้าดาวน์โหลด LINE Rich Menu</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-900 text-white font-bold text-sm shadow-md hover:bg-stone-800 transition-all"
            >
              <span>เข้าสู่ศูนย์จัดการแอดมินเครือข่าย</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Safety & PDPA Summary */}
      <div className="bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className={`${getTextClass('title')} text-base font-bold text-stone-900`}>
          มาตรฐานความปลอดภัย & การคุ้มครองข้อมูลส่วนบุคคล (PDPA)
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
          ระบบจะไม่เปิดเผยพิกัดที่ตั้งแปลงจริง (GPS) ของเกษตรกรสู่ภายนอก และจะซ่อนเบอร์โทรศัพท์และ LINE ID อัตโนมัติหากเกษตรกรเลือกปิดสวิตช์ เพื่อปกป้องพี่น้องกสิกรรมธรรมชาติจากมิจฉาชีพทุกรูปแบบ
        </p>
      </div>

    </div>
  );
}
