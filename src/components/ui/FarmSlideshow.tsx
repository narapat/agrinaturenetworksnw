'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Play, Pause, Camera } from 'lucide-react';

interface FarmSlideshowProps {
  photos: string[];
  farmName: string;
  heightClass?: string;
  aspectRatioClass?: string;
  autoPlayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  showBadge?: boolean;
  showPlayPause?: boolean;
  className?: string;
  overlayChildren?: React.ReactNode;
  onImageClick?: (index: number) => void;
  linkHref?: string;
}

export default function FarmSlideshow({
  photos,
  farmName,
  heightClass = 'h-52 sm:h-56',
  aspectRatioClass = '',
  autoPlayInterval = 3500,
  showControls = true,
  showIndicators = true,
  showBadge = true,
  showPlayPause = false,
  className = '',
  overlayChildren,
  onImageClick,
  linkHref,
}: FarmSlideshowProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Auto-rotation timer (หมุนวนอัตโนมัติแสดงทีละรูป)
  useEffect(() => {
    if (!photos || photos.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [photos, isPaused, autoPlayInterval]);

  // Fallback if no photos provided
  const validPhotos = photos && photos.length > 0 ? photos : [
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop'
  ];

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + validPhotos.length) % validPhotos.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validPhotos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left -> next photo
        setCurrentIndex((prev) => (prev + 1) % validPhotos.length);
      } else {
        // Swiped right -> prev photo
        setCurrentIndex((prev) => (prev - 1 + validPhotos.length) % validPhotos.length);
      }
    }
    touchStartX.current = null;
  };

  const handleContainerClick = () => {
    if (linkHref) {
      router.push(linkHref);
    } else if (onImageClick) {
      onImageClick(currentIndex);
    }
  };

  return (
    <div
      className={`relative ${heightClass} ${aspectRatioClass} w-full bg-stone-900 overflow-hidden group select-none ${className} ${linkHref ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
    >
      {/* Image Stack with Smooth Cross-Fade (แสดงทีละรูป และหมุนวนไปเรื่อยๆ) */}
      {validPhotos.map((photoUrl, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <img
            src={photoUrl}
            alt={`${farmName} ภาพที่ ${idx + 1}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ))}

      {/* Subtle Dark Vignette Overlay for Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-15 pointer-events-none" />

      {/* Top Controls: Play/Pause and Photo Count Badge */}
      {validPhotos.length > 1 && (
        <div className="absolute top-3 right-3 z-25 flex items-center gap-1.5 pointer-events-auto">
          {showPlayPause && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPaused(!isPaused);
              }}
              className="px-2 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[11px] font-semibold backdrop-blur-md flex items-center gap-1 transition-colors shadow-xs"
              title={isPaused ? 'กดเพื่อเล่นภาพวนอัตโนมัติ' : 'กดเพื่อหยุดภาพวนชั่วคราว'}
            >
              {isPaused ? <Play className="w-3 h-3 text-amber-300 fill-amber-300" /> : <Pause className="w-3 h-3 text-emerald-300 fill-emerald-300" />}
              <span className="hidden sm:inline">{isPaused ? 'เล่นภาพวน' : 'หยุด'}</span>
            </button>
          )}

          {showBadge && (
            <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-mono font-bold backdrop-blur-md flex items-center gap-1 shadow-xs">
              <Camera className="w-3 h-3 text-brand-400" />
              <span>{currentIndex + 1}/{validPhotos.length}</span>
            </span>
          )}
        </div>
      )}

      {/* Prev / Next Navigation Arrows */}
      {validPhotos.length > 1 && showControls && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/45 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm shadow-md transition-all z-25 opacity-0 group-hover:opacity-100 sm:opacity-75 focus:opacity-100"
            title="รูปก่อนหน้า"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/45 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm shadow-md transition-all z-25 opacity-0 group-hover:opacity-100 sm:opacity-75 focus:opacity-100"
            title="รูปถัดไป"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bottom Dot Indicators */}
      {validPhotos.length > 1 && showIndicators && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-25 flex items-center gap-1.5 bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs pointer-events-auto">
          {validPhotos.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? 'w-5 bg-brand-400' : 'w-1.5 bg-white/60 hover:bg-white'
              }`}
              title={`ไปยังรูปที่ ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Custom Overlay Content (e.g. badges, titles) */}
      {overlayChildren && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {overlayChildren}
        </div>
      )}
    </div>
  );
}
