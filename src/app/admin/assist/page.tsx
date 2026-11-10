'use client';

import React, { useState } from 'react';
import { dataService } from '@/services/dataService';
import { adminApi } from '@/services/adminApi';
import type { MemberProfile } from '@/types';
import {
  Plus,
  Check,
  X,
} from 'lucide-react';
import { useAdminData } from '@/app/admin/_components/AdminDataContext';

/** /admin/assist — คิวคำขอให้แอดมินช่วยลงข้อมูลผลผลิตแทนสมาชิก */
export default function AdminAssistPage() {
  const {
    assistQueue,
    categories,
    actorName,
    runAction,
  } = useAdminData();

  // Assisted Entry Modal State
  const [selectedAssistMember, setSelectedAssistMember] = useState<MemberProfile | null>(null);
  const [assistTitle, setAssistTitle] = useState('');
  const [assistPrice, setAssistPrice] = useState('50');
  const [assistCategory, setAssistCategory] = useState('biochar');
  const [assistSuccess, setAssistSuccess] = useState(false);

  const handleAssistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssistMember) return;

    const cat = categories.find((c) => c.id === assistCategory) || categories[0];
    if (!cat) return;

    const ok = await runAction('assist', () =>
      adminApi.assistAddProduct({
        memberId: selectedAssistMember.id,
        skuTagId: cat.id,
        title: assistTitle,
        price: Number(assistPrice) || 0,
        unit: 'กก./ชุด',
        description: `แอดมิน ${actorName} ลงข้อมูลให้ตามคำขอของสมาชิก`,
        images: ['https://images.unsplash.com/photo-1542385151-efd9000785a0?w=800&h=600&fit=crop'],
      })
    );
    if (!ok) return;

    setAssistSuccess(true);
    setTimeout(() => {
      setAssistSuccess(false);
      setSelectedAssistMember(null);
      setAssistTitle('');
    }, 1500);
  };

  return (
    <>
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
    </>
  );
}
