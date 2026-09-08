'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { FontSizePref } from '@/types';

interface FontSizeContextType {
  fontSize: FontSizePref;
  setFontSize: (size: FontSizePref) => void;
  getTextClass: (type: 'title' | 'subtitle' | 'body' | 'caption' | 'button') => string;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizePref>('normal');

  useEffect(() => {
    // โหลดการตั้งค่าจาก localStorage (ถ้ามี)
    const saved = localStorage.getItem('nsw_agri_font_size') as FontSizePref;
    if (saved && ['normal', 'large', 'xlarge'].includes(saved)) {
      setFontSizeState(saved);
    }
  }, []);

  const setFontSize = (size: FontSizePref) => {
    setFontSizeState(size);
    localStorage.setItem('nsw_agri_font_size', size);
  };

  // Helper สำหรับส่งคืนคลาส Tailwind ตามระดับขนาดตัวอักษรที่รองรับสระภาษาไทย
  const getTextClass = (type: 'title' | 'subtitle' | 'body' | 'caption' | 'button'): string => {
    switch (fontSize) {
      case 'xlarge':
        switch (type) {
          case 'title': return 'text-3xl md:text-5xl font-extrabold leading-[1.38] tracking-normal';
          case 'subtitle': return 'text-2xl md:text-3xl font-bold leading-[1.38] tracking-normal';
          case 'body': return 'text-xl font-medium leading-[1.6]';
          case 'caption': return 'text-lg font-normal leading-normal';
          case 'button': return 'text-xl font-bold';
        }
      case 'large':
        switch (type) {
          case 'title': return 'text-2xl md:text-4xl font-bold leading-[1.38] tracking-normal';
          case 'subtitle': return 'text-xl md:text-2xl font-semibold leading-[1.38] tracking-normal';
          case 'body': return 'text-lg font-normal leading-[1.6]';
          case 'caption': return 'text-base font-normal leading-normal';
          case 'button': return 'text-lg font-semibold';
        }
      case 'normal':
      default:
        switch (type) {
          case 'title': return 'text-xl md:text-3xl font-bold leading-[1.38] tracking-normal';
          case 'subtitle': return 'text-lg md:text-xl font-semibold leading-[1.38] tracking-normal';
          case 'body': return 'text-base font-normal leading-[1.6]';
          case 'caption': return 'text-sm font-normal leading-normal';
          case 'button': return 'text-base font-medium';
        }
    }
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, getTextClass }}>
      <div className={`font-size-${fontSize}`}>
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
