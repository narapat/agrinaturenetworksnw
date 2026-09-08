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
  UserCheck,
  Sprout
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
    if (user && user.farmId) {
      const f = dataService.getFarmById(user.farmId);
      if (f) setFarm(f);
      setProducts(dataService.getProductsByFarmId(user.farmId));
    } else {
      setFarm(null);
      setProducts([]);
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

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200 shadow-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-brand-50 border-2 border-brand-200 flex items-center justify-center text-brand-700 shadow-inner">
            <Sprout className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-brand-100/80 text-brand-800 text-xs font-bold">
              เครือข่ายกสิกรรมธรรมชาติ จังหวัดนครสวรรค์
            </span>
            <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black text-stone-900`}>
              ยินดีต้อนรับสู่เครือข่ายกสิกรรมธรรมชาติ
            </h1>
            <p className="text-stone-600 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              ท่านเข้าสู่ระบบในฐานะบุคคลทั่วไป (ยังไม่ได้ลงทะเบียนสมาชิกแปลง) สมัครสมาชิกเพียงครั้งเดียวเพื่อนำผลผลิต วัตถุดิบ และปัจจัยการผลิตมาร่วมรวบรวมและแบ่งปันกันในเครือข่าย
            </p>
          </div>

          {/* Value highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto py-2">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-start gap-3">
              <span className="text-xl">🪵</span>
              <div>
                <p className="font-bold text-stone-800 text-sm">รวมผลผลิต & ปัจจัยการผลิต</p>
                <p className="text-xs text-stone-500">ถ่านไบโอชาร์, น้ำส้มควันไม้, ปุ๋ยหมัก, กล้วย, เมล็ดพันธุ์</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-start gap-3">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="font-bold text-stone-800 text-sm">ปลอดภัย 100% (Anti-Scam)</p>
                <p className="text-xs text-stone-500">ซ่อนเบอร์โทรศัพท์และพิกัดบ้านจริงจากมิจฉาชีพ</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-start gap-3">
              <span className="text-xl">🤝</span>
              <div>
                <p className="font-bold text-stone-800 text-sm">เกื้อกูล 15 อำเภอ</p>
                <p className="text-xs text-stone-500">จับคู่สินค้า ขยายช่องทางจำหน่ายและแบ่งปันในนครสวรรค์</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 flex items-start gap-3">
              <span className="text-xl">👵</span>
              <div>
                <p className="font-bold text-stone-800 text-sm">มีระบบแอดมินช่วยคีย์แทน</p>
                <p className="text-xs text-stone-500">สำหรับผู้สูงอายุที่ไม่ถนัดพิมพ์ในสมาร์ทโฟน</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3 max-w-md mx-auto">
            <Link
              href="/member/register"
              className="w-full py-4 px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-black text-lg shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 transition-all touch-target-big"
            >
              <Plus className="w-6 h-6" />
              <span>สมัครสมาชิกแปลงของคุณทันที (ลงทะเบียนฟรี)</span>
            </Link>

            <button
              onClick={() => {
                dataService.switchUser('mem-001');
                window.location.reload();
              }}
              className="w-full py-3 px-4 rounded-2xl border border-stone-300 hover:bg-stone-50 text-stone-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <span>🌿 ทดลองดูหน้าจัดการแปลงตัวอย่าง (Demo: ลุงสมชาย)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      
      {/* Top Welcome Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden border-3 border-brand-100 shadow-md shrink-0">
          <img
            src={currentUser.facePhotoUrl}
            alt={currentUser.fullName}
            className="w-full h-full object-cover"
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
                className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
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
                    <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                      {item.skuTagName}
                    </span>
                    <h3 className="font-bold text-stone-900 text-sm sm:text-base line-clamp-1 mt-0.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-500 font-semibold mt-0.5">
                      {item.status === 'share' ? '💙 แบ่งปันฟรี' : `฿${item.price} / ${item.unit}`}
                    </p>
                  </div>
                </div>

                {/* Status Select Buttons: Full-width 3-button grid on mobile, flex on desktop */}
                <div className="w-full sm:w-auto pt-2 border-t border-stone-100 sm:pt-0 sm:border-0">
                  <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'sale')}
                      className={`py-2 px-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                        item.status === 'sale'
                          ? 'bg-brand-600 text-white shadow-xs font-black'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      🟢 มีขาย
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'share')}
                      className={`py-2 px-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                        item.status === 'share'
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      🔵 แบ่งปันฟรี
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item.id, 'out_of_stock')}
                      className={`py-2 px-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                        item.status === 'out_of_stock'
                          ? 'bg-stone-800 text-white shadow-xs font-black'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      ⚪ หมด
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

    </div>
  );
}
