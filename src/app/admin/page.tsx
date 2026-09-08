'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { MemberProfile, CategoryTag, AuditLog, Product, ProductCategory } from '@/types';
import { 
  ShieldCheck, 
  UserCheck, 
  Layers, 
  HelpCircle, 
  History, 
  Plus, 
  Check, 
  X, 
  Eye, 
  Clock, 
  FileText,
  AlertCircle,
  GraduationCap
} from 'lucide-react';

export default function AdminPage() {
  const { getTextClass } = useFontSize();
  const [activeTab, setActiveTab] = useState<'pending' | 'assist' | 'categories' | 'logs'>('pending');
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);

  const [pendingMembers, setPendingMembers] = useState<MemberProfile[]>([]);
  const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
  const [categories, setCategories] = useState<CategoryTag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Assisted Entry Modal State
  const [selectedAssistMember, setSelectedAssistMember] = useState<MemberProfile | null>(null);
  const [assistTitle, setAssistTitle] = useState('');
  const [assistPrice, setAssistPrice] = useState('50');
  const [assistCategory, setAssistCategory] = useState('biochar');
  const [assistSuccess, setAssistSuccess] = useState(false);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🌾');
  const [newCatType, setNewCatType] = useState<ProductCategory>('raw');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('nsw_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('nsw_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const loadData = () => {
    setCurrentUser(dataService.getCurrentUser());
    setPendingMembers(dataService.getPendingMembers());
    setAllMembers(dataService.getAllMembers());
    setCategories(dataService.getCategories());
    setAuditLogs(dataService.getAuditLogs());
  };

  const handleApprove = (memberId: string) => {
    const adminUser = (currentUser?.role === 'admin' ? currentUser : null)
      || dataService.getAllMembers().find((m) => m.role === 'admin')
      || currentUser
      || { 
          id: 'admin-001', 
          fullName: 'แอดมินเครือข่าย', 
          role: 'admin' as const, 
          status: 'approved' as const, 
          fontSizePref: 'normal' as const, 
          phone: '', 
          lineId: '', 
          isPublicPhone: false, 
          isPublicLine: false, 
          isPublicSocials: false, 
          socials: {}, 
          delegationStatus: 'none' as const, 
          farmId: 'farm-001', 
          facePhotoUrl: '', 
          createdAt: '' 
        };
    dataService.approveMember(adminUser, memberId);
    loadData();
  };

  const handleAssistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedAssistMember) return;

    const cat = categories.find((c) => c.id === assistCategory) || categories[0];

    dataService.adminAssistAddProduct(currentUser, selectedAssistMember.id, {
      title: assistTitle,
      skuTagId: cat.id,
      skuTagName: cat.name,
      category: cat.category,
      categoryName: 
        cat.category === 'smartfarm' ? 'สมาร์ทฟาร์ม (Smart Farm)' :
        cat.category === 'tool' ? 'อุปกรณ์ เครื่องมือ' :
        cat.category === 'byproduct' ? 'ปัจจัยการผลิต/By-product' :
        cat.category === 'seed' ? 'เมล็ดพันธุ์/กิ่งพันธุ์' :
        cat.category === 'processed' ? 'แปรรูป' : 'ผลผลิตสด',
      status: 'sale',
      price: Number(assistPrice) || 0,
      unit: 'กก./ชุด',
      description: `แอดมิน ${currentUser.fullName} ลงข้อมูลให้ตามคำขอของสมาชิก`,
      images: ['https://images.unsplash.com/photo-1542385151-efd9000785a0?w=800&h=600&fit=crop'],
    });

    setAssistSuccess(true);
    setTimeout(() => {
      setAssistSuccess(false);
      setSelectedAssistMember(null);
      setAssistTitle('');
      loadData();
    }, 1500);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    dataService.addCategoryTag({
      name: newCatName.trim(),
      icon: newCatIcon || '🌿',
      category: newCatType,
      description: newCatDesc.trim() || 'หมวดหมู่ผลผลิตที่กำหนดโดยแอดมินเครือข่าย',
      isActive: true,
    });

    setNewCatName('');
    setNewCatDesc('');
    setShowAddCat(false);
    loadData();
  };

  const handleToggleCat = (catId: string) => {
    dataService.toggleCategoryStatus(catId);
    loadData();
  };

  const assistQueue = allMembers.filter((m) => m.delegationStatus === 'requested');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Admin Center Header */}
      <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>ศูนย์ควบคุมแอดมินเครือข่าย จ.นครสวรรค์</span>
          </div>
          <h1 className={`${getTextClass('title')} text-2xl sm:text-3xl font-black`}>
            แผงบริหารจัดการ & คัดกรองสมาชิก
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            ผู้ดูแลระบบ: <b className="text-white">{currentUser?.fullName}</b>
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex gap-2 text-xs">
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-emerald-400">{pendingMembers.length}</div>
            <div className="text-[10px] text-stone-400">รออนุมัติ</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white/10 text-center">
            <div className="text-lg font-black text-amber-400">{assistQueue.length}</div>
            <div className="text-[10px] text-stone-400">คิวช่วยลงข้อมูล</div>
          </div>

          <Link
            href="/admin/rich-menu"
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md"
          >
            <span>📱 ภาพริชเมนู LINE</span>
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>อนุมัติสมาชิกใหม่ ({pendingMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assist')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'assist'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>คิวช่วยลงข้อมูลแทน ({assistQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'categories'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>จัดการหมวดหมู่ & SKU กลาง ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'logs'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>ประวัติการแก้ไข (Audit Logs)</span>
        </button>
      </div>

      {/* ================= TAB 1: PENDING MEMBERS VERIFICATION ================= */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500 font-medium">
            คัดกรองสมาชิกด้วยรูปหน้าจริง เพื่อยืนยันว่าเป็นสมาชิกเครือข่ายตัวจริง
          </p>

          {pendingMembers.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
              ไม่มีสมาชิกรอการอนุมัติในขณะนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingMembers.map((member) => {
                const farm = dataService.getFarmById(member.farmId);
                return (
                  <div
                    key={member.id}
                    className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={member.facePhotoUrl}
                          alt={member.fullName}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-200 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-base truncate">
                            {member.fullName}
                          </h4>
                          <p className="text-xs text-stone-600 truncate font-medium">
                            แปลง: {farm?.farmName || 'ยังไม่ระบุ'}
                          </p>
                          <p className="text-xs text-brand-700 font-bold mt-0.5">
                            📍 อ.{farm?.district} {farm?.subdistrict ? `(ต.${farm.subdistrict})` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex gap-2">
                        <button
                          onClick={() => handleApprove(member.id)}
                          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-brand-600/20 transition-all"
                        >
                          <Check className="w-4 h-4" />
                          <span>อนุมัติสมาชิก</span>
                        </button>
                      </div>
                    </div>

                    {/* ข้อมูลประวัติการอบรม (สำหรับแอดมินดูพิจารณา) */}
                    <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-stone-800">
                        <GraduationCap className="w-4 h-4 text-brand-600" />
                        <span>ประวัติการอบรมกสิกรรมธรรมชาติ:</span>
                      </div>
                      <div className="text-stone-700 pl-1 space-y-1">
                        <p>
                          <span className="font-semibold text-stone-500">• หลักสูตร: </span>
                          <span className="font-medium text-stone-900">{member.trainingCourse || 'ไม่ได้ระบุ'}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-stone-500">• สถานที่/ศูนย์: </span>
                          <span className="font-medium text-stone-900">{member.trainingLocation || 'ไม่ได้ระบุ'}</span>
                        </p>
                      </div>
                      <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500 font-medium">
                        <span>📞 {member.phone}</span>
                        {member.lineId && <span>LINE: {member.lineId}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ASSISTED ENTRY QUEUE (ช่วยลงข้อมูลแทน) ================= */}
      {activeTab === 'assist' && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500 font-medium">
            รายการสมาชิกร้องขอความช่วยเหลือ ทุกการบันทึกแทนจะถูกบันทึกประวัติ (Traceability) อัตโนมัติ
          </p>

          {assistQueue.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
              ไม่มีคำขอช่วยลงข้อมูลที่ค้างอยู่
            </div>
          ) : (
            <div className="space-y-4">
              {assistQueue.map((m) => {
                const farm = dataService.getFarmById(m.farmId);
                return (
                  <div
                    key={m.id}
                    className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                          คำขอความช่วยเหลือ
                        </span>
                        <h4 className="font-bold text-stone-900 text-base">
                          {m.fullName} ({farm?.farmName})
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-600 italic bg-stone-50 p-2.5 rounded-xl border border-stone-100 mt-1">
                        "{m.delegationNote || 'ขอให้แอดมินช่วยลงผลผลิตให้'}"
                      </p>
                      <p className="text-xs text-stone-400">
                        เบอร์ติดต่อสมาชิก: {m.phone}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAssistMember(m);
                        setAssistTitle('');
                      }}
                      className="px-5 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-2xl text-xs sm:text-sm font-bold shrink-0 shadow-md flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เปิดฟอร์มช่วยลงข้อมูล</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: DYNAMIC CATEGORY & SKU MANAGEMENT ================= */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                หมวดหมู่และชนิดผลผลิตกลางของเครือข่าย (Standard SKU Tags)
              </h3>
              <p className="text-xs text-stone-500">
                แอดมินสามารถเพิ่มหรือเปิด/ปิดชนิดผลผลิต เพื่อให้สมาชิกใช้จับคู่กลุ่มสินค้าได้
              </p>
            </div>
            <button
              onClick={() => setShowAddCat(!showAddCat)}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มชนิดผลผลิต</span>
            </button>
          </div>

          {/* Add Category Form */}
          {showAddCat && (
            <form onSubmit={handleAddCategory} className="p-5 rounded-3xl bg-brand-50/70 border border-brand-200 space-y-3">
              <h4 className="font-bold text-brand-900 text-sm">เพิ่มชนิดผลผลิต / By-product ใหม่</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="ชื่อ เช่น น้ำหมักรสจืด, กล้วยหอมทอง"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm"
                />
                <input
                  type="text"
                  placeholder="ไอคอน เช่น 🍯, 🌿, 🌾"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm"
                />
                <select
                  value={newCatType}
                  onChange={(e) => setNewCatType(e.target.value as any)}
                  className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm"
                >
                  <option value="raw">ผลผลิตสด</option>
                  <option value="processed">แปรรูป</option>
                  <option value="byproduct">ปัจจัยการผลิต / By-product</option>
                  <option value="seed">เมล็ดพันธุ์/กิ่งพันธุ์</option>
                  <option value="tool">อุปกรณ์ / เครื่องมือ</option>
                  <option value="smartfarm">สมาร์ทฟาร์ม / Smart Farm</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="คำอธิบายสั้นๆ..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCat(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-white border"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700"
                >
                  บันทึกชนิดผลผลิต
                </button>
              </div>
            </form>
          )}

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl p-2 bg-stone-50 rounded-xl shrink-0">
                    {cat.icon}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-stone-900 text-sm truncate">
                      {cat.name}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-medium">
                      {cat.category === 'smartfarm' ? '📡 สมาร์ทฟาร์ม' :
                       cat.category === 'tool' ? '🛠️ อุปกรณ์ เครื่องมือ' :
                       cat.category === 'byproduct' ? '🪵 ปัจจัยการผลิต' :
                       cat.category === 'seed' ? '🌱 เมล็ดพันธุ์' :
                       cat.category === 'processed' ? '🍯 แปรรูป' : '🌾 ผลผลิตสด'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleCat(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    cat.isActive
                      ? 'bg-brand-100 text-brand-800'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {cat.isActive ? 'เปิดใช้' : 'ปิดชั่วคราว'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: AUDIT LOGS (ประวัติการดำเนินการเพื่อความโปร่งใส) ================= */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-stone-900 text-base">
              บันทึกการทำงานของแอดมิน (Traceability Log)
            </h3>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1"
              >
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-bold text-brand-700">{log.action}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-sm font-semibold text-stone-800">
                  {log.details}
                </p>
                <p className="text-xs text-stone-400">
                  ดำเนินการโดย: {log.performedByAdminName} | สมาชิกเป้าหมาย: {log.targetMemberName} ({log.targetFarmName})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assisted Entry Form Modal */}
      {selectedAssistMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-lg">
                ช่วยลงผลผลิตแทน: {selectedAssistMember.fullName}
              </h3>
              <button
                onClick={() => setSelectedAssistMember(null)}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssistSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  ชนิดผลผลิต (SKU)
                </label>
                <select
                  value={assistCategory}
                  onChange={(e) => setAssistCategory(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  ชื่อผลผลิต
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กล้วยน้ำว้าอินทรีย์สวนคุณตา..."
                  value={assistTitle}
                  onChange={(e) => setAssistTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">
                  ราคา (บาท)
                </label>
                <input
                  type="number"
                  value={assistPrice}
                  onChange={(e) => setAssistPrice(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 text-sm font-bold text-brand-700"
                />
              </div>

              {assistSuccess && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs font-bold text-brand-900 text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-brand-600" />
                  <span>บันทึกผลผลิตและสร้าง Audit Log เรียบร้อยแล้ว!</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssistMember(null)}
                  className="flex-1 py-3 rounded-2xl border text-stone-700 font-bold text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={assistSuccess}
                  className="flex-1 py-3 rounded-2xl bg-brand-700 text-white font-bold text-sm hover:bg-brand-800 shadow-md"
                >
                  บันทึกข้อมูลแทน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
