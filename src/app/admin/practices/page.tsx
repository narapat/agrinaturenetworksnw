'use client';

import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import { adminApi } from '@/services/adminApi';
import type { FarmPracticeTag, PracticeCategory } from '@/types';
import {
  Plus,
  X,
  Eye,
  AlertCircle,
  Search,
  Trash2,
  Edit3,
  EyeOff,
  CheckCircle2,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { ModalError } from '@/app/admin/_components/ModalError';
import { useAdminData, LINE_ONLY_HINT } from '@/app/admin/_components/AdminDataContext';

/** /admin/practices — จัดการวิถีและศาสตร์กสิกรรมธรรมชาติ */
export default function AdminPracticesPage() {
  const {
    practices,
    isPasscodeSession,
    runAction,
    busyKey,
  } = useAdminData();

  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceCatFilter, setPracticeCatFilter] = useState<string>('all');
  const [practiceFeedback, setPracticeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Practice State
  const [showAddPractice, setShowAddPractice] = useState(false);
  const [newPracticeName, setNewPracticeName] = useState('');
  const [newPracticeIcon, setNewPracticeIcon] = useState('🌱');
  const [newPracticeCategory, setNewPracticeCategory] = useState<PracticeCategory>('other');
  const [newPracticeDesc, setNewPracticeDesc] = useState('');

  // Practice Edit & Delete State
  const [editingPractice, setEditingPractice] = useState<FarmPracticeTag | null>(null);
  const [editPracticeName, setEditPracticeName] = useState('');
  const [editPracticeIcon, setEditPracticeIcon] = useState('🌱');
  const [editPracticeCategory, setEditPracticeCategory] = useState<PracticeCategory>('other');
  const [editPracticeDesc, setEditPracticeDesc] = useState('');
  const [editPracticeActive, setEditPracticeActive] = useState(true);

  const [deletingPractice, setDeletingPractice] = useState<FarmPracticeTag | null>(null);
  // ข้อผิดพลาดที่ต้องแสดงในกล่อง modal (แถบแจ้งเตือนของหน้าถูกฉากมืดบัง)
  const [modalError, setModalError] = useState<string | null>(null);
  useEffect(() => setModalError(null), [editingPractice, deletingPractice]);
  const [targetReassignPracticeId, setTargetReassignPracticeId] = useState<string>('');

  // ==================== FARM PRACTICES HANDLERS ====================
  const showPracticeFeedback = (type: 'success' | 'error', text: string, ms = 4500) => {
    setPracticeFeedback({ type, text });
    setTimeout(() => setPracticeFeedback(null), ms);
  };

  const handleAddPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPracticeName.trim()) return;

    const res = await runAction(
      'practice:add',
      () =>
        adminApi.addPractice({
          name: newPracticeName.trim(),
          icon: newPracticeIcon.trim() || '🌱',
          category: newPracticeCategory,
          description: newPracticeDesc.trim() || 'วิถีและศาสตร์กสิกรรมธรรมชาติ',
        }),
      (msg) => showPracticeFeedback('error', msg)
    );
    if (!res) return;

    setNewPracticeName('');
    setNewPracticeIcon('🌱');
    setNewPracticeDesc('');
    setShowAddPractice(false);
    showPracticeFeedback('success', `เพิ่มวิถี/ศาสตร์ "${res.practice.name}" เรียบร้อยแล้ว`);
  };

  const handleTogglePractice = async (practiceId: string) => {
    const practice = practices.find((p) => p.id === practiceId);
    if (!practice) return;
    const farmCount = dataService.getFarmCountByPractice(practice.name);

    const ok = await runAction(
      `practice:toggle:${practiceId}`,
      () => adminApi.updatePractice(practiceId, { isActive: !practice.isActive }),
      (msg) => showPracticeFeedback('error', msg)
    );
    if (!ok) return;

    showPracticeFeedback(
      'success',
      practice.isActive
        ? `ปิดการเลือกสำหรับ "${practice.name}" แล้ว${farmCount > 0 ? ` (แปลงเดิม ${farmCount} แปลงยังคงแสดงป้ายนี้ตามปกติ)` : ''}`
        : `เปิดให้เลือกวิถี/ศาสตร์ "${practice.name}" เรียบร้อยแล้ว`
    );
  };

  const handleOpenEditPractice = (practice: FarmPracticeTag) => {
    setEditingPractice(practice);
    setEditPracticeName(practice.name);
    setEditPracticeIcon(practice.icon || '🌱');
    setEditPracticeCategory(practice.category);
    setEditPracticeDesc(practice.description || '');
    setEditPracticeActive(practice.isActive);
  };

  const handleSaveEditPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPractice || !editPracticeName.trim()) return;

    const res = await runAction(
      `practice:edit:${editingPractice.id}`,
      () =>
        adminApi.updatePractice(editingPractice.id, {
          name: editPracticeName.trim(),
          icon: editPracticeIcon.trim() || '🌱',
          category: editPracticeCategory,
          description: editPracticeDesc.trim() || 'วิถีและศาสตร์กสิกรรมธรรมชาติ',
          isActive: editPracticeActive,
        }),
      (msg) => setModalError(msg)
    );
    if (!res) return;

    showPracticeFeedback(
      'success',
      `อัปเดตวิถี/ศาสตร์ "${res.practice.name}" เรียบร้อยแล้ว${res.updatedFarmCount > 0 ? ` (ซิงค์ชื่อไปยังแปลงทั้งหมด ${res.updatedFarmCount} แปลง)` : ''}`
    );
    setEditingPractice(null);
  };

  const handleOpenDeletePractice = (practice: FarmPracticeTag) => {
    if (isPasscodeSession) {
      showPracticeFeedback('error', LINE_ONLY_HINT);
      return;
    }
    setDeletingPractice(practice);
    const others = practices.filter((p) => p.id !== practice.id);
    if (others.length > 0) {
      const sameCat = others.find((p) => p.category === practice.category);
      setTargetReassignPracticeId(sameCat ? sameCat.id : others[0].id);
    } else {
      setTargetReassignPracticeId('');
    }
  };

  const handleConfirmDeletePractice = async () => {
    if (!deletingPractice) return;
    const targetName = practices.find((p) => p.id === targetReassignPracticeId)?.name || '';

    const res = await runAction(
      `practice:delete:${deletingPractice.id}`,
      () => adminApi.deletePractice(deletingPractice.id, targetReassignPracticeId || undefined),
      (msg) => setModalError(msg)
    );
    if (!res) return;

    showPracticeFeedback(
      'success',
      `ลบวิถี/ศาสตร์ "${res.deletedName}" สำเร็จแล้ว${
        res.reassignedCount > 0
          ? targetName
            ? ` (โยกย้ายข้อมูลใน ${res.reassignedCount} แปลงไปยัง "${targetName}" เรียบร้อย)`
            : ` (นำออกจาก ${res.reassignedCount} แปลงเรียบร้อย)`
          : ''
      }`
    );
    setDeletingPractice(null);
    setTargetReassignPracticeId('');
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-900 text-base">
              วิถีและศาสตร์กสิกรรมธรรมชาติ (Farm Practices & Knowledge)
            </h3>
            <p className="text-xs text-stone-500">
              แอดมินสามารถเพิ่ม แก้ไขชื่อ/ไอคอน เปิด-ปิดการเลือก หรือลบพร้อมโยกย้ายข้อมูลในแปลงของสมาชิกทั้งหมดได้อย่างปลอดภัย
            </p>
          </div>
          <button
            onClick={() => setShowAddPractice(!showAddPractice)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มวิถี/ศาสตร์</span>
          </button>
        </div>

        {/* Feedback Toast */}
        {practiceFeedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border ${
              practiceFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {practiceFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{practiceFeedback.text}</span>
          </div>
        )}

        {/* Search & Category Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={practiceSearch}
                onChange={(e) => setPracticeSearch(e.target.value)}
                placeholder="ค้นหาวิถีหรือศาสตร์ เช่น โคก หนอง นา, ไบโอชาร์, น้ำหมัก, เมล็ดพันธุ์..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 text-xs font-medium">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'water', label: '💧 บริหารจัดการน้ำ' },
              { id: 'soil', label: '🪵 ดินและอินทรีย์' },
              { id: 'forest', label: '🌳 ป่า 3 อย่าง ประโยชน์ 4 อย่าง' },
              { id: 'biodiversity', label: '🌾 เมล็ดพันธุ์/พันธุกรรม' },
              { id: 'energy', label: '🔥 พลังงาน/ไบโอชาร์' },
              { id: 'animal', label: '🐔 เลี้ยงสัตว์อารมณ์ดี' },
              { id: 'other', label: '🌱 วิถีกสิกรรมทั่วไป' },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setPracticeCatFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  practiceCatFilter === pill.id
                    ? 'bg-brand-600 text-white font-bold shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add Practice Form */}
        {showAddPractice && (
          <form onSubmit={handleAddPractice} className="p-5 rounded-3xl bg-brand-50/70 border border-brand-200 space-y-3 animate-in fade-in slide-in-from-top-2">
            <h4 className="font-bold text-brand-900 text-sm">เพิ่มวิถีและศาสตร์กสิกรรมธรรมชาติใหม่</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="ชื่อ เช่น น้ำหมักเจ็ดรส, เตาเผาไบโอชาร์..."
                value={newPracticeName}
                onChange={(e) => setNewPracticeName(e.target.value)}
                className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
              />
              <input
                type="text"
                placeholder="ไอคอน เช่น 🌱, 🔥, 💧, 🪵"
                value={newPracticeIcon}
                onChange={(e) => setNewPracticeIcon(e.target.value)}
                className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
              />
              <select
                value={newPracticeCategory}
                onChange={(e) => setNewPracticeCategory(e.target.value as any)}
                className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white font-medium"
              >
                <option value="water">💧 บริหารจัดการน้ำ</option>
                <option value="soil">🪵 ดินและอินทรีย์วัตถุ</option>
                <option value="forest">🌳 ป่า 3 อย่าง ประโยชน์ 4 อย่าง</option>
                <option value="biodiversity">🌾 อนุรักษ์พันธุกรรมพื้นบ้าน</option>
                <option value="energy">🔥 พลังงานทดแทนและไบโอชาร์</option>
                <option value="animal">🐔 การเลี้ยงสัตว์อารมณ์ดี</option>
                <option value="other">🌱 วิถีกสิกรรมทั่วไป</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="คำอธิบายรายละเอียดหรือองค์ความรู้..."
              value={newPracticeDesc}
              onChange={(e) => setNewPracticeDesc(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddPractice(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                    disabled={busyKey !== null}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
              >
                บันทึกวิถี/ศาสตร์
              </button>
            </div>
          </form>
        )}

        {/* Practices Grid */}
        {(() => {
          const filteredPractices = practices.filter((p) => {
            if (practiceCatFilter !== 'all' && p.category !== practiceCatFilter) return false;
            if (practiceSearch.trim()) {
              const q = practiceSearch.toLowerCase();
              return p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
            }
            return true;
          });

          if (filteredPractices.length === 0) {
            return (
              <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
                ไม่พบวิถีหรือศาสตร์ที่ตรงกับเงื่อนไขการค้นหา
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPractices.map((practice) => {
                const farmCount = dataService.getFarmCountByPractice(practice.name);
                return (
                  <div
                    key={practice.id}
                    className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between gap-3 hover:border-brand-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-3xl p-2 bg-stone-50 rounded-xl shrink-0 border border-stone-100">
                          {practice.icon}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-sm truncate" title={practice.name}>
                            {practice.name}
                          </h4>
                          <p className="text-[11px] text-stone-500 font-medium">
                            {practice.categoryName || dataService.getPracticeCategoryName(practice.category)}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          practice.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {practice.isActive ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}
                      </span>
                    </div>

                    {practice.description && (
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {practice.description}
                      </p>
                    )}

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-lg text-[11px]">
                        📌 มี {farmCount} แปลงทำวิถีนี้
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTogglePractice(practice.id)}
                          title={practice.isActive ? 'คลิกเพื่อปิดชั่วคราว' : 'คลิกเพื่อเปิดใช้งาน'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            practice.isActive
                              ? 'text-stone-500 hover:text-amber-600 border-stone-200 hover:bg-amber-50'
                              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {practice.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleOpenEditPractice(practice)}
                          title="แก้ไขวิถี/ศาสตร์"
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenDeletePractice(practice)}
                          disabled={isPasscodeSession}
                          title={isPasscodeSession ? LINE_ONLY_HINT : 'ลบวิถี/ศาสตร์'}
                          className="disabled:opacity-40 disabled:cursor-not-allowed p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Edit Practice Modal */}
        {editingPractice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in">
              {modalError && <ModalError message={modalError} />}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-brand-600" />
                  <span>แก้ไขวิถี/ศาสตร์: {editingPractice.name}</span>
                </h3>
                <button
                  onClick={() => setEditingPractice(null)}
                  className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditPractice} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ชื่อวิถี/ศาสตร์ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editPracticeName}
                    onChange={(e) => setEditPracticeName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    💡 เมื่อแก้ไขชื่อ ระบบจะอัปเดตชื่อในทุกแปลงที่ใช้วิถีนี้ให้อัตโนมัติ
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      ไอคอน Emoji
                    </label>
                    <input
                      type="text"
                      value={editPracticeIcon}
                      onChange={(e) => setEditPracticeIcon(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      กลุ่มศาสตร์
                    </label>
                    <select
                      value={editPracticeCategory}
                      onChange={(e) => setEditPracticeCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      <option value="water">💧 บริหารจัดการน้ำ</option>
                      <option value="soil">🪵 ดินและอินทรีย์วัตถุ</option>
                      <option value="forest">🌳 ป่า 3 อย่าง ประโยชน์ 4 อย่าง</option>
                      <option value="biodiversity">🌾 อนุรักษ์พันธุกรรมพื้นบ้าน</option>
                      <option value="energy">🔥 พลังงานทดแทนและไบโอชาร์</option>
                      <option value="animal">🐔 การเลี้ยงสัตว์อารมณ์ดี</option>
                      <option value="other">🌱 วิถีกสิกรรมทั่วไป</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    คำอธิบายองค์ความรู้
                  </label>
                  <textarea
                    rows={2}
                    value={editPracticeDesc}
                    onChange={(e) => setEditPracticeDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="editPracticeActive"
                    checked={editPracticeActive}
                    onChange={(e) => setEditPracticeActive(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-stone-300"
                  />
                  <label htmlFor="editPracticeActive" className="text-xs font-bold text-stone-700 cursor-pointer">
                    เปิดให้สมาชิกเลือกวิถี/ศาสตร์นี้ในหน้าลงทะเบียนและแก้ไขแปลง
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setEditingPractice(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={busyKey !== null}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
                  >
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete & Reassign Practice Modal */}
        {deletingPractice && (() => {
          const farmCount = dataService.getFarmCountByPractice(deletingPractice.name);
          const otherPractices = practices.filter((p) => p.id !== deletingPractice.id);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 space-y-4 border border-stone-200 shadow-2xl animate-in fade-in">
                {modalError && <ModalError message={modalError} />}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-bold text-rose-900 text-base flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                    <span>ยืนยันการลบวิถี/ศาสตร์ "{deletingPractice.name}"</span>
                  </h3>
                  <button
                    onClick={() => setDeletingPractice(null)}
                    className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {farmCount === 0 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-stone-600 leading-relaxed">
                      ขณะนี้ไม่มีแปลงเกษตรกรที่ใช้วิถีหรือศาสตร์นี้ คุณสามารถลบออกจากระบบได้ทันทีโดยไม่กระทบต่อข้อมูลแปลงใดๆ
                    </p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setDeletingPractice(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeletePractice}
                        disabled={busyKey !== null}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
                      >
                        ยืนยันลบ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>พบแปลงของสมาชิกจำนวน {farmCount} แปลง ที่กำลังใช้วิถีนี้อยู่</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        ท่านสามารถเลือกวิถี/ศาสตร์ทดแทนเพื่อโยกย้ายข้อมูลในแปลงเหล่านั้น หรือเลือกลบออกจากแปลงโดยไม่แทนที่:
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        เลือกวิถี/ศาสตร์ปลายทางสำหรับโยกย้าย
                      </label>
                      <select
                        value={targetReassignPracticeId}
                        onChange={(e) => setTargetReassignPracticeId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      >
                        <option value="">-- ไม่ต้องแทนที่ (นำป้ายนี้ออกจากแปลงทั้งหมด) --</option>
                        {otherPractices.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.icon} {p.name} ({p.categoryName || dataService.getPracticeCategoryName(p.category)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setDeletingPractice(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeletePractice}
                        disabled={busyKey !== null}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>
                          {targetReassignPracticeId ? `โยกย้ายแปลง (${farmCount} แปลง) และลบ` : `ลบออกจาก ${farmCount} แปลง`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
