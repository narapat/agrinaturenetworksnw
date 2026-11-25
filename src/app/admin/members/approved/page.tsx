'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Link2, MapPin, Package, RefreshCw, Search, Trash2, UserX, Users, X } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import type { MemberProfile } from '@/types';
import { DEFAULT_AVATAR } from '@/app/admin/_components/defaultAvatar';
import { useAdminData, LINE_ONLY_HINT } from '@/app/admin/_components/AdminDataContext';
import { DeleteMemberDialog, type DeleteMemberTarget } from '@/app/admin/_components/DeleteMemberDialog';
import { summarizeMember, toDeleteTarget } from '@/app/admin/_components/memberSummary';

type SortKey = 'newest' | 'name' | 'district';

/** /admin/members/approved — รายชื่อสมาชิกที่อนุมัติแล้ว: ค้นหา ระงับ (ไม่อนุมัติ) หรือลบถาวร (LINE เท่านั้น) */
export default function AdminApprovedMembersPage() {
  const { allMembers, isPasscodeSession, isSyncing, runAction, busyKey, refreshFromServer } = useAdminData();

  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [deleting, setDeleting] = useState<DeleteMemberTarget | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [linkFor, setLinkFor] = useState<{ member: MemberProfile; url: string; expiresAt: number } | null>(null);
  const [linkBusyId, setLinkBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const rows = useMemo(() => {
    return allMembers
      .filter((m) => m.status === 'approved')
      .map((member) => {
        const { farms, productCount } = summarizeMember(member);
        return { member, farm: farms[0], farmCount: farms.length, productCount };
      });
  }, [allMembers]);

  const districts = useMemo(
    () => Array.from(new Set(rows.map((r) => r.farm?.district).filter((d): d is string => !!d))).sort((a, b) => a.localeCompare(b, 'th')),
    [rows]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(({ member, farm }) => {
      if (district !== 'all' && farm?.district !== district) return false;
      if (!q) return true;
      return [member.fullName, farm?.farmName, farm?.district, farm?.subdistrict]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    return filtered.sort((a, b) => {
      if (sort === 'name') return a.member.fullName.localeCompare(b.member.fullName, 'th');
      if (sort === 'district') return (a.farm?.district || '').localeCompare(b.farm?.district || '', 'th');
      return String(b.member.createdAt || '').localeCompare(String(a.member.createdAt || ''));
    });
  }, [rows, search, district, sort]);

  const handleSuspend = async (member: MemberProfile) => {
    if (!confirm(`ระงับ "${member.fullName}" (เปลี่ยนเป็นไม่อนุมัติ)?\n\nแปลงและผลผลิตจะไม่แสดงต่อสาธารณะ แต่ข้อมูลยังอยู่ และเปลี่ยนกลับเป็นอนุมัติได้ภายหลัง`)) {
      return;
    }
    const ok = await runAction(`reject:${member.id}`, () => adminApi.rejectMember(member.id, 'ระงับโดยแอดมินจากรายชื่อสมาชิก'), (msg) =>
      showFeedback('error', msg)
    );
    if (ok) showFeedback('success', `ระงับ "${member.fullName}" แล้ว (ดูได้ที่แท็บไม่อนุมัติ / คัดออก)`);
  };

  const isUnlinked = (m: MemberProfile) => !m.ownerUid && !m.lineUserId;
  const unlinkedCount = rows.filter((r) => isUnlinked(r.member)).length;

  const createLink = async (member: MemberProfile) => {
    if (isPasscodeSession) {
      showFeedback('error', LINE_ONLY_HINT);
      return;
    }
    setLinkBusyId(member.id);
    try {
      const { token, expiresAt } = await adminApi.createLinkCode(member.id);
      setCopied(false);
      setLinkFor({ member, url: `${window.location.origin}/member/link?t=${token}`, expiresAt });
    } catch (e: any) {
      showFeedback('error', e?.message || 'สร้างลิงก์ไม่สำเร็จ');
    } finally {
      setLinkBusyId(null);
    }
  };

  const copyLink = async () => {
    if (!linkFor) return;
    try {
      await navigator.clipboard.writeText(linkFor.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const openDelete = (member: MemberProfile) => {
    if (isPasscodeSession) {
      showFeedback('error', LINE_ONLY_HINT);
      return;
    }
    setDeleting(toDeleteTarget(member));
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    const ok = await runAction(`delete:${target.id}`, () => adminApi.deleteMember(target.id), (msg) => {
      setDeleting(null);
      showFeedback('error', msg);
    });
    if (ok) {
      setDeleting(null);
      showFeedback('success', `ลบข้อมูลของ "${target.fullName}" ถาวรแล้ว`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>สมาชิกที่อนุมัติแล้ว {rows.length} คน</span>
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            ระงับชั่วคราวได้ด้วย &quot;ไม่อนุมัติ&quot; · การลบถาวรต้องเข้าสู่ระบบด้วย LINE
          </p>
          {unlinkedCount > 0 && (
            <p className="text-xs text-amber-800 mt-1 font-bold">
              ⚠️ ยังไม่ผูก LINE {unlinkedCount} คน — คนกลุ่มนี้เข้าสู่ระบบไม่ได้จนกว่าจะผูกบัญชี
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => refreshFromServer()}
          disabled={isSyncing}
          className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'กำลังดึงข้อมูล...' : '🔄 รีเฟรชข้อมูล'}</span>
        </button>
      </div>

      {/* ค้นหา / กรอง / เรียง */}
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <span className="sr-only">ค้นหาสมาชิก</span>
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ แปลง อำเภอ ตำบล..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <div className="flex gap-2">
          <select
            aria-label="กรองตามอำเภอ"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
          >
            <option value="all">ทุกอำเภอ</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="เรียงลำดับ"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
          >
            <option value="newest">ล่าสุดก่อน</option>
            <option value="name">ชื่อ ก-ฮ</option>
            <option value="district">อำเภอ</option>
          </select>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-xl border text-sm ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
          {rows.length === 0 ? 'ยังไม่มีสมาชิกที่อนุมัติแล้ว' : 'ไม่พบสมาชิกตามเงื่อนไขที่ค้นหา'}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map(({ member, farm, farmCount, productCount }) => (
            <li key={member.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <img
                  src={member.facePhotoUrl || DEFAULT_AVATAR}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover border border-stone-200 bg-stone-50 shrink-0"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src !== DEFAULT_AVATAR) img.src = DEFAULT_AVATAR;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-900 truncate flex items-center gap-2">
                    <span className="truncate">{member.fullName}</span>
                    {isUnlinked(member) && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        ยังไม่ผูก LINE
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-stone-600 truncate">
                    แปลง: {farm?.farmName || 'ยังไม่มีแปลง'}
                    {farmCount > 1 ? ` (+${farmCount - 1})` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
                    {farm?.district && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        อ.{farm.district}{farm.subdistrict ? ` ต.${farm.subdistrict}` : ''}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      ผลผลิต {productCount} รายการ
                    </span>
                    {member.createdAt && <span>สมัคร {member.createdAt}</span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-100">
                {farm && (
                  <Link
                    href={`/farms/${farm.id}`}
                    target="_blank"
                    className="mr-auto text-xs font-bold text-brand-700 hover:underline inline-flex items-center gap-1"
                  >
                    ดูหน้าแปลง <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                {isUnlinked(member) && (
                  <button
                    type="button"
                    onClick={() => createLink(member)}
                    disabled={linkBusyId !== null || isPasscodeSession}
                    title={isPasscodeSession ? LINE_ONLY_HINT : 'สร้างลิงก์ให้สมาชิกเข้าสู่ระบบด้วย LINE แล้วผูกกับบัญชีนี้'}
                    className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {linkBusyId === member.id ? 'กำลังสร้าง…' : 'สร้างลิงก์ผูกบัญชี'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSuspend(member)}
                  disabled={busyKey !== null}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  {busyKey === `reject:${member.id}` ? 'กำลังบันทึก…' : 'ระงับ (ไม่อนุมัติ)'}
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(member)}
                  disabled={busyKey !== null || isPasscodeSession}
                  title={isPasscodeSession ? LINE_ONLY_HINT : 'ลบข้อมูลสมาชิก แปลง และผลผลิตถาวร'}
                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบถาวร
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {linkFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="link-dialog-title">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 id="link-dialog-title" className="font-bold text-stone-900">
                ลิงก์ผูกบัญชีของ {linkFor.member.fullName}
              </h2>
              <button type="button" onClick={() => setLinkFor(null)} aria-label="ปิด" className="p-1 rounded-lg hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-sm text-stone-700 space-y-1 list-decimal pl-5">
              <li>ส่งลิงก์นี้ให้ <b>{linkFor.member.fullName}</b> ทาง LINE (ส่งให้เจ้าตัวเท่านั้น)</li>
              <li>เขาเปิดลิงก์ เข้าสู่ระบบด้วย LINE ของตัวเอง แล้วกด &quot;ยืนยันผูกบัญชี&quot;</li>
              <li>หลังผูกแล้ว ป้าย &quot;ยังไม่ผูก LINE&quot; จะหายไปเมื่อรีเฟรชข้อมูล</li>
            </ol>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono break-all select-all">{linkFor.url}</div>
            <p className="text-xs text-stone-500">
              ใช้ได้ครั้งเดียว หมดอายุ {new Date(linkFor.expiresAt).toLocaleString('th-TH')} · สร้างใหม่แล้วลิงก์เก่าใช้ไม่ได้
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" /> {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
              </button>
              <a
                href={`https://line.me/R/share?text=${encodeURIComponent(`ลิงก์ผูกบัญชี LINE กับข้อมูลสมาชิกเครือข่ายกสิกรรมธรรมชาติ (ใช้ได้ครั้งเดียว): ${linkFor.url}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-bold text-center"
              >
                ส่งทาง LINE
              </a>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <DeleteMemberDialog
          target={deleting}
          busy={busyKey === `delete:${deleting.id}`}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
