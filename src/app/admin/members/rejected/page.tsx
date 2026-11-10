'use client';

import React from 'react';
import { dataService } from '@/services/dataService';
import { adminApi } from '@/services/adminApi';
import {
  Check,
  Trash2,
  RefreshCw,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { DEFAULT_AVATAR } from '@/app/admin/_components/defaultAvatar';
import { useAdminData, LINE_ONLY_HINT } from '@/app/admin/_components/AdminDataContext';

/** /admin/members/rejected — สมาชิกที่ไม่อนุมัติ: เปลี่ยนเป็นอนุมัติ หรือลบถาวร (LINE เท่านั้น) */
export default function AdminRejectedMembersPage() {
  const {
    rejectedMembers,
    isPasscodeSession,
    isSyncing,
    runAction,
    busyKey,
    setActionError,
    refreshFromServer,
  } = useAdminData();
  const handleRefreshFirestore = () => refreshFromServer();

  const handleApprove = async (memberId: string) => {
    await runAction(`approve:${memberId}`, () => adminApi.approveMember(memberId));
  };


  const handlePermanentDelete = async (memberId: string, memberName: string) => {
    if (isPasscodeSession) {
      setActionError(LINE_ONLY_HINT);
      return;
    }
    if (!confirm(`⚠️ ยืนยันการ "ลบข้อมูลถาวร" ของ "${memberName}" หรือไม่?\n\nข้อมูลสมาชิก แปลง ผลผลิต และข้อมูลส่วนตัวทั้งหมดจะถูกลบออกจาก Cloud Firestore อย่างถาวร ไม่สามารถกู้คืนได้!`)) {
      return;
    }
    await runAction(`delete:${memberId}`, () => adminApi.deleteMember(memberId));
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>รายชื่อผู้สมัครที่ไม่อนุมัติ หรือถูกคัดกรองออก</span>
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              สมาชิกในกลุ่มนี้จะไม่สามารถเข้าถึงหน้าแปลงของฉันและสินค้าจะไม่แสดงผลสาธารณะ สามารถเปลี่ยนสถานะเป็นอนุมัติ หรือลบข้อมูลถาวรได้
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshFirestore}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'กำลังดึงข้อมูล...' : '🔄 รีเฟรชข้อมูล'}</span>
          </button>
        </div>

        {rejectedMembers.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <p className="text-base font-bold text-stone-700">ไม่มีสมาชิกที่ถูกปฏิเสธหรือไม่อนุมัติ</p>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              เมื่อท่านกดปุ่ม "ไม่อนุมัติ" ในแท็บอนุมัติสมาชิก รายชื่อจะถูกแยกมาแสดงที่นี่โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rejectedMembers.map((member) => {
              const farm = dataService.getFarmById(member.farmId) || dataService.getFarmByMemberId(member.id);
              const displayPhone = member.phone || farm?.phone || '';
              const displayLineId = member.lineId || farm?.lineId || '';
              return (
                <div
                  key={member.id}
                  className="bg-white p-5 rounded-3xl border border-rose-200/80 shadow-xs space-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                    ไม่อนุมัติ
                  </div>

                  <div className="flex items-start justify-between gap-4 pt-1">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={member.facePhotoUrl || (farm?.photos && farm.photos[0]) || DEFAULT_AVATAR}
                        alt={member.fullName}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-200 shrink-0 opacity-80"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = DEFAULT_AVATAR;
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-stone-900 text-base truncate">
                          {member.fullName}
                        </h4>
                        <p className="text-xs text-stone-600 truncate font-medium">
                          แปลง: {farm?.farmName || 'ยังไม่ระบุ'}
                        </p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          📍 อ.{farm?.district || 'นครสวรรค์'} {farm?.subdistrict ? `(ต.${farm.subdistrict})` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลประวัติการอบรม */}
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-1">
                    <div className="text-stone-700 space-y-0.5">
                      <p>
                        <span className="font-semibold text-stone-500">• หลักสูตร: </span>
                        <span className="font-medium text-stone-900">{member.trainingCourse || 'ไม่ได้ระบุ'}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-stone-500">• ศูนย์: </span>
                        <span className="font-medium text-stone-900">{member.trainingLocation || 'ไม่ได้ระบุ'}</span>
                      </p>
                    </div>
                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500 font-medium">
                      <span>📞 {displayPhone || 'ไม่ได้ระบุ'}</span>
                      {displayLineId && <span>LINE: {displayLineId}</span>}
                    </div>
                  </div>

                  {/* Actions: Approve (Restore) & Permanent Delete */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(member.id, member.fullName)}
                      disabled={busyKey !== null || isPasscodeSession}
                      className="disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-2 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title={isPasscodeSession ? LINE_ONLY_HINT : 'ลบข้อมูลออกจากระบบและ Cloud Firestore ถาวร'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบข้อมูลถาวร</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(member.id)}
                      disabled={busyKey !== null}
                      className="disabled:opacity-50 disabled:cursor-wait px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                      title="เปลี่ยนสถานะเป็นอนุมัติการเป็นสมาชิก"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>เปลี่ยนเป็นอนุมัติสมาชิก</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
