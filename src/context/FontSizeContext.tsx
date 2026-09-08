'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { FontSizePref } from '@/types';

interface FontSizeContextType {
  fontSize: FontSizePref;
  setFontSize: (size: FontSizePref) => void;
  getTextClass: (type: 'title' | 'subtitle' | 'body' | 'caption' | 'button') => string;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

// ฟังก์ชันปรับขนาดฟอนต์ระดับราก (root element <html>) เพื่อให้หน่วย rem ใน Tailwind ขยายตามทุกหน้า
export const applyRootFontSize = (size: FontSizePref) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-font-size', size);

  // กำหนดขนาดฟอนต์บน <html> โดยตรง
  // ปกติ 16px (100%), ใหญ่ 18.5px (+15.6%), ใหญ่พิเศษ 21.5px (+34.4%)
  const sizePx = size === 'xlarge' ? '21.5px' : size === 'large' ? '18.5px' : '16px';
  root.style.fontSize = sizePx;

  // บันทึกลง Cookie เป็นแผนสำรองสำหรับ Webview (เช่น LINE LIFF)
  try {
    document.cookie = `nsw_agri_font_size=${size};path=/;max-age=31536000;SameSite=Lax`;
  } catch (e) {
    // ignore
  }
};

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizePref>('normal');

  useEffect(() => {
    // 1. โหลดการตั้งค่าจาก localStorage หรือ cookie
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('nsw_agri_font_size');
    } catch (e) {
      // ignore
    }

    if (!saved && typeof document !== 'undefined') {
      try {
        const match = document.cookie.match(/nsw_agri_font_size=([^;]+)/);
        if (match) saved = match[1];
      } catch (e) {
        // ignore
      }
    }

    if (saved && ['normal', 'large', 'xlarge'].includes(saved)) {
      const pref = saved as FontSizePref;
      setFontSizeState(pref);
      applyRootFontSize(pref);
    } else {
      applyRootFontSize('normal');
    }
  }, []);

  const setFontSize = (size: FontSizePref) => {
    setFontSizeState(size);
    try {
      localStorage.setItem('nsw_agri_font_size', size);
    } catch (e) {
      // ignore
    }
    applyRootFontSize(size);
  };

  // Helper สำหรับส่งคืนคลาสตามโครงสร้างฟอนต์ภาษาไทย ไม่ซ้อนทับขนาด rem ของ Tailwind
  const getTextClass = (type: 'title' | 'subtitle' | 'body' | 'caption' | 'button'): string => {
    switch (type) {
      case 'title': return 'font-extrabold leading-[1.38] tracking-normal';
      case 'subtitle': return 'font-bold leading-[1.38] tracking-normal';
      case 'body': return 'font-medium leading-[1.6]';
      case 'caption': return 'font-normal leading-normal';
      case 'button': return 'font-bold';
      default: return '';
    }
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, getTextClass }}>
      <div className={`font-size-${fontSize} min-h-screen w-full max-w-full`}>
        {children}
      </div>
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return context;
}
