import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * แสดงข้อผิดพลาดภายในกล่อง modal
 * (แถบแจ้งเตือนของหน้าอยู่หลังฉากมืดของ modal ผู้ใช้จะมองไม่เห็นและคิดว่าปุ่มค้าง)
 */
export function ModalError({ message }: { message: string }) {
  return (
    <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
      <span>
        <b>ทำรายการไม่สำเร็จ:</b> {message}
      </span>
    </div>
  );
}
