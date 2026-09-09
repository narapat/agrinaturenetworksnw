'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { 
  BookOpen, 
  ShoppingBag, 
  User, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  MessageSquare, 
  Lock, 
  Shield, 
  Layers, 
  GraduationCap,
  Download,
  Smartphone,
  Check
} from 'lucide-react';

export default function ManualPage() {
  const { getTextClass } = useFontSize();
  const [activeTab, setActiveTab] = useState<'consumer' | 'member' | 'admin'>('consumer');

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-brand-800 via-brand-900 to-stone-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-xs font-bold backdrop-blur-xs">
            <Smartphone className="w-4 h-4" />
            <span>คู่มือการใช้งานระบบออนไลน์ (Mobile Manual)</span>
          </div>
          <h1 className={`${getTextClass('title')} text-2xl sm:text-4xl font-black text-white leading-tight`}>
            คู่มือการใช้งานระบบเครือข่ายกสิกรรมธรรมชาติ
          </h1>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="bg-stone-200/70 p-1 rounded-2xl grid grid-cols-3 gap-1 shadow-inner sticky top-[68px] sm:top-[80px] z-30 backdrop-blur-md bg-stone-200/90">
        <button
          onClick={() => setActiveTab('consumer')}
          className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'consumer'
              ? 'bg-white text-brand-800 shadow-md'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span>สำหรับผู้ซื้อ/ผู้บริโภค</span>
        </button>
        <button
          onClick={() => setActiveTab('member')}
          className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'member'
              ? 'bg-white text-brand-800 shadow-md'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>สมาชิกเกษตรกร</span>
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'admin'
              ? 'bg-white text-brand-800 shadow-md'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>แอดมินเครือข่าย</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: สำหรับผู้บริโภค / ประชาชนทั่วไป */}
      {/* ========================================================================= */}
      {activeTab === 'consumer' && (
        <div className="space-y-10 animate-in fade-in duration-200">
          
          {/* Feature Card 1: Bottom Navigation Bar */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className={`${getTextClass('subtitle')} text-lg sm:text-xl font-bold text-stone-900`}>
                แถบเมนูด้านล่าง 5 ปุ่ม (เต็มความกว้าง พอดีหน้าจอมือถือ)
              </h2>
            </div>
            
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              ที่ด้านล่างสุดของหน้าจอบนมือถือ จะมีแถบเมนู 5 ช่องพอดี ไม่ล้นขอบ ไม่ต้องเลื่อนแนวนอน:
            </p>

            {/* Real Screenshot with Mobile Frame */}
            <div className="max-w-xs mx-auto rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-black">
              <img
                src="/screenshots/01_home.png"
                alt="หน้าแรกกสิกรรมธรรมชาตินครสวรรค์"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 space-y-2 text-xs sm:text-sm text-stone-700">
              <p>• <strong>🏠 หน้าแรก:</strong> ศูนย์รวมของดีเด่น ข่าวสาร และสถิติเครือข่าย</p>
              <p>• <strong>🛒 ของดี:</strong> แคตตาล็อกสินค้า ผักอินทรีย์ ผลไม้ ถ่านไบโอชาร์ น้ำส้มควันไม้</p>
              <p>• <strong>📍 แปลง:</strong> ทำเนียบแปลงกสิกรรมธรรมชาติและศูนย์เรียนรู้ 15 อำเภอ</p>
              <p>• <strong>📰 ข่าวสาร:</strong> กิจกรรมเอามื้อสามัคคีและหลักสูตรอบรมโคกหนองนา</p>
              <p>• <strong>👤 แปลงฉัน:</strong> พื้นที่จัดการสำหรับเกษตรกร หรือสมัครสมาชิกแปลงใหม่</p>
            </div>
          </div>

          {/* Feature Card 2: Catalog & SKU Grouping */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                2
              </span>
              <h2 className={`${getTextClass('subtitle')} text-lg sm:text-xl font-bold text-stone-900`}>
                การค้นหาของดี และการเลือกดูผลผลิตแบบรวมกลุ่ม (SKU)
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              ผู้บริโภคสามารถค้นหาชื่อสินค้า กรองตามอำเภอในนครสวรรค์ หรือแตะดูว่าสินค้าที่ต้องการมีจำหน่ายกี่แปลง ราคาเริ่มต้นเท่าไร:
            </p>

            <div className="max-w-xs mx-auto rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-black">
              <img
                src="/screenshots/02_catalog.png"
                alt="ตลาดของดีเครือข่ายนครสวรรค์"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs sm:text-sm text-emerald-900 space-y-1">
              <p className="font-bold">✨ จุดเด่นการรวมกลุ่มผลผลิต (Cross-Farm SKU):</p>
              <p>
                เช่น เมื่อต้องการ <strong>"กล้วยน้ำว้า"</strong> หรือ <strong>"ถ่านไบโอชาร์"</strong> ระบบจะรวบรวมให้เห็นว่ามีพี่น้องแปลงใดบ้างในนครสวรรค์ที่มีสินค้านี้ พร้อมราคาเปรียบเทียบ เพื่อความสะดวกในการอุดหนุนแปลงใกล้บ้าน
              </p>
            </div>
          </div>

          {/* Feature Card 3: Product Detail & Direct Contact */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                3
              </span>
              <h2 className={`${getTextClass('subtitle')} text-lg sm:text-xl font-bold text-stone-900`}>
                หน้ารายละเอียดผลผลิต & การติดต่อเกษตรกรโดยตรง
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              แตะที่สินค้าตัวใดก็ได้เพื่อดูรูปภาพขนาดใหญ่ เรื่องเล่าวิธีปลูกแบบธรรมชาติ และกดปุ่มโทรหาหรือแชท LINE กับเจ้าของแปลงได้ทันที:
            </p>

            <div className="max-w-xs mx-auto rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-black">
              <img
                src="/screenshots/03_product_detail.png"
                alt="หน้ารายละเอียดผลผลิต"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Link
                href="/catalog"
                className="px-6 py-3 rounded-full bg-brand-600 text-white font-bold text-xs sm:text-sm shadow-md hover:bg-brand-700 transition-all flex items-center gap-2"
              >
                <span>เข้าสู่ตลาดของดีเครือข่าย</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: สำหรับสมาชิกเกษตรกรกสิกรรมธรรมชาติ */}
      {/* ========================================================================= */}
      {activeTab === 'member' && (
        <div className="space-y-10 animate-in fade-in duration-200">
          
          {/* Feature Card 1: Member Registration Form */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className={`${getTextClass('subtitle')} text-lg sm:text-xl font-bold text-stone-900`}>
                การสมัครสมาชิกแปลงใหม่ 6 ขั้นตอน (ลงทะเบียนฟรี)
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              แตะเมนู <strong>"แปลงฉัน"</strong> แล้วกดปุ่มเขียว <strong>"+ สมัครสมาชิกแปลงของคุณทันที"</strong> เพื่อเข้าสู่แบบฟอร์ม:
            </p>

            <div className="max-w-xs mx-auto rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-black">
              <img
                src="/screenshots/05_register.png"
                alt="หน้าสมัครสมาชิกแปลงกสิกรรมธรรมชาติ"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 space-y-2 text-xs sm:text-sm text-stone-700">
              <p><strong>1. รูปหน้าตรง:</strong> ถ่ายรูปหน้าตรงคู่กับแปลง เพื่อให้แอดมินคัดกรองและยืนยันตัวตน</p>
              <p><strong>2. ชื่อแปลง & เรื่องเล่า:</strong> ตั้งชื่อแปลงและบอกเล่าแรงบันดาลใจ</p>
              <p><strong>3. ที่ตั้ง:</strong> เลือก 1 ใน 15 อำเภอ และระบุตำบล</p>
              <p><strong>4. ความเป็นส่วนตัว:</strong> เลือกเปิด/ปิดเบอร์โทรและ LINE ID เพื่อป้องกันมิจฉาชีพ</p>
              <p><strong>5. วิถีการทำเกษตร:</strong> ระบุวิถีธรรมชาติ เช่น โคกหนองนา, ไร้สารเคมี 100%</p>
              <p className="text-brand-800 font-bold bg-brand-50 p-2 rounded-xl">
                <strong>6. ข้อมูลการอบรม:</strong> ระบุหลักสูตรและศูนย์เรียนรู้ที่เคยอบรมมา เพื่อให้แอดมินใช้พิจารณาอนุมัติ
              </p>
            </div>
          </div>

          {/* Feature Card 2: Adding Produce & Farm Data (การลงรายการผลผลิตใหม่) */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                2
              </span>
              <h2 className={`${getTextClass('subtitle')} text-lg sm:text-xl font-bold text-stone-900`}>
                การเพิ่มข้อมูลผลผลิตและของดีในแปลง (ลงรายการสินค้า)
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              เมื่อแปลงลงทะเบียนแล้ว ท่านสามารถเพิ่มรายการผลผลิตสด แปรรูป ปัจจัยการผลิต อุปกรณ์เครื่องมือ หรือเมล็ดพันธุ์ขึ้นสู่ตลาดของดี 15 อำเภอได้ทันที โดยแตะปุ่ม <strong>"+ เพิ่มรายการใหม่"</strong>:
            </p>

            <div className="max-w-xs mx-auto rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-black">
              <img
                src="/screenshots/05_add_product.png"
                alt="หน้าเพิ่มผลผลิตและข้อมูลสินค้าใหม่"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 space-y-3 text-xs sm:text-sm text-stone-700">
              <div className="space-y-1.5">
                <p className="font-bold text-stone-900 text-sm">ขั้นตอนการกรอกข้อมูลผลผลิต:</p>
                <p>
                  <strong>1. ถ่ายรูปหรือเลือกรูปภาพผลผลิต:</strong> ถ่ายรูปจากกล้องมือถือหรือเลือกรูปสวยๆ ในเครื่อง มีระบบตัดและปรับขนาดภาพสี่เหลี่ยมให้อัตโนมัติ ไม่ยืดไม่เบี้ยว
                </p>
                <p>
                  <strong>2. เลือกกลุ่มผลผลิตมาตรฐาน (SKU Tag):</strong> เช่น <em>กล้วยน้ำว้า, ข้าวหอมมะลิอินทรีย์, มะนาวแป้น, ไข่ไก่อารมณ์ดี, น้ำหมักชีวภาพ, ปุ๋ยหมักโบกาฉิ, เตาเผาถ่านไบโอชาร์, จอบ/อุปกรณ์การเกษตร, เมล็ดพันธุ์</em> เพื่อให้ผู้บริโภคค้นหาเจอง่ายและจัดกลุ่มของดี 15 อำเภอ
                </p>
                <p>
                  <strong>3. ตั้งชื่อผลผลิต:</strong> ใส่ชื่อที่โดดเด่น เช่น <em>"กล้วยน้ำว้ามะลิอ่อง หวีใหญ่ ไม่รมแก๊ส"</em> หรือ <em>"ไข่ไก่ปล่อยแปลง เลี้ยงด้วยแหนแดง"</em>
                </p>
                <p>
                  <strong>4. กำหนดสถานะและราคา:</strong>
                </p>
                <div className="pl-3 space-y-1 text-stone-600">
                  <p>• <strong>🟢 โหมดขาย (Sale):</strong> ระบุราคาต่อหน่วย เช่น 35 บาท/หวี, 50 บาท/กิโลกรัม</p>
                  <p>• <strong>🎁 โหมดแบ่งปัน (Share):</strong> ราคาจะปรับเป็น 0 บาททันที สำหรับแจกฟรี หรือแลกเปลี่ยนเมล็ดพันธุ์/เอามื้อ</p>
                  <p>• <strong>⏳ โหมดสั่งจอง (Pre-order):</strong> สำหรับผลผลิตที่กำลังจะเก็บเกี่ยวตามฤดูกาล</p>
                </div>
                <p>
                  <strong>5. ระบุหน่วยนับ:</strong> เช่น กิโลกรัม, หวี, ถุง, กำ, มัด, แผง, ขวด
                </p>
                <p>
                  <strong>6. ใส่เรื่องเล่า & คำอธิบาย:</strong> บรรยายวิถีธรรมชาติ เช่น <em>"ปลูกแบบอินทรีย์ ไร้สารเคมี 100% ปุ๋ยหมักใบก้ามปู รสหวานธรรมชาติ"</em>
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200 text-brand-800 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>เมื่อกดบันทึก ผลผลิตจะขึ้นแสดงผลบนหน้าของดีเครือข่ายและหน้าแปลงของท่านทันที</span>
              </div>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Link
                href="/member/add-product"
                className="px-6 py-3 rounded-full bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <span>ไปยังหน้าลงรายการผลผลิตใหม่</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Feature Card 3: Member Dashboard & Privacy */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                3
              </span>
              <h2 className={`${getTextClass('subtitle')} text-lg sm:text-xl font-bold text-stone-900`}>
                หน้า "แปลงของฉัน" (Dashboard) & สลับสถานะใน 1 วินาที
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              จัดการแปลงได้ง่าย สลับเปิด-ปิดเบอร์โทรศัพท์ และเปลี่ยนสถานะผลผลิตด้วยนิ้วโป้งเดียว (มีขาย / แบ่งปัน / หมด):
            </p>

            <div className="max-w-xs mx-auto rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-black">
              <img
                src="/screenshots/06_dashboard.png"
                alt="หน้าจัดการแปลงของฉัน"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 space-y-2 text-xs sm:text-sm text-stone-700">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>การคุ้มครองเบอร์โทรศัพท์ (Anti-Scam):</span>
              </div>
              <p className="text-stone-600">
                ท่านสามารถแตะสลับสวิตช์ <strong>"แสดงเบอร์โทร"</strong> ได้ตลอดเวลา หากปิดไว้ เบอร์โทรของท่านจะถูกลบออกจากฝั่งคนนอก 100% เพื่อความปลอดภัยสูงสุด
              </p>
              <div className="pt-2 border-t border-stone-200">
                <p className="font-bold text-stone-900">ปุ่มเปลี่ยนสถานะผลผลิต 3 ปุ่ม:</p>
                <p>• <strong>🟢 มีขาย:</strong> สินค้าเปิดจำหน่ายในตลาดทันที</p>
                <p>• <strong>🔵 แบ่งปันฟรี:</strong> แจกจ่ายเกื้อกูลกันหรือแลกเปลี่ยนเมล็ดพันธุ์</p>
                <p>• <strong>⚪ หมด:</strong> ปิดการแสดงผลชั่วคราว ลูกค้าจะไม่โทรสั่ง</p>
              </div>
            </div>

            {/* Assisted Entry */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs sm:text-sm text-amber-900 space-y-1">
              <p className="font-bold">🤝 บริการผู้ช่วยลงข้อมูล (Assisted Entry):</p>
              <p>
                หากสมาชิกท่านใดไม่สะดวกพิมพ์ ให้แตะปุ่ม <strong>"ขอให้แอดมินช่วยลงข้อมูลแทน"</strong> แล้วบอกชื่อสินค้า คำขอนี้จะส่งตรงไปยังแอดมินเครือข่ายเพื่อช่วยลงข้อมูลให้ท่านทันที
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <Link
                href="/member/dashboard"
                className="px-6 py-3 rounded-full bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <span>เข้าสู่หน้าแปลงของฉัน</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: สำหรับผู้ดูแลระบบเครือข่าย (Admin) */}
      {/* ========================================================================= */}
      {activeTab === 'admin' && (
        <div className="space-y-10 animate-in fade-in duration-200">
          
          {/* Feature Card 1: Admin Passcode Lock */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                1
              </span>
              <h2 className={`${getTextClass('subtitle')} text-lg sm:text-xl font-bold text-stone-900`}>
                การป้องกันสิทธิ์เข้าถึงศูนย์แอดมิน (Admin Passcode Lock)
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              ระบบมีระบบป้องกันสิทธิ์ 2 ชั้น บุคคลทั่วไปจะไม่สามารถเข้าดูหรือแก้ไขข้อมูลภายในได้ ต้องกรอกรหัสผ่านแอดมินเพื่อปลดล็อก:
            </p>

            <div className="max-w-xs mx-auto rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-black">
              <img
                src="/screenshots/07_admin_lock.png"
                alt="หน้าล็อกรหัสผ่านแอดมิน"
                className="w-full h-auto object-cover"
              />
            </div>

            <p className="text-xs text-stone-500 text-center">
              * ระบบยืนยันสิทธิ์แอดมินเครือข่าย: ผู้ดูแลระบบสามารถเข้าสู่ระบบด้วยรหัสผ่านเฉพาะแอดมิน หรือเข้าสู่ระบบผ่าน LINE ที่ได้รับการแต่งตั้งสิทธิ์
            </p>
          </div>

          {/* Feature Card 2: Member Verification & Approval */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                2
              </span>
              <h2 className={`${getTextClass('subtitle')} text-lg sm:text-xl font-bold text-stone-900`}>
                การตรวจสอบรูปหน้าตรง & ประวัติการอบรม เพื่ออนุมัติสมาชิก
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              เมื่อมีผู้สมัครแปลงใหม่ แอดมินจะเห็นรูปหน้าตรง พิกัดอำเภอ และคำตอบประวัติการอบรมทั้ง 2 ข้อเพื่อใช้พิจารณาก่อนกดอนุมัติ:
            </p>

            <div className="max-w-xs mx-auto rounded-3xl overflow-hidden border-4 border-stone-800 shadow-2xl bg-black">
              <img
                src="/screenshots/08_admin_dashboard.png"
                alt="ศูนย์แอดมินคัดกรองสมาชิก"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 space-y-2 text-xs sm:text-sm text-stone-700">
              <p>• <strong>ปุ่มอนุมัติสมาชิก:</strong> เมื่อกดอนุมัติ แปลงและผลผลิตจะเปิดสู่สาธารณะทันที</p>
              <p>• <strong>คิวช่วยลงข้อมูล:</strong> รับคำขอจากสมาชิกสูงวัย แล้วช่วยลงรูปและราคาให้</p>
              <p>• <strong>Audit Logs:</strong> บันทึกประวัติทุกการกระทำของแอดมิน ตรวจสอบย้อนหลังได้เพื่อความโปร่งใส</p>
            </div>
          </div>

        </div>
      )}

      {/* Footer Navigation Back to Home */}
      <div className="text-center pt-6 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-stone-300 bg-white text-stone-700 font-bold text-xs sm:text-sm shadow-xs hover:bg-stone-50 transition-all"
        >
          <span>← กลับสู่หน้าแรกของเครือข่าย</span>
        </Link>
      </div>

    </div>
  );
}
