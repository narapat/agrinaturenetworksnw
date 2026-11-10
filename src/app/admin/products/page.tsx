'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Edit3, ExternalLink, MapPin, Package, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import type { Farm, Product, ProductCategory, ProductStatus } from '@/types';
import { PRODUCT_CATEGORIES, PRODUCT_STATUSES, productCategoryName } from '@/lib/taxonomy';
import { useAdminData, LINE_ONLY_HINT } from '@/app/admin/_components/AdminDataContext';
import { ModalError } from '@/app/admin/_components/ModalError';

const STATUS_META: Record<ProductStatus, { label: string; className: string }> = {
  sale: { label: '🟢 ขาย', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  share: { label: '🔵 แบ่งปันฟรี', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  preorder: { label: '🟡 จองล่วงหน้า', className: 'bg-amber-50 text-amber-900 border-amber-200' },
  out_of_stock: { label: '⚪ หมด', className: 'bg-stone-100 text-stone-700 border-stone-200' },
  hidden: { label: '🔒 ไม่แสดง', className: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f5f5f4'/%3E%3Ctext x='32' y='40' font-size='26' text-anchor='middle'%3E%F0%9F%8C%BF%3C/text%3E%3C/svg%3E";

const nf = new Intl.NumberFormat('th-TH');

function priceText(p: Product): string {
  if (p.status === 'share') return 'แบ่งปันฟรี';
  if (typeof p.price === 'number' && p.price > 0) return `${nf.format(p.price)} บาท / ${p.unit || '-'}`;
  return p.unit ? `หน่วย: ${p.unit}` : '-';
}

interface EditForm {
  title: string;
  skuTagId: string;
  price: string;
  unit: string;
  description: string;
  status: ProductStatus;
}

/** /admin/products — ผลผลิตของทุกแปลง: ค้นหา เปลี่ยนสถานะ แก้ไข และลบ (ลบได้เฉพาะเข้าด้วย LINE) */
export default function AdminProductsPage() {
  const { products, farms, allMembers, categories, isPasscodeSession, isSyncing, runAction, busyKey, refreshFromServer } =
    useAdminData();

  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  useEffect(() => setModalError(null), [editing, deleting]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4500);
  };

  const farmById = useMemo(() => new Map(farms.map((f) => [f.id, f])), [farms]);
  const memberNameById = useMemo(() => new Map(allMembers.map((m) => [m.id, m.fullName])), [allMembers]);

  const farmOptions = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => counts.set(p.farmId, (counts.get(p.farmId) || 0) + 1));
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, count, name: farmById.get(id)?.farmName || products.find((p) => p.farmId === id)?.farmName || id }))
      .sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [products, farmById]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (farmFilter !== 'all' && p.farmId !== farmFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return [p.title, p.skuTagName, p.farmName, p.district].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
    const byFarm = new Map<string, Product[]>();
    filtered.forEach((p) => byFarm.set(p.farmId, [...(byFarm.get(p.farmId) || []), p]));
    return Array.from(byFarm.entries())
      .map(([farmId, items]) => {
        const farm: Farm | undefined = farmById.get(farmId);
        return {
          farmId,
          farm,
          farmName: farm?.farmName || items[0]?.farmName || 'ไม่พบแปลง',
          district: farm?.district || items[0]?.district || '',
          ownerName: farm?.memberId ? memberNameById.get(farm.memberId) : undefined,
          items: items.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))),
        };
      })
      .sort((a, b) => a.farmName.localeCompare(b.farmName, 'th'));
  }, [products, search, farmFilter, statusFilter, categoryFilter, farmById, memberNameById]);

  const visibleCount = groups.reduce((n, g) => n + g.items.length, 0);

  // ==================== Actions ====================

  const changeStatus = async (p: Product, status: ProductStatus) => {
    if (status === p.status) return;
    const ok = await runAction(`product:status:${p.id}`, () => adminApi.updateProduct(p.id, { status }), (msg) =>
      showFeedback('error', msg)
    );
    if (ok) showFeedback('success', `เปลี่ยนสถานะ "${p.title}" เป็น ${STATUS_META[status].label} แล้ว`);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      title: p.title || '',
      skuTagId: p.skuTagId || '',
      price: typeof p.price === 'number' ? String(p.price) : '',
      unit: p.unit || '',
      description: p.description || '',
      status: p.status,
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !form) return;
    // ส่งเฉพาะ field ที่เปลี่ยนจริง
    const patch: Record<string, unknown> = {};
    if (form.title.trim() !== (editing.title || '')) patch.title = form.title.trim();
    if (form.skuTagId && form.skuTagId !== editing.skuTagId) patch.skuTagId = form.skuTagId;
    const priceNum = form.price.trim() === '' ? 0 : Number(form.price);
    if (priceNum !== (editing.price ?? 0)) patch.price = priceNum;
    if (form.unit.trim() !== (editing.unit || '')) patch.unit = form.unit.trim();
    if (form.description.trim() !== (editing.description || '')) patch.description = form.description.trim();
    if (form.status !== editing.status) patch.status = form.status;

    if (Object.keys(patch).length === 0) {
      setEditing(null);
      return;
    }
    const ok = await runAction(`product:edit:${editing.id}`, () => adminApi.updateProduct(editing.id, patch as any), (msg) =>
      setModalError(msg)
    );
    if (ok) {
      showFeedback('success', `บันทึกการแก้ไข "${form.title.trim()}" แล้ว`);
      setEditing(null);
    }
  };

  const openDelete = (p: Product) => {
    if (isPasscodeSession) {
      showFeedback('error', `${LINE_ONLY_HINT} (เปลี่ยนสถานะเป็น "ไม่แสดง" แทนได้)`);
      return;
    }
    setDeleting(p);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const p = deleting;
    const ok = await runAction(`product:delete:${p.id}`, () => adminApi.deleteProduct(p.id), (msg) => setModalError(msg));
    if (ok) {
      showFeedback('success', `ลบผลผลิต "${p.title}" แล้ว`);
      setDeleting(null);
    }
  };

  // ตัวเลือก SKU: เปิดใช้งาน + ค่าปัจจุบันของผลผลิต (แม้ถูกปิดไปแล้ว)
  const skuOptions = useMemo(
    () => categories.filter((c) => c.isActive || c.id === editing?.skuTagId).sort((a, b) => a.name.localeCompare(b.name, 'th')),
    [categories, editing]
  );

  const busy = busyKey !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" aria-hidden />
            <span>
              ผลผลิตทั้งหมด {nf.format(products.length)} รายการ จาก {nf.format(farmOptions.length)} แปลง
            </span>
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            แก้ไขและเปลี่ยนสถานะได้ทุกรายการ · ซ่อนชั่วคราวใช้สถานะ &quot;ไม่แสดง&quot; · การลบถาวรต้องเข้าสู่ระบบด้วย LINE
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshFromServer()}
          disabled={isSyncing}
          className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden />
          <span>{isSyncing ? 'กำลังดึงข้อมูล...' : '🔄 รีเฟรชข้อมูล'}</span>
        </button>
      </div>

      {/* ค้นหา / กรอง */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto] gap-2">
        <label className="relative sm:col-span-2 lg:col-span-1">
          <span className="sr-only">ค้นหาผลผลิต</span>
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อผลผลิต ชนิด แปลง อำเภอ..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <select
          aria-label="กรองตามแปลง"
          value={farmFilter}
          onChange={(e) => setFarmFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white min-w-0"
        >
          <option value="all">ทุกแปลง</option>
          {farmOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.count})
            </option>
          ))}
        </select>
        <select
          aria-label="กรองตามสถานะ"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ProductStatus)}
          className="px-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
        >
          <option value="all">ทุกสถานะ</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select
          aria-label="กรองตามหมวดหมู่"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | ProductCategory)}
          className="px-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
        >
          <option value="all">ทุกหมวดหมู่</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{productCategoryName(c)}</option>
          ))}
        </select>
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

      {visibleCount === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
          {products.length === 0 ? 'ยังไม่มีผลผลิตในระบบ' : 'ไม่พบผลผลิตตามเงื่อนไขที่ค้นหา'}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.farmId} aria-label={`ผลผลิตของ ${g.farmName}`} className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <header className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="font-black text-stone-900">{g.farmName}</h2>
                {g.district && (
                  <span className="text-xs text-stone-500 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" aria-hidden /> อ.{g.district}
                  </span>
                )}
                {g.ownerName && <span className="text-xs text-stone-500">เจ้าของ: {g.ownerName}</span>}
                <span className="text-xs font-bold text-stone-700">{g.items.length} รายการ</span>
                {g.farm && (
                  <Link href={`/farms/${g.farmId}`} target="_blank" className="ml-auto text-xs font-bold text-brand-700 hover:underline inline-flex items-center gap-1">
                    ดูหน้าแปลง <ExternalLink className="w-3 h-3" aria-hidden />
                  </Link>
                )}
              </header>

              <ul className="divide-y divide-stone-100">
                {g.items.map((p) => (
                  <li key={p.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <img
                        src={p.images?.[0] || PLACEHOLDER}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover border border-stone-200 bg-stone-50 shrink-0"
                        onError={(e) => {
                          if (e.currentTarget.src !== PLACEHOLDER) e.currentTarget.src = PLACEHOLDER;
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 leading-snug break-words">{p.title}</p>
                        <p className="text-xs text-stone-500 truncate">
                          {p.skuTagName || '-'} · {p.categoryName || productCategoryName(p.category)}
                        </p>
                        <p className="text-xs text-stone-700 mt-0.5">
                          {priceText(p)}
                          {p.updatedAt && <span className="text-stone-400"> · อัปเดต {p.updatedAt}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <label className="sr-only" htmlFor={`status-${p.id}`}>สถานะของ {p.title}</label>
                      <select
                        id={`status-${p.id}`}
                        value={p.status}
                        disabled={busy}
                        onChange={(e) => changeStatus(p, e.target.value as ProductStatus)}
                        className={`px-2.5 py-2 rounded-xl border text-xs font-bold disabled:opacity-60 ${STATUS_META[p.status]?.className || ''}`}
                      >
                        {PRODUCT_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_META[s].label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        disabled={busy}
                        className="px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden /> แก้ไข
                      </button>
                      <Link
                        href={`/catalog/${p.id}`}
                        target="_blank"
                        className="px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden /> ดู
                      </Link>
                      <button
                        type="button"
                        onClick={() => openDelete(p)}
                        disabled={busy || isPasscodeSession}
                        title={isPasscodeSession ? `${LINE_ONLY_HINT} (เปลี่ยนสถานะเป็น "ไม่แสดง" แทนได้)` : 'ลบผลผลิตนี้ถาวร'}
                        aria-label={`ลบ ${p.title}`}
                        className="p-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* แก้ไขผลผลิต */}
      {editing && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !busy && setEditing(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-title"
            onSubmit={saveEdit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="edit-product-title" className="text-lg font-black text-stone-900">แก้ไขผลผลิต</h2>
                <p className="text-xs text-stone-500">แปลง {editing.farmName} · การแก้ไขจะบันทึกในประวัติการทำงาน</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} disabled={busy} aria-label="ปิด" className="text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && <ModalError message={modalError} />}

            <label className="block">
              <span className="block text-xs font-bold text-stone-700 mb-1">ชื่อผลผลิต</span>
              <input
                required
                minLength={2}
                maxLength={150}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-base"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-stone-700 mb-1">ชนิดผลผลิต (SKU)</span>
              <select
                value={form.skuTagId}
                onChange={(e) => setForm({ ...form, skuTagId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
              >
                {!skuOptions.some((c) => c.id === form.skuTagId) && <option value={form.skuTagId}>{editing.skuTagName || form.skuTagId}</option>}
                {skuOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name} — {productCategoryName(c.category)}
                    {!c.isActive ? ' (ปิดรับแล้ว)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-bold text-stone-700 mb-1">ราคา (บาท)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={1000000}
                  step="any"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-base"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-stone-700 mb-1">หน่วย</span>
                <input
                  required
                  maxLength={40}
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-base"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-xs font-bold text-stone-700 mb-1">สถานะ</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm bg-white"
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-bold text-stone-700 mb-1">รายละเอียด</span>
              <textarea
                rows={4}
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm"
              />
            </label>

            <p className="text-[11px] text-stone-500">รูปภาพแก้ไขได้โดยเจ้าของแปลงในหน้าแดชบอร์ดของสมาชิก</p>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditing(null)} disabled={busy} className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold text-sm">
                ยกเลิก
              </button>
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm disabled:opacity-50">
                {busyKey === `product:edit:${editing.id}` ? 'กำลังบันทึก…' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ยืนยันลบ */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !busy && setDeleting(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <h2 id="delete-product-title" className="text-lg font-black text-stone-900">ลบผลผลิตถาวร?</h2>
            {modalError && <ModalError message={modalError} />}
            <p className="text-sm text-stone-700">
              &quot;<b>{deleting.title}</b>&quot; ของแปลง {deleting.farmName} จะหายจากตลาดทันทีและกู้คืนไม่ได้
              ถ้าต้องการซ่อนชั่วคราว ให้เปลี่ยนสถานะเป็น &quot;🔒 ไม่แสดง&quot; แทน
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleting(null)} disabled={busy} className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-700 font-bold text-sm">
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" aria-hidden />
                {busyKey === `product:delete:${deleting.id}` ? 'กำลังลบ…' : 'ลบถาวร'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
