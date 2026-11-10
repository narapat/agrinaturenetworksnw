'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface DeleteMemberTarget {
  id: string;
  fullName: string;
  farmNames: string[];
  productCount: number;
  isApproved: boolean;
}

/**
 * กล่องยืนยันการลบสมาชิกถาวร
 *
 * ลบแล้วกู้คืนไม่ได้ จึงให้พิมพ์ชื่อสมาชิกให้ตรงก่อนกดลบ (กันกดผิดคน โดยเฉพาะสมาชิกที่อนุมัติแล้วและมีผลผลิตอยู่ในตลาด)
 * และแสดงให้เห็นว่าจะมีอะไรถูกลบไปบ้าง
 */
export function DeleteMemberDialog({
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  target: DeleteMemberTarget;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = typed.trim() === target.fullName.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-member-title"
        className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 border border-stone-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 id="delete-member-title" className="text-lg font-black text-stone-900">
              ลบสมาชิกถาวร
            </h2>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="ปิด" className="text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-stone-700 space-y-2">
          <p>
            จะลบข้อมูลของ <b>{target.fullName}</b> ออกจากระบบทั้งหมด และ <b>กู้คืนไม่ได้</b>:
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-stone-600 text-xs sm:text-sm">
            <li>ข้อมูลสมาชิกและข้อมูลส่วนตัว (เบอร์โทร, LINE, รูปหน้า)</li>
            <li>
              แปลง {target.farmNames.length > 0 ? target.farmNames.map((n) => `"${n}"`).join(', ') : '(ไม่มี)'}{' '}
              พร้อมพิกัดจริง
            </li>
            <li>ผลผลิต {target.productCount} รายการ (หายจากตลาดทันที)</li>
          </ul>
          {target.isApproved && (
            <p className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              สมาชิกท่านนี้ได้รับอนุมัติแล้ว หากต้องการแค่ระงับชั่วคราว ควรใช้ &quot;ไม่อนุมัติ&quot; แทนการลบ
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirm-member-name" className="block text-xs font-bold text-stone-700 mb-1">
            พิมพ์ชื่อ <span className="font-mono bg-stone-100 px-1 rounded">{target.fullName}</span> เพื่อยืนยัน
          </label>
          <input
            id="confirm-member-name"
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="w-full px-3.5 py-3 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold text-sm hover:bg-stone-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches || busy}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>{busy ? 'กำลังลบ…' : 'ลบถาวร'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
