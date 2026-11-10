'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Layers,
  HelpCircle,
  History,
  Plus,
  Clock,
  UserCog,
  Calendar,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  Filter,
  RefreshCw,
  XCircle,
  Sprout,
  LogIn,
  Activity,
} from 'lucide-react';
import { useAdminData } from '@/app/admin/_components/AdminDataContext';

/** /admin/logs — ประวัติการทำงาน (Audit Log) */
export default function AdminLogsPage() {
  const {
    auditLogs,
    isSyncing,
    refreshFromServer,
  } = useAdminData();
  const handleRefreshFirestore = () => refreshFromServer();

  // Logs Tab Filter State
  const [logsFilter, setLogsFilter] = useState<'all' | 'member' | 'admin'>('all');
  const [logsSearch, setLogsSearch] = useState('');

  return (
    <>
      <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                บันทึกประวัติและกิจกรรม (Audit & Activities Logs)
              </h3>
              <p className="text-xs text-stone-500">
                ตรวจสอบการทำงานของแอดมิน และกิจกรรมของสมาชิกเครือข่ายทั้งหมดแบบ Real-time
              </p>
            </div>
          </div>

          <button
            onClick={handleRefreshFirestore}
            disabled={isSyncing}
            className="px-3.5 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-600' : ''}`} />
            <span>ดึงข้อมูลล่าสุด</span>
          </button>
        </div>

        {/* Search & Filter Pills */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              placeholder="ค้นหากิจกรรม, ชื่อสมาชิก, ชื่อแปลง หรือข้อความ..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Filter Pills */}
          {(() => {
            const memberActions = [
              'member_login',
              'create_farm',
              'update_farm',
              'create_product',
              'update_product',
              'delete_product',
            ];
            const memberCount = auditLogs.filter((l) => memberActions.includes(l.action)).length;
            const adminCount = auditLogs.filter((l) => !memberActions.includes(l.action)).length;

            return (
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <button
                  onClick={() => setLogsFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    logsFilter === 'all'
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  ทั้งหมด ({auditLogs.length})
                </button>
                <button
                  onClick={() => setLogsFilter('member')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    logsFilter === 'member'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>กิจกรรมสมาชิก ({memberCount})</span>
                </button>
                <button
                  onClick={() => setLogsFilter('admin')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    logsFilter === 'admin'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>การทำงานของแอดมิน ({adminCount})</span>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Logs List */}
        {(() => {
          const memberActions = [
            'member_login',
            'create_farm',
            'update_farm',
            'create_product',
            'update_product',
            'delete_product',
          ];

          const filteredLogs = auditLogs.filter((log) => {
            const isMember = memberActions.includes(log.action);
            if (logsFilter === 'member' && !isMember) return false;
            if (logsFilter === 'admin' && isMember) return false;

            if (logsSearch.trim()) {
              const q = logsSearch.toLowerCase();
              return (
                log.action.toLowerCase().includes(q) ||
                log.details.toLowerCase().includes(q) ||
                log.performedByAdminName.toLowerCase().includes(q) ||
                log.targetMemberName.toLowerCase().includes(q) ||
                log.targetFarmName.toLowerCase().includes(q)
              );
            }
            return true;
          });

          if (filteredLogs.length === 0) {
            return (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-400 text-xs">
                ไม่พบรายการกิจกรรมตามเงื่อนไขที่เลือก
              </div>
            );
          }

          const getActionBadge = (action: string) => {
            switch (action) {
              case 'member_login':
                return { label: 'เข้าสู่ระบบ', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: LogIn };
              case 'create_farm':
                return { label: 'สร้างแปลงใหม่', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Sprout };
              case 'update_farm':
                return { label: 'อัปเดตแปลง', bg: 'bg-teal-100 text-teal-800 border-teal-200', icon: Edit3 };
              case 'create_product':
                return { label: 'เพิ่มผลผลิต', bg: 'bg-green-100 text-green-800 border-green-200', icon: Plus };
              case 'update_product':
                return { label: 'แก้ไขผลผลิต', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: Edit3 };
              case 'delete_product':
                return { label: 'ลบผลผลิต', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: Trash2 };
              case 'approve_member':
                return { label: 'อนุมัติสมาชิก', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
              case 'reject_member':
                return { label: 'ไม่อนุมัติสมาชิก', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle };
              case 'delete_member':
                return { label: 'ลบสมาชิกถาวร', bg: 'bg-rose-200 text-rose-900 border-rose-300', icon: Trash2 };
              case 'assign_admin':
              case 'revoke_admin':
                return { label: 'จัดการสิทธิ์แอดมิน', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: UserCog };
              case 'create_practice':
              case 'update_practice':
              case 'delete_practice':
                return { label: 'จัดการวิถี/ศาสตร์', bg: 'bg-lime-100 text-lime-800 border-lime-200', icon: Sprout };
              case 'create_category':
              case 'update_category':
              case 'delete_category':
              case 'create_sku':
              case 'update_sku':
              case 'toggle_sku':
              case 'delete_sku':
                return { label: 'จัดการหมวดหมู่ SKU', bg: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: Layers };
              case 'create_news':
              case 'update_news':
              case 'delete_news':
                return { label: 'กิจกรรมเครือข่าย', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Calendar };
              case 'assist_create_product':
                return { label: 'แอดมินช่วยลงผลผลิต', bg: 'bg-orange-100 text-orange-800 border-orange-200', icon: HelpCircle };
              case 'admin_update_product':
                return { label: 'แอดมินแก้ไขผลผลิต', bg: 'bg-orange-50 text-orange-800 border-orange-200', icon: Edit3 };
              case 'admin_delete_product':
                return { label: 'แอดมินลบผลผลิต', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: Trash2 };
              default:
                return { label: action, bg: 'bg-stone-100 text-stone-700 border-stone-200', icon: Clock };
            }
          };

          return (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.action);
                const Icon = badge.icon;
                const isMember = memberActions.includes(log.action);

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-stone-50 hover:bg-stone-50/80 border border-stone-200 transition-colors space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {isMember ? 'กิจกรรมสมาชิก' : 'ระบบแอดมิน'}
                        </span>
                      </div>

                      <span className="flex items-center gap-1 text-[11px] text-stone-500">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-stone-900 leading-snug">
                      {log.details}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 pt-0.5">
                      <span>
                        ผู้ดำเนินการ: <b className="text-stone-700">{log.performedByAdminName}</b>
                      </span>
                      {log.targetMemberName && log.targetMemberName !== '-' && (
                        <span>
                          สมาชิก: <b className="text-stone-700">{log.targetMemberName}</b>
                        </span>
                      )}
                      {log.targetFarmName && log.targetFarmName !== '-' && (
                        <span>
                          แปลง: <b className="text-stone-700">{log.targetFarmName}</b>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </>
  );
}
