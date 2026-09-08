'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { MemberProfile, Farm, Product } from '@/types';
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
  UserCheck
} from 'lucide-react';

export default function MemberDashboardPage() {
  const { fontSize, setFontSize, getTextClass } = useFontSize();
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAssistModal, setShowAssistModal] = useState(false);
  const [assistNote, setAssistNote] = useState('');
  const [assistSuccess, setAssistSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const user = dataService.getCurrentUser();
    setCurrentUser(user);
    if (user.farmId) {
      const f = dataService.getFarmById(user.farmId);
      if (f) setFarm(f);
      setProducts(dataService.getProductsByFarmId(user.farmId));
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

  if (!currentUser) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Welcome Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-brand-100 shadow-md shrink-0">
          <img
            src={currentUser.facePhotoUrl}
            alt={currentUser.fullName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-stone-900`}>
              สวัสดี, {currentUser.fullName}
            </h1>
            {currentUser.status === 'approved' ? (
              <span className="px-3 py-0.5 rounded-full bg-brand-100 text-brand-800 text-xs font-bold flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>สมาชิกที่ผ่านการยืนยัน</span>
              </span>
            ) : (
              <span className="px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>รอการอนุมัติจากแอดมินเครือข่าย</span>
              </span>
            )}
          </div>
          
          <p className="text-sm font-semibold text-stone-500">
            แปลง: <b className="text-stone-800">{farm?.farmName || 'ยังไม่ได้ระบุแปลง'}</b> ({farm?.district})
          </p>

          {currentUser.status === 'pending' && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mt-2 font-medium">
              ⏳ ใบสมัครแปลงของท่านอยู่ระหว่างรอแอดมินเครือข่ายตรวจสอบรูปหน้าและข้อมูล ท่านสามารถลงผลผลิตเตรียมไว้ได้เลยครับ
            </p>
          )}
        </div>

        {/* Quick Add Product Button */}
        <Link
          href="/member/add-product"
          className="px-6 py-4 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-base shadow-lg shadow-brand-600/25 flex items-center gap-2 shrink-0 touch-target-big"
        >
          <Plus className="w-5 h-5" />
          <span>+ เพิ่มผลผลิตใหม่</span>
        </Link>
      </div>

      {/* Grid: Anti-Scam Privacy Settings & Admin Assistance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Anti-Scam Privacy Settings */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-lg">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2>ความปลอดภัยและการแสดงเบอร์โทร</h2>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
            🔒 <b>ระบบตั้งค่าซ่อนเบอร์โทรเป็นค่าเริ่มต้น</b> เพื่อป้องกันมิจฉาชีพและแก๊งคอลเซ็นเตอร์ 
            หากท่านต้องการเปิดให้ผู้ซื้อโทรหรือทักไลน์ได้ สามารถสลับสวิตช์ด้านล่างได้ครับ
          </div>

          <div className="space-y-3 pt-2">
            
            {/* Phone Toggle */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${currentUser.isPublicPhone ? 'bg-brand-100 text-brand-700' : 'bg-stone-200 text-stone-400'}`}>
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">แสดงเบอร์โทรศัพท์ ({currentUser.phone})</p>
                  <p className="text-xs text-stone-500">
                    {currentUser.isPublicPhone ? '🟢 เปิดให้คนทั่วไปโทรหาได้' : '🔴 ซ่อนไว้ คนนอกไม่เห็นเบอร์'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentUser.isPublicPhone}
                onChange={handleTogglePhone}
                className="w-6 h-6 rounded-md text-brand-600 focus:ring-brand-500 accent-brand-600"
              />
            </label>

            {/* LINE Toggle */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${currentUser.isPublicLine ? 'bg-[#06C755]/10 text-[#06C755]' : 'bg-stone-200 text-stone-400'}`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">แสดงปุ่มทัก LINE ({currentUser.lineId})</p>
                  <p className="text-xs text-stone-500">
                    {currentUser.isPublicLine ? '🟢 เปิดให้คนภายนอกทักแชทได้' : '🔴 ซ่อนไว้'}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={currentUser.isPublicLine}
                onChange={handleToggleLine}
                className="w-6 h-6 rounded-md text-brand-600 focus:ring-brand-500 accent-brand-600"
              />
            </label>

          </div>
        </div>

        {/* 1-Click Admin Assistance (ผู้ช่วยแอดมินสำหรับผู้สูงอายุ) */}
        <div className="bg-gradient-to-br from-emerald-50 to-brand-50/50 p-6 rounded-3xl border border-brand-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-brand-900 font-bold text-lg">
              <HelpCircle className="w-5 h-5 text-brand-700" />
              <h2>บริการผู้ช่วยลงข้อมูล (Assisted Entry)</h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              สำหรับสมาชิกที่ไม่สะดวกพิมพ์มือถือ หรือมีผลผลิตใหม่ต้องการให้แอดมินช่วยถ่ายทอดข้อมูลลงระบบ 
              สามารถกดปุ่มนี้เพื่อส่งคำขอ แอดมินจะช่วยบันทึกข้อมูลแทนให้ทันที
            </p>

            {currentUser.delegationStatus === 'requested' && (
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>คำขอของท่านอยู่ในคิวแอดมินแล้ว แอดมินจะดำเนินการและแจ้งกลับครับ</span>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              onClick={() => setShowAssistModal(true)}
              className="w-full py-4 px-6 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-base shadow-md shadow-brand-700/20 flex items-center justify-center gap-2 transition-all touch-target-big"
            >
              <HelpCircle className="w-5 h-5" />
              <span>🤝 ขอให้แอดมินช่วยลงข้อมูลแทน</span>
            </button>
          </div>
        </div>

      </div>

      {/* Member's Product Management Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            ผลผลิตในแปลงของฉัน ({products.length} รายการ)
          </h2>
          <Link
            href="/member/add-product"
            className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1"
          >
            <span>+ เพิ่มรายการใหม่</span>
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
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
          <div className="space-y-3">
            {products.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-16 h-16 rounded-2xl object-cover border border-stone-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                      {item.skuTagName}
                    </span>
                    <h3 className="font-bold text-stone-900 text-base truncate mt-0.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      {item.status === 'share' ? '💙 แบ่งปันฟรี' : `฿${item.price} / ${item.unit}`}
                    </p>
                  </div>
                </div>

                {/* Status Quick Select Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs font-bold text-stone-400 shrink-0">สถานะ:</span>
                  <button
                    onClick={() => handleStatusChange(item.id, 'sale')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                      item.status === 'sale'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    🟢 มีขาย
                  </button>
                  <button
                    onClick={() => handleStatusChange(item.id, 'share')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                      item.status === 'share'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    🔵 แบ่งปันฟรี
                  </button>
                  <button
                    onClick={() => handleStatusChange(item.id, 'out_of_stock')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                      item.status === 'out_of_stock'
                        ? 'bg-stone-800 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    ⚪ หมดชั่วคราว
                  </button>
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

    </div>
  );
}
