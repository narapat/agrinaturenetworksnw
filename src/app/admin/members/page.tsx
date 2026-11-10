'use client';

import React from 'react';
import { dataService } from '@/services/dataService';
import { adminApi } from '@/services/adminApi';
import {
  Check,
  GraduationCap,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { DEFAULT_AVATAR } from '@/app/admin/_components/defaultAvatar';
import { useAdminData } from '@/app/admin/_components/AdminDataContext';

/** /admin/members — ตรวจและอนุมัติใบสมัครสมาชิกใหม่ */
export default function AdminPendingMembersPage() {
  const {
    pendingMembers,
    isSyncing,
    lastSyncTime,
    runAction,
    busyKey,
    refreshFromServer,
  } = useAdminData();
  const handleRefreshFirestore = () => refreshFromServer();

  const handleApprove = async (memberId: string) => {
    await runAction(`approve:${memberId}`, () => adminApi.approveMember(memberId));
  };

  const handleReject = async (memberId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการ "ไม่อนุมัติ" สมาชิกท่านนี้? (ข้อมูลจะถูกย้ายไปที่แท็บ "ไม่อนุมัติ / คัดกรองออก")')) {
      return;
    }
    await runAction(`reject:${memberId}`, () => adminApi.rejectMember(memberId));
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div>
            <p className="text-sm font-bold text-stone-900">
              คัดกรองสมาชิกด้วยรูปหน้าจริง เพื่อยืนยันว่าเป็นสมาชิกเครือข่ายตัวจริง
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              ซิงค์สดกับ Cloud Firestore • ดึงข้อมูลล่าสุด: <span className="font-semibold text-emerald-700">{lastSyncTime || dataService.getLastSyncTime()}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshFirestore}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'กำลังดึงข้อมูลจาก Cloud...' : '🔄 รีเฟรชข้อมูลจาก Cloud'}</span>
          </button>
        </div>

        {pendingMembers.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <p className="text-base font-bold text-stone-700">ไม่มีสมาชิกรอการอนุมัติในขณะนี้</p>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              หากมีสมาชิกแจ้งว่าเพิ่งลงทะเบียนผ่านมือถือหรือคอมพิวเตอร์ กรุณากดปุ่มรีเฟรชด้านล่างเพื่อดึงข้อมูลสดจาก Cloud Firestore ได้ทันทีครับ
            </p>
            <button
              type="button"
              onClick={handleRefreshFirestore}
              disabled={isSyncing}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>กดดึงข้อมูลล่าสุดจาก Cloud Firestore อีกครั้ง</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingMembers.map((member) => {
              const farm = dataService.getFarmById(member.farmId) || dataService.getFarmByMemberId(member.id);
              const displayPhone = member.phone || farm?.phone || '';
              const displayLineId = member.lineId || farm?.lineId || '';
              return (
                <div
                  key={member.id}
                  className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={member.facePhotoUrl || (farm?.photos && farm.photos[0]) || DEFAULT_AVATAR}
                        alt={member.fullName}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-200 shrink-0 shadow-xs"
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
                        <p className="text-xs text-brand-700 font-bold mt-0.5">
                          📍 อ.{farm?.district || 'นครสวรรค์'} {farm?.subdistrict ? `(ต.${farm.subdistrict})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(member.id)}
                        disabled={busyKey !== null}
                        className="disabled:opacity-50 disabled:cursor-wait px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="ไม่อนุมัติและย้ายไปแท็บไม่อนุมัติ"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">ไม่อนุมัติ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(member.id)}
                        disabled={busyKey !== null}
                        className="disabled:opacity-50 disabled:cursor-wait px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-brand-600/20 transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{busyKey === `approve:${member.id}` ? 'กำลังบันทึก…' : 'อนุมัติสมาชิก'}</span>
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
                      <span>📞 {displayPhone || 'ไม่ได้ระบุ'}</span>
                      {displayLineId && <span>LINE: {displayLineId}</span>}
                    </div>
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
