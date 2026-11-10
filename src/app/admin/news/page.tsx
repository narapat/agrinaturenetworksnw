'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/services/adminApi';
import type { NewsEvent, NewsCategory, NewsStatus } from '@/types';
import { compressImage } from '@/utils/imageOptimizer';
import {
  Check,
  X,
  Eye,
  AlertCircle,
  Calendar,
  Search,
  Trash2,
  CalendarPlus,
  Edit3,
  Upload,
  Image as ImageIcon,
  EyeOff,
  CheckCircle2,
  Filter,
  Activity,
} from 'lucide-react';
import { useAdminData, LINE_ONLY_HINT } from '@/app/admin/_components/AdminDataContext';

/** /admin/news — ประกาศกิจกรรมและข่าวสารของเครือข่าย */
export default function AdminNewsPage() {
  const {
    newsList,
    isPasscodeSession,
    actorName,
    runAction,
    busyKey,
  } = useAdminData();

  // News Tab State
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState<NewsCategory>('เอามื้อสามัคคี');
  const [newsDate, setNewsDate] = useState('');
  const [newsTime, setNewsTime] = useState('08:30 - 15:30 น.');
  const [newsLocation, setNewsLocation] = useState('');
  const [newsDistrict, setNewsDistrict] = useState('เมืองนครสวรรค์');
  const [newsContent, setNewsContent] = useState('');
  const [newsCoverImage, setNewsCoverImage] = useState('');
  const [newsStatus, setNewsStatus] = useState<NewsStatus>('published');
  const [newsAuthor, setNewsAuthor] = useState('');
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageCompressInfo, setImageCompressInfo] = useState<string | null>(null);
  const [newsSearch, setNewsSearch] = useState('');
  const [newsFilter, setNewsFilter] = useState<'all' | 'published' | 'hidden'>('all');
  const [newsFeedback, setNewsFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newsModalError, setNewsModalError] = useState<string | null>(null);

  const handleOpenAddNews = () => {
    setEditingNewsId(null);
    setNewsTitle('');
    setNewsCategory('เอามื้อสามัคคี');
    setNewsDate(new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }));
    setNewsTime('08:30 - 15:30 น.');
    setNewsLocation('ศูนย์กสิกรรมธรรมชาตินครสวรรค์');
    setNewsDistrict('เมืองนครสวรรค์');
    setNewsContent('');
    setNewsCoverImage('');
    setNewsStatus('published');
    setNewsAuthor(actorName);
    setImageCompressInfo(null);
    setImageUploadMode('upload');
    setNewsModalError(null);
    setShowNewsModal(true);
  };

  const handleOpenEditNews = (item: NewsEvent) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsCategory(item.category);
    setNewsDate(item.date);
    setNewsTime(item.time || '08:30 - 15:30 น.');
    setNewsLocation(item.location);
    setNewsDistrict(item.district);
    setNewsContent(item.content);
    setNewsCoverImage(item.coverImage);
    setNewsStatus(item.status || 'published');
    setNewsAuthor(item.author || actorName);
    setImageCompressInfo(null);
    setImageUploadMode(item.coverImage?.startsWith('data:') ? 'upload' : 'url');
    setNewsModalError(null);
    setShowNewsModal(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    setImageCompressInfo(null);
    try {
      const res = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
      setNewsCoverImage(res.dataUrl);
      const origKb = Math.round(res.originalSize / 1024);
      const compKb = Math.round(res.compressedSize / 1024);
      const savedPct = Math.round(((res.originalSize - res.compressedSize) / res.originalSize) * 100);
      setImageCompressInfo(`✨ อัปโหลดและย่อภาพสำเร็จ: ${origKb} KB ➔ ${compKb} KB (ประหยัด ${savedPct}%)`);
    } catch (err) {
      console.error('Image compression error', err);
      alert('ไม่สามารถประมวลผลไฟล์ภาพได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const showNewsFeedback = (type: 'success' | 'error', text: string, ms = 4000) => {
    setNewsFeedback({ type, text });
    setTimeout(() => setNewsFeedback(null), ms);
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) return;

    let finalImage = newsCoverImage.trim();
    if (!finalImage) {
      if (newsCategory === 'เอามื้อสามัคคี') {
        finalImage = 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&h=500&fit=crop';
      } else if (newsCategory === 'อบรมวิชาการ') {
        finalImage = 'https://images.unsplash.com/photo-1542385151-efd9000785a0?w=800&h=500&fit=crop';
      } else if (newsCategory === 'ตลาดนัดกสิกรรม') {
        finalImage = 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=500&fit=crop';
      } else {
        finalImage = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop';
      }
    }

    const payload = {
      title: newsTitle.trim(),
      category: newsCategory,
      date: newsDate.trim() || new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: newsTime.trim(),
      location: newsLocation.trim() || '-',
      district: newsDistrict,
      content: newsContent.trim(),
      coverImage: finalImage,
      status: newsStatus,
      author: newsAuthor.trim() || actorName,
    };

    // ข้อผิดพลาดแสดงใน modal (ไม่ปิด modal เพื่อไม่ให้ข้อมูลที่พิมพ์หาย)
    const res = await runAction(
      editingNewsId ? `news:edit:${editingNewsId}` : 'news:add',
      () => (editingNewsId ? adminApi.updateNews(editingNewsId, payload) : adminApi.addNews(payload)),
      (msg) => setNewsModalError(msg)
    );
    if (!res) return;

    setNewsModalError(null);
    setShowNewsModal(false);
    showNewsFeedback(
      'success',
      editingNewsId
        ? `บันทึกการแก้ไขประกาศ "${payload.title}" เรียบร้อยแล้ว`
        : `ลงประกาศกิจกรรม "${payload.title}" สำเร็จแล้ว`
    );
  };

  const handleToggleNewsStatus = async (item: NewsEvent) => {
    const nextStatus: NewsStatus = item.status === 'hidden' ? 'published' : 'hidden';
    const ok = await runAction(
      `news:toggle:${item.id}`,
      () => adminApi.updateNews(item.id, { status: nextStatus }),
      (msg) => showNewsFeedback('error', msg)
    );
    if (!ok) return;
    showNewsFeedback(
      'success',
      nextStatus === 'hidden'
        ? `ซ่อนประกาศ "${item.title}" เรียบร้อยแล้ว (ไม่แสดงบนหน้าสาธารณะ)`
        : `เปิดแสดงประกาศ "${item.title}" สู่หน้าสาธารณะเรียบร้อยแล้ว`,
      3500
    );
  };

  const handleDeleteNews = async (item: NewsEvent) => {
    if (isPasscodeSession) {
      showNewsFeedback('error', `${LINE_ONLY_HINT} (ใช้ปุ่ม "ซ่อน" แทนได้)`);
      return;
    }
    if (!window.confirm(`คุณต้องการลบประกาศ "${item.title}" ออกจากระบบใช่หรือไม่?`)) return;
    const ok = await runAction(
      `news:delete:${item.id}`,
      () => adminApi.deleteNews(item.id),
      (msg) => showNewsFeedback('error', msg)
    );
    if (!ok) return;
    showNewsFeedback('success', `ลบประกาศ "${item.title}" เรียบร้อยแล้ว`, 3500);
  };

  const filteredNewsList = newsList.filter((item) => {
    if (newsFilter === 'published' && item.status === 'hidden') return false;
    if (newsFilter === 'hidden' && item.status !== 'hidden') return false;
    if (newsSearch.trim()) {
      const q = newsSearch.toLowerCase();
      const matches =
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <>
      <div className="space-y-4">
        {/* Feedback Toast */}
        {newsFeedback && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              newsFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{newsFeedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNewsFeedback(null)}
              className="text-stone-400 hover:text-stone-700 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              <span>กระดานประกาศกิจกรรม & เอามื้อสามัคคี</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              ลงประกาศกิจกรรม งานลงแขกเอามื้อ อบรมวิชาการ สามารถอัปโหลดรูปภาพได้เอง แก้ไขข้อมูล และเลือกซ่อน/แสดงผลบนหน้าเว็บได้
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/news"
              target="_blank"
              className="px-3.5 py-2 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-stone-400" />
              <span>ดูหน้าสาธารณะ (/news)</span>
            </Link>
            <button
              type="button"
              onClick={handleOpenAddNews}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>+ ลงประกาศกิจกรรมใหม่</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={newsSearch}
              onChange={(e) => setNewsSearch(e.target.value)}
              placeholder="ค้นหาประกาศ (ชื่อกิจกรรม, สถานที่, อำเภอ, หมวดหมู่)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
            {newsSearch && (
              <button
                type="button"
                onClick={() => setNewsSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setNewsFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                newsFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              ทั้งหมด ({newsList.length})
            </button>
            <button
              type="button"
              onClick={() => setNewsFilter('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                newsFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <span>🟢 กำลังแสดง</span>
              <span>({newsList.filter((n) => n.status !== 'hidden').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setNewsFilter('hidden')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                newsFilter === 'hidden'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              <span>🟡 ซ่อนไว้</span>
              <span>({newsList.filter((n) => n.status === 'hidden').length})</span>
            </button>
          </div>
        </div>

        {/* Form Modal: Add or Edit News/Activity */}
        {showNewsModal && (
          <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                  {editingNewsId ? (
                    <>
                      <Edit3 className="w-5 h-5 text-blue-600" />
                      <span>แก้ไขประกาศกิจกรรม & ข่าวสาร</span>
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-5 h-5 text-brand-600" />
                      <span>ลงประกาศกิจกรรมเครือข่ายใหม่</span>
                    </>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewsModal(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNews} className="space-y-4 text-xs sm:text-sm">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    หัวข้อกิจกรรม / ข่าวสาร *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น กิจกรรมเอามื้อสามัคคี ขุดคลองไส้ไก่ ณ ไร่สุขใจ..."
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                {/* Category & District */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      หมวดหมู่กิจกรรม *
                    </label>
                    <select
                      value={newsCategory}
                      onChange={(e) => setNewsCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    >
                      <option value="เอามื้อสามัคคี">🤝 เอามื้อสามัคคี</option>
                      <option value="อบรมวิชาการ">📚 อบรมวิชาการ</option>
                      <option value="ตลาดนัดกสิกรรม">🧺 ตลาดนัดกสิกรรม</option>
                      <option value="ประกาศเครือข่าย">📢 ประกาศเครือข่าย</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      อำเภอ *
                    </label>
                    <select
                      value={newsDistrict}
                      onChange={(e) => setNewsDistrict(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    >
                      {['เมืองนครสวรรค์', 'เก้าเลี้ยว', 'โกรกพระ', 'ชุมแสง', 'หนองบัว', 'บรรพตพิสัย', 'พยุหะคีรี', 'ลาดยาว', 'ตาคลี', 'ท่าตะโก', 'ไพศาลี', 'ตากฟ้า', 'แม่วงก์', 'แม่เปิน', 'ชุมตาบง'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      วันที่จัดกิจกรรม *
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 25 มีนาคม 2569"
                      value={newsDate}
                      onChange={(e) => setNewsDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      เวลาจัดกิจกรรม
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 08:30 - 15:30 น."
                      value={newsTime}
                      onChange={(e) => setNewsTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    สถานที่จัดกิจกรรม *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ศูนย์กสิกรรมธรรมชาติต้นแบบ สวนสราญรมย์ ต.หนองกรด"
                    value={newsLocation}
                    onChange={(e) => setNewsLocation(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    รายละเอียดกิจกรรม *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="ระบุกำหนดการ สิ่งที่ต้องเตรียมมา และเบอร์ติดต่อ..."
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                {/* Cover Photo Upload / URL */}
                <div className="space-y-2 border border-stone-200 p-3.5 rounded-2xl bg-stone-50/70">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-brand-600" />
                      <span>รูปภาพหน้าปกกิจกรรม</span>
                    </label>
                    <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setImageUploadMode('upload')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          imageUploadMode === 'upload'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        📷 อัปโหลดรูปเอง
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUploadMode('url')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          imageUploadMode === 'url'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        🔗 ระบุลิงก์ URL
                      </button>
                    </div>
                  </div>

                  {imageUploadMode === 'upload' ? (
                    <div>
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-300 hover:border-brand-500 rounded-2xl bg-white cursor-pointer transition-all group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <Upload className="w-6 h-6 text-stone-400 group-hover:text-brand-600 mb-1 transition-colors" />
                        <span className="text-xs font-bold text-stone-700 group-hover:text-brand-700">
                          {isCompressingImage ? 'กำลังย่อขนาดภาพ...' : 'คลิกเพื่อเลือกภาพถ่ายจากเครื่อง / ถ่ายภาพ'}
                        </span>
                        <span className="text-[10px] text-stone-400 mt-0.5">
                          ระบบจะย่อขนาดให้อัตโนมัติ (ภาพคมชัด โหลดเร็ว เหมาะกับมือถือและ LINE LIFF)
                        </span>
                      </label>
                      {imageCompressInfo && (
                        <div className="mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{imageCompressInfo}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={newsCoverImage}
                        onChange={(e) => setNewsCoverImage(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                      />
                      <span className="text-[10px] text-stone-400 mt-1 block">
                        หากเว้นว่าง ระบบจะเลือกรูปภาพธรรมชาติมาตรฐานตามหมวดหมู่ให้อัตโนมัติ
                      </span>
                    </div>
                  )}

                  {/* Image Preview */}
                  {newsCoverImage && (
                    <div className="relative rounded-xl overflow-hidden border border-stone-200 aspect-16/9 bg-stone-100 mt-2">
                      <img
                        src={newsCoverImage}
                        alt="พรีวิวรูปภาพหน้าปก"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setNewsCoverImage('');
                            setImageCompressInfo(null);
                          }}
                          className="px-2 py-1 bg-red-600/90 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-colors"
                        >
                          ลบรูป
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Visibility Status Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    สถานะการแสดงผล (Visibility) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                        newsStatus === 'published'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="newsStatus"
                        value="published"
                        checked={newsStatus === 'published'}
                        onChange={() => setNewsStatus('published')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>🟢 เผยแพร่สาธารณะ</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                          แสดงในหน้าข่าวสาร (/news) สมาชิกและประชาชนทั่วไปเข้าดูได้ทันที
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-2xl border cursor-pointer flex items-start gap-2.5 transition-all ${
                        newsStatus === 'hidden'
                          ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="newsStatus"
                        value="hidden"
                        checked={newsStatus === 'hidden'}
                        onChange={() => setNewsStatus('hidden')}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>🟡 ซ่อนไว้ (ยังไม่แสดง)</span>
                        </div>
                        <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                          ไม่แสดงบนหน้าเว็บสาธารณะ เก็บเป็นฉบับร่าง หรือซ่อนเมื่อผ่านไปแล้ว
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Buttons */}
                {newsModalError && (
                  <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span><b>บันทึกไม่สำเร็จ:</b> {newsModalError}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setShowNewsModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isCompressingImage || busyKey !== null}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {editingNewsId ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>บันทึกการแก้ไข</span>
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="w-4 h-4" />
                        <span>บันทึกประกาศกิจกรรม</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* News Cards Grid */}
        <div className="space-y-3">
          {filteredNewsList.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-stone-500 space-y-2">
              <Calendar className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="font-bold text-stone-700">ไม่พบประกาศกิจกรรมที่ตรงกับเงื่อนไข</p>
              <p className="text-xs text-stone-400">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "+ ลงประกาศกิจกรรมใหม่"</p>
            </div>
          ) : (
            filteredNewsList.map((item) => {
              const isHidden = item.status === 'hidden';
              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isHidden
                      ? 'bg-amber-50/30 border-dashed border-amber-300 shadow-2xs'
                      : 'bg-white border-stone-200 shadow-xs hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-24 h-18 rounded-2xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200 relative">
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                      {isHidden && (
                        <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center backdrop-blur-2xs">
                          <span className="text-[10px] font-black text-amber-200 bg-stone-900/80 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <EyeOff className="w-2.5 h-2.5" />
                            <span>ซ่อนอยู่</span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-bold">
                          {item.category}
                        </span>
                        {isHidden ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1">
                            <EyeOff className="w-3 h-3 text-amber-600" />
                            <span>ซ่อนไว้ (ฉบับร่าง)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>เผยแพร่อยู่</span>
                          </span>
                        )}
                        <span className="text-[11px] text-stone-500 font-medium">
                          📅 {item.date} {item.time && `(${item.time})`}
                        </span>
                      </div>
                      <h4 className="font-bold text-stone-900 text-sm truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-stone-500 truncate">
                        📍 {item.location} ({item.district})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Toggle Visibility Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleNewsStatus(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all ${
                        isHidden
                          ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-300 bg-emerald-50/40'
                          : 'text-amber-700 hover:bg-amber-50 border-amber-300 bg-amber-50/40'
                      }`}
                      title={isHidden ? 'เปิดแสดงบนหน้าเว็บสาธารณะ' : 'ซ่อนไม่ให้แสดงบนหน้าเว็บสาธารณะ'}
                    >
                      {isHidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>เปิดแสดง</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>ซ่อนประกาศ</span>
                        </>
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditNews(item)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 hover:bg-blue-50 border border-blue-200 bg-white flex items-center gap-1 transition-colors"
                      title="แก้ไขรายละเอียดประกาศ"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>แก้ไข</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteNews(item)}
                      disabled={isPasscodeSession}
                      className="disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 bg-white flex items-center gap-1 transition-colors"
                      title={isPasscodeSession ? `${LINE_ONLY_HINT} (ใช้ "ซ่อน" แทนได้)` : 'ลบประกาศออกจากระบบ'}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
