'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, ExternalLink, Check, Copy } from 'lucide-react';

export default function RichMenuExportPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const liffBase = 'https://liff.line.me/2011512009-Zjd5Loph';

  const menuActions = [
    {
      box: 'ช่องที่ 1 (บนซ้าย - A)',
      title: '🛒 ของดีเครือข่าย',
      desc: 'เปิดดู E-Catalog ตลาดนัดผลผลิตและ By-product ทั้ง 15 อำเภอ',
      url: `${liffBase}/catalog`,
      color: '#16a34a',
    },
    {
      box: 'ช่องที่ 2 (บนขวา - B)',
      title: '🌾 แปลงเกษตรกร',
      desc: 'สารบบศูนย์เรียนรู้และค้นหาแปลงกสิกรรมธรรมชาติ',
      url: `${liffBase}/farms`,
      color: '#bd8b57',
    },
    {
      box: 'ช่องที่ 3 (ล่างซ้าย - C)',
      title: '📢 ข่าวสาร & เอามื้อ',
      desc: 'ปฏิทินงานเอามื้อสามัคคี อบรมวิชาการ และตลาดสีเขียว',
      url: `${liffBase}/news`,
      color: '#4ade80',
    },
    {
      box: 'ช่องที่ 4 (ล่างขวา - D)',
      title: '👨‍🌾 แปลงของฉัน',
      desc: 'สำหรับสมาชิกเกษตรกร เพิ่มผลผลิต และขอให้แอดมินช่วยลงข้อมูล',
      url: `${liffBase}/member/dashboard`,
      color: '#15803d',
    },
  ];

  // Draw 2500 x 1686 exact standard LINE Rich Menu canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 2500;
    const height = 1686;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const halfW = width / 2;
    const halfH = height / 2;
    const pad = 36;
    const radius = 48;

    const drawBox = (
      x: number,
      y: number,
      w: number,
      h: number,
      bgColor: string,
      iconEmoji: string,
      title: string,
      subtitle: string,
      textColor: string = '#ffffff'
    ) => {
      // Rounded card
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, w - pad * 2, h - pad * 2, radius);
      ctx.fillStyle = bgColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.fill();
      ctx.restore();

      // Emoji Icon
      ctx.font = '160px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iconEmoji, x + w / 2, y + h / 2 - 130);

      // Title
      ctx.fillStyle = textColor;
      ctx.font = 'bold 110px "Prompt", "Sarabun", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x + w / 2, y + h / 2 + 100);

      // Subtitle
      ctx.fillStyle = textColor === '#ffffff' ? 'rgba(255, 255, 255, 0.85)' : '#44403c';
      ctx.font = '54px "Prompt", "Sarabun", sans-serif';
      ctx.fillText(subtitle, x + w / 2, y + h / 2 + 220);
    };

    // Box 1: บนซ้าย (ของดีเครือข่าย)
    drawBox(0, 0, halfW, halfH, '#16a34a', '🧺', 'ของดีเครือข่าย', 'E-Catalog ผลผลิต & By-product');

    // Box 2: บนขวา (แปลงเกษตรกร)
    drawBox(halfW, 0, halfW, halfH, '#b88650', '🌱', 'แปลงเกษตรกร', 'ค้นหาศูนย์เรียนรู้ 15 อำเภอ');

    // Box 3: ล่างซ้าย (ข่าวสาร & เอามื้อ)
    drawBox(0, halfH, halfW, halfH, '#86efac', '📢', 'ข่าวสาร & เอามื้อ', 'กิจกรรมอบรม • ตลาดสีเขียว', '#14532d');

    // Box 4: ล่างขวา (แปลงของฉัน)
    drawBox(halfW, halfH, halfW, halfH, '#15803d', '👨‍🌾', 'แปลงของฉัน', 'สำหรับสมาชิก เพิ่มผลผลิต');
  }, []);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'line-rich-menu-2500x1686.png';
    link.href = canvas.toDataURL('image/png', 0.95);
    link.click();
  };

  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back Button */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 font-semibold text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>กลับไปศูนย์แอดมิน</span>
      </Link>

      {/* Title */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
          <span>LINE Official Account Rich Menu Guide</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
          ภาพริชเมนู (Rich Menu) ขนาดเป๊ะ 2500 × 1686 px พร้อมลิงก์ LIFF
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          ภาพด้านล่างถูกเรนเดอร์ด้วยสัดส่วนมาตรฐานของ LINE (Template Large 4 ช่อง) 
          สามารถกดดาวน์โหลดแล้วนำไปอัปโหลดที่ <b>manager.line.biz</b> ได้ทันที ไม่โดนปฏิเสธเรื่องขนาดแน่นอนครับ
        </p>
      </div>

      {/* Canvas Preview & Download Button */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6 text-center">
        <div className="aspect-3/2 max-w-2xl mx-auto rounded-2xl overflow-hidden border-2 border-stone-200 shadow-md bg-stone-50">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />
        </div>

        <div>
          <button
            onClick={handleDownloadImage}
            className="px-8 py-4 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-base sm:text-lg shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2.5 mx-auto touch-target-big transition-all"
          >
            <Download className="w-5 h-5" />
            <span>ดาวน์โหลดภาพ Rich Menu (2500 × 1686 px)</span>
          </button>
          <p className="text-xs text-stone-400 mt-2">
            *ขนาด 2500x1686 px ไฟล์ PNG คุณภาพสูง พร้อมอัปโหลดเข้า LINE OA Manager
          </p>
        </div>
      </div>

      {/* LIFF Mapping Table for LINE OA Manager */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">
            ลิงก์สำหรับใส่ในช่อง Action ทั้ง 4 ช่อง
          </h2>
          <a
            href="https://manager.line.biz/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#06C755] hover:underline flex items-center gap-1"
          >
            <span>เปิด LINE OA Manager</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-4">
          {menuActions.map((item, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-stone-400 uppercase">
                  {item.box}
                </span>
                <h3 className="font-bold text-stone-900 text-base">
                  {item.title}
                </h3>
                <p className="text-xs text-stone-500">
                  {item.desc}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <code className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-700 font-mono truncate min-w-0 max-w-full sm:max-w-[340px]">
                  {item.url}
                </code>
                <button
                  onClick={() => handleCopy(item.url, idx)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-1 transition-colors"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกลิงก์</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
