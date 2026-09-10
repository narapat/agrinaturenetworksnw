'use client';

import React, { useState, useEffect } from 'react';
import { useFontSize } from '@/context/FontSizeContext';
import { dataService } from '@/services/dataService';
import { NewsEvent } from '@/types';
import { Calendar, MapPin, Share2, MessageSquare, Check, User } from 'lucide-react';

export default function NewsPage() {
  const { getTextClass } = useFontSize();
  const [newsList, setNewsList] = useState<NewsEvent[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setNewsList(dataService.getNews());
    refresh();
    window.addEventListener('nsw_data_updated', refresh);
    return () => window.removeEventListener('nsw_data_updated', refresh);
  }, []);

  const handleShareLine = (item: NewsEvent) => {
    const shareMessage =
      `📢 ขอเชิญร่วมกิจกรรม "${item.title}"\n` +
      `📅 วันที่: ${item.date}${item.time ? ` (${item.time})` : ''}\n` +
      `📍 สถานที่: ${item.location} (อ.${item.district} จ.นครสวรรค์)\n` +
      `👉 อ่านรายละเอียดเพิ่มเติมได้ที่นี่:\n` +
      `${window.location.href}`;
    window.open(`https://line.me/R/share?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-brand-800 to-teal-900 rounded-3xl p-6 sm:p-10 text-white shadow-lg space-y-2">
        <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
          กระดานข่าวสารเครือข่าย
        </span>
        <h1 className={`${getTextClass('title')} text-3xl sm:text-4xl font-extrabold leading-[1.38]`}>
          งานเอามื้อสามัคคี & กิจกรรมอบรม
        </h1>
        <p className={`${getTextClass('body')} text-emerald-100 text-sm sm:text-base`}>
          ปฏิทินกิจกรรมการเรียนรู้ ลงแขกเอามื้อ และตลาดนัดสีเขียว จังหวัดนครสวรรค์
        </p>
      </div>

      {/* News List */}
      <div className="space-y-6">
        {newsList.map((item) => (
          <article
            key={item.id}
            className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all grid grid-cols-1 md:grid-cols-12 gap-0"
          >
            {/* Image */}
            <div className="md:col-span-5 relative aspect-16/9 md:aspect-auto bg-stone-100">
              <img
                src={item.coverImage}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full bg-brand-600/95 text-white text-xs font-bold shadow-md">
                  {item.category}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                
                {/* Date & Location Badges */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-stone-500">
                  <span className="flex items-center gap-1.5 text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.date} {item.time && `(${item.time})`}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{item.location}</span>
                  </span>
                </div>

                <h2 className={`${getTextClass('subtitle')} text-xl sm:text-2xl font-black text-stone-900 leading-snug`}>
                  {item.title}
                </h2>

                <p className={`${getTextClass('body')} text-stone-600 text-sm sm:text-base leading-relaxed`}>
                  {item.content}
                </p>

              </div>

              {/* Share & Author Footer */}
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-stone-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>ประกาศโดย: {item.author}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShareLine(item)}
                    className="px-3.5 py-1.5 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>แชร์ไป LINE</span>
                  </button>

                  <button
                    onClick={handleShareFacebook}
                    className="px-3.5 py-1.5 rounded-full bg-[#1877F2] hover:bg-[#156cdb] text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    แชร์ไป FB
                  </button>

                  <button
                    onClick={() => handleCopyLink(item.id)}
                    className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
                  >
                    {copiedId === item.id ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                  </button>
                </div>

              </div>

            </div>
          </article>
        ))}
      </div>

    </div>
  );
}
