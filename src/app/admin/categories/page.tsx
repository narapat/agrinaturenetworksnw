'use client';

import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import { adminApi } from '@/services/adminApi';
import type { CategoryTag, ProductCategory } from '@/types';
import {
  Plus,
  X,
  AlertCircle,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { ModalError } from '@/app/admin/_components/ModalError';
import { useAdminData, LINE_ONLY_HINT } from '@/app/admin/_components/AdminDataContext';

/** /admin/categories — จัดการชนิดผลผลิตมาตรฐาน (SKU) */
export default function AdminCategoriesPage() {
  const {
    categories,
    isPasscodeSession,
    runAction,
    busyKey,
  } = useAdminData();

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🌾');
  const [newCatType, setNewCatType] = useState<ProductCategory>('raw');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);

  // Category Edit & Delete State
  const [editingCat, setEditingCat] = useState<CategoryTag | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('🌾');
  const [editCatType, setEditCatType] = useState<ProductCategory>('raw');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatActive, setEditCatActive] = useState(true);

  const [deletingCat, setDeletingCat] = useState<CategoryTag | null>(null);
  // ข้อผิดพลาดที่ต้องแสดงในกล่อง modal (แถบแจ้งเตือนของหน้าถูกฉากมืดบัง)
  const [modalError, setModalError] = useState<string | null>(null);
  useEffect(() => setModalError(null), [editingCat, deletingCat]);
  const [targetReassignCatId, setTargetReassignCatId] = useState<string>('');
  const [catSearch, setCatSearch] = useState('');
  const [catGroupFilter, setCatGroupFilter] = useState<string>('all');
  const [catFeedback, setCatFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showCatFeedback = (type: 'success' | 'error', text: string, ms = 4500) => {
    setCatFeedback({ type, text });
    setTimeout(() => setCatFeedback(null), ms);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const ok = await runAction(
      'cat:add',
      () =>
        adminApi.addCategory({
          name: newCatName.trim(),
          icon: newCatIcon || '🌿',
          category: newCatType,
          description: newCatDesc.trim() || 'หมวดหมู่ผลผลิตที่กำหนดโดยแอดมินเครือข่าย',
        }),
      (msg) => showCatFeedback('error', msg)
    );
    if (!ok) return;

    setNewCatName('');
    setNewCatDesc('');
    setShowAddCat(false);
  };

  const handleToggleCat = async (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const pInfo = dataService.getProductCountBySku(catId);

    const ok = await runAction(
      `cat:toggle:${catId}`,
      () => adminApi.updateCategory(catId, { isActive: !cat.isActive }),
      (msg) => showCatFeedback('error', msg)
    );
    if (!ok) return;

    showCatFeedback(
      'success',
      cat.isActive
        ? `ปิดรับสินค้าใหม่สำหรับ "${cat.name}" แล้ว${pInfo.count > 0 ? ` (สินค้าเดิม ${pInfo.count} รายการยังคงแสดงในตลาดตามปกติ)` : ''}`
        : `เปิดรับการลงสินค้าสำหรับ "${cat.name}" เรียบร้อยแล้ว`
    );
  };

  const handleOpenEditCat = (cat: CategoryTag) => {
    setEditingCat(cat);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || '🌾');
    setEditCatType(cat.category);
    setEditCatDesc(cat.description || '');
    setEditCatActive(cat.isActive);
  };

  const handleSaveEditCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editCatName.trim()) return;

    const res = await runAction(
      `cat:edit:${editingCat.id}`,
      () =>
        adminApi.updateCategory(editingCat.id, {
          name: editCatName.trim(),
          icon: editCatIcon.trim() || '🌾',
          category: editCatType,
          description: editCatDesc.trim() || 'หมวดหมู่ผลผลิตที่กำหนดโดยแอดมินเครือข่าย',
          isActive: editCatActive,
        }),
      (msg) => setModalError(msg)
    );
    if (!res) return;

    showCatFeedback(
      'success',
      `อัปเดตชนิดผลผลิต "${res.category.name}" สำเร็จแล้ว${res.updatedProductCount > 0 ? ` (ซิงค์ชื่อและหมวดไปยังผลผลิต ${res.updatedProductCount} รายการเรียบร้อยแล้ว)` : ''}`
    );
    setEditingCat(null);
  };

  const handleOpenDeleteCat = (cat: CategoryTag) => {
    if (isPasscodeSession) {
      showCatFeedback('error', LINE_ONLY_HINT);
      return;
    }
    setDeletingCat(cat);
    // Find first other available category as default target
    const others = categories.filter((c) => c.id !== cat.id);
    if (others.length > 0) {
      // Prefer category of same type if available
      const sameType = others.find((c) => c.category === cat.category);
      setTargetReassignCatId(sameType ? sameType.id : others[0].id);
    } else {
      setTargetReassignCatId('');
    }
  };

  const handleConfirmDeleteCat = async () => {
    if (!deletingCat) return;
    const pInfo = dataService.getProductCountBySku(deletingCat.id);

    if (pInfo.count > 0 && !targetReassignCatId) {
      showCatFeedback('error', 'กรุณาเลือกหมวดหมู่ปลายทางสำหรับโยกย้ายผลผลิตก่อนทำการลบ');
      return;
    }

    const targetName = categories.find((c) => c.id === targetReassignCatId)?.name || '';
    const res = await runAction(
      `cat:delete:${deletingCat.id}`,
      () => adminApi.deleteCategory(deletingCat.id, pInfo.count > 0 ? targetReassignCatId : undefined),
      (msg) => setModalError(msg)
    );
    if (!res) return;

    showCatFeedback(
      'success',
      res.reassignedCount > 0
        ? `ลบหมวดหมู่ "${res.deletedName}" และโยกย้ายผลผลิต ${res.reassignedCount} รายการไปยัง "${targetName}" สำเร็จแล้ว!`
        : `ลบหมวดหมู่ "${res.deletedName}" สำเร็จแล้ว (ไม่มีผลผลิตตกค้าง)`,
      5000
    );
    setDeletingCat(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-900 text-base">
              หมวดหมู่และชนิดผลผลิตกลางของเครือข่าย (Standard SKU Tags)
            </h3>
            <p className="text-xs text-stone-500">
              แอดมินสามารถกำหนด แก้ไขชื่อ/ย้ายกลุ่ม หรือลบพร้อมโยกย้ายผลผลิตไปยังหมวดอื่นได้อย่างปลอดภัย
            </p>
          </div>
          <button
            onClick={() => setShowAddCat(!showAddCat)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มชนิดผลผลิต</span>
          </button>
        </div>

        {/* Feedback Toast */}
        {catFeedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border ${
              catFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {catFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{catFeedback.text}</span>
          </div>
        )}

        {/* Search & Group Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-stone-200 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="ค้นหาชนิดผลผลิต เช่น กล้วย, ไบโอชาร์, น้ำหมัก..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Macro Group Filter Pills */}
          <div className="flex flex-wrap gap-1.5 text-xs font-medium">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'raw', label: '🌾 ผลผลิตสด' },
              { id: 'processed', label: '🍯 แปรรูป' },
              { id: 'byproduct', label: '🪵 ปัจจัยการผลิต' },
              { id: 'seed', label: '🌱 เมล็ดพันธุ์' },
              { id: 'tool', label: '🛠️ อุปกรณ์' },
              { id: 'smartfarm', label: '📡 สมาร์ทฟาร์ม' },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setCatGroupFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  catGroupFilter === pill.id
                    ? 'bg-brand-600 text-white font-bold shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add Category Form */}
        {showAddCat && (
          <form onSubmit={handleAddCategory} className="p-5 rounded-3xl bg-brand-50/70 border border-brand-200 space-y-3 animate-in fade-in slide-in-from-top-2">
            <h4 className="font-bold text-brand-900 text-sm">เพิ่มชนิดผลผลิต / Standard SKU ใหม่</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="ชื่อ เช่น น้ำหมักรสจืด, กล้วยหอมทอง"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
              />
              <input
                type="text"
                placeholder="ไอคอน เช่น 🍯, 🌿, 🌾"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
              />
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as any)}
                className="p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white font-medium"
              >
                <option value="raw">🌾 ผลผลิตสด</option>
                <option value="processed">🍯 แปรรูป</option>
                <option value="byproduct">🪵 ปัจจัยการผลิต / By-product</option>
                <option value="seed">🌱 เมล็ดพันธุ์/กิ่งพันธุ์</option>
                <option value="tool">🛠️ อุปกรณ์ / เครื่องมือ</option>
                <option value="smartfarm">📡 สมาร์ทฟาร์ม / Smart Farm</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="คำอธิบายสั้นๆ..."
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCat(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                    disabled={busyKey !== null}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
              >
                บันทึกชนิดผลผลิต
              </button>
            </div>
          </form>
        )}

        {/* Categories Grid */}
        {(() => {
          const filteredCategories = categories.filter((cat) => {
            if (catGroupFilter !== 'all' && cat.category !== catGroupFilter) return false;
            if (catSearch.trim()) {
              const q = catSearch.toLowerCase();
              return cat.name.toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q);
            }
            return true;
          });

          if (filteredCategories.length === 0) {
            return (
              <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 text-xs">
                ไม่พบชนิดผลผลิตที่ตรงกับเงื่อนไขการค้นหา
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((cat) => {
                const pInfo = dataService.getProductCountBySku(cat.id);
                return (
                  <div
                    key={cat.id}
                    className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between gap-3 hover:border-brand-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-3xl p-2 bg-stone-50 rounded-xl shrink-0 border border-stone-100">
                          {cat.icon}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-sm truncate" title={cat.name}>
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

                      {/* Status Toggle Button */}
                      <button
                        onClick={() => handleToggleCat(cat.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors shrink-0 ${
                          cat.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                        }`}
                        title={cat.isActive ? 'คลิกเพื่อปิดรับสินค้าใหม่' : 'คลิกเพื่อเปิดใช้งาน'}
                      >
                        {cat.isActive ? 'เปิดใช้' : 'ปิดรับใหม่'}
                      </button>
                    </div>

                    {/* Attached Products Count & Actions Bar */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                      <div>
                        {pInfo.count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-100">
                            🌾 {pInfo.count} รายการ ({pInfo.farmCount} แปลง)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 bg-stone-50 px-2 py-0.5 rounded-lg">
                            ยังไม่มีผลผลิตผูก
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditCat(cat)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-brand-700 hover:bg-brand-50 border border-stone-200 bg-white transition-colors"
                          title="แก้ไขชนิดผลผลิตนี้"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteCat(cat)}
                          disabled={isPasscodeSession}
                          className="disabled:opacity-40 disabled:cursor-not-allowed p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 bg-white transition-colors"
                          title={isPasscodeSession ? LINE_ONLY_HINT : 'ลบชนิดผลผลิตนี้'}
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

        {/* Edit SKU Modal */}
        {editingCat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
              {modalError && <ModalError message={modalError} />}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl p-1.5 bg-brand-50 rounded-xl">{editCatIcon}</span>
                  <div>
                    <h4 className="font-bold text-stone-900 text-base">แก้ไขชนิดผลผลิต (Standard SKU)</h4>
                    <p className="text-[11px] text-stone-400 font-mono">ID: {editingCat.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingCat(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditCat} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ชื่อชนิดผลผลิต <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    placeholder="เช่น กล้วยน้ำว้า & กล้วยแปรรูป"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      ไอคอน Emoji
                    </label>
                    <input
                      type="text"
                      value={editCatIcon}
                      onChange={(e) => setEditCatIcon(e.target.value)}
                      placeholder="เช่น 🍌, 🪵, 🛠️"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      หมวดหมู่หลัก (Macro Group)
                    </label>
                    <select
                      value={editCatType}
                      onChange={(e) => setEditCatType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="raw">🌾 ผลผลิตสด</option>
                      <option value="processed">🍯 แปรรูป</option>
                      <option value="byproduct">🪵 ปัจจัยการผลิต / By-product</option>
                      <option value="seed">🌱 เมล็ดพันธุ์/กิ่งพันธุ์</option>
                      <option value="tool">🛠️ อุปกรณ์ / เครื่องมือ</option>
                      <option value="smartfarm">📡 สมาร์ทฟาร์ม / Smart Farm</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    คำอธิบายหมวดหมู่
                  </label>
                  <input
                    type="text"
                    value={editCatDesc}
                    onChange={(e) => setEditCatDesc(e.target.value)}
                    placeholder="คำอธิบายสั้นๆ สำหรับผู้ซื้อหรือสมาชิก..."
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <input
                    type="checkbox"
                    id="editCatActive"
                    checked={editCatActive}
                    onChange={(e) => setEditCatActive(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <label htmlFor="editCatActive" className="text-xs font-bold text-stone-700 cursor-pointer">
                    เปิดใช้งาน (ให้สมาชิกใหม่เลือกจับคู่ตอนลงสินค้าได้)
                  </label>
                </div>

                {/* Cascade Sync Info Alert */}
                {(() => {
                  const pInfo = dataService.getProductCountBySku(editingCat.id);
                  if (pInfo.count === 0) return null;
                  return (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">ระบบ Cascade Auto-Sync ทำงานอัตโนมัติ:</p>
                        <p>
                          ปัจจุบันมีผลผลิตของเกษตรกรผูกอยู่ <b>{pInfo.count} รายการ (จาก {pInfo.farmCount} แปลง)</b> การเปลี่ยนชื่อหรือกลุ่มหลักจะถูกซิงค์ไปยังผลผลิตเหล่านั้นทันที เพื่อให้ข้อมูลตลาดตรงกัน 100%
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setEditingCat(null)}
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

        {/* Delete & Reassign Modal */}
        {deletingCat && (() => {
          const pInfo = dataService.getProductCountBySku(deletingCat.id);
          const otherCategories = categories.filter((c) => c.id !== deletingCat.id);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
                {modalError && <ModalError message={modalError} />}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-base">
                        {pInfo.count > 0 ? 'ลบและโยกย้ายผลผลิต (Reassign / Merge)' : 'ยืนยันการลบชนิดผลผลิต'}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {deletingCat.icon} {deletingCat.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeletingCat(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {pInfo.count === 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-stone-600 leading-relaxed">
                      ชนิดผลผลิต <b>"{deletingCat.name}"</b> ไม่มีผลผลิตใดๆ ของสมาชิกผูกอยู่ สามารถลบออกจากระบบและ Cloud Firestore ได้ทันที
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeletingCat(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeleteCat}
                        disabled={busyKey !== null}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
                      >
                        ยืนยันลบหมวดหมู่นี้
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Safety Alert */}
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>พบผลผลิตของสมาชิกจำนวน {pInfo.count} รายการ (จาก {pInfo.farmCount} แปลง)</span>
                      </div>
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        เพื่อความปลอดภัยและไม่ให้ผลผลิตของพี่น้องเกษตรกรสูญหายหรือตกหล่นในตลาด กรุณาเลือก <b>SKU ปลายทาง</b> ที่ต้องการโยกย้ายผลผลิตทั้งหมดไปรวม:
                      </p>
                    </div>

                    {/* Target SKU Selector */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        เลือกหมวดหมู่ปลายทางสำหรับย้ายผลผลิต <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={targetReassignCatId}
                        onChange={(e) => setTargetReassignCatId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      >
                        {otherCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} {c.name} ({dataService.getCategoryName(c.category)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setDeletingCat(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeleteCat}
                        disabled={busyKey !== null}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>โยกย้ายผลผลิต ({pInfo.count} ชิ้น) และลบหมวดนี้</span>
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
