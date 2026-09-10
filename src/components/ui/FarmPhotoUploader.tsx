'use client';

import React, { useState, useRef } from 'react';
import { compressImage } from '@/utils/imageOptimizer';
import { Camera, Plus, Trash2, Star, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';

interface FarmPhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  label?: string;
  description?: string;
}

export default function FarmPhotoUploader({
  photos,
  onChange,
  maxPhotos = 10,
  label = 'รูปภาพแปลงกสิกรรม / ศูนย์เรียนรู้ (อัพโหลดได้หลายรูป)',
  description = 'เลือกรูปภาพแปลงได้หลายรูปพร้อมกัน ระบบจะย่อขนาดภาพให้โหลดไว ไม่เปลืองอินเทอร์เน็ตโดยอัตโนมัติ',
}: FarmPhotoUploaderProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      alert(`อัพโหลดรูปได้สูงสุด ${maxPhotos} รูปครับ`);
      return;
    }

    const filesToProcess = fileList.slice(0, remainingSlots);
    setIsCompressing(true);
    setCompressProgress({ current: 0, total: filesToProcess.length });

    const newOptimizedPhotos: string[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      setCompressProgress({ current: i + 1, total: filesToProcess.length });
      try {
        const compressed = await compressImage(filesToProcess[i], {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.70,
        });
        newOptimizedPhotos.push(compressed.dataUrl);
      } catch (err) {
        console.error('Error compressing image', err);
      }
    }

    setIsCompressing(false);
    if (newOptimizedPhotos.length > 0) {
      onChange([...photos, ...newOptimizedPhotos]);
    }

    // Reset input value so same files can be re-selected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleSetCover = (indexToCover: number) => {
    if (indexToCover === 0) return;
    const target = photos[indexToCover];
    const remaining = photos.filter((_, idx) => idx !== indexToCover);
    onChange([target, ...remaining]);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm sm:text-base font-bold text-stone-900">
            {label}
          </label>
          <span className="text-xs font-semibold text-stone-500">
            {photos.length} / {maxPhotos} รูป
          </span>
        </div>
        {description && (
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Uploading / Compressing Indicator */}
      {isCompressing && (
        <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-brand-900 animate-in fade-in">
          <Loader2 className="w-5 h-5 text-brand-600 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="font-bold">กำลังปรับย่อขนาดรูปภาพให้เหมาะสมกับเว็บและมือถือ...</p>
            <p className="text-xs text-brand-700">
              กำลังประมวลผลรูปที่ {compressProgress.current} จาก {compressProgress.total} รูป
            </p>
          </div>
        </div>
      )}

      {/* Photos Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((url, idx) => (
          <div
            key={idx}
            className={`relative group rounded-2xl overflow-hidden border-2 aspect-4/3 bg-stone-100 shadow-xs transition-all ${
              idx === 0 ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-stone-200'
            }`}
          >
            <img
              src={url}
              alt={`รูปแปลง ${idx + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Cover Badge on 1st Photo */}
            {idx === 0 ? (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-brand-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span>ภาพหน้าปก</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSetCover(idx)}
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-[10px] font-semibold backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="ตั้งเป็นภาพหน้าปก"
              >
                ตั้งเป็นปก
              </button>
            )}

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => handleRemovePhoto(idx)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white shadow-md transition-colors"
              title="ลบรูปภาพนี้"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Order Pill */}
            <span className="absolute bottom-2 right-2 px-1.5 py-0.2 rounded-md bg-black/50 text-white text-[10px] font-mono">
              #{idx + 1}
            </span>
          </div>
        ))}

        {/* Add Photo Button Tile */}
        {photos.length < maxPhotos && (
          <label className="border-2 border-dashed border-stone-300 hover:border-brand-500 hover:bg-brand-50/30 rounded-2xl aspect-4/3 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors group">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFilesSelected}
              disabled={isCompressing}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-stone-100 group-hover:bg-brand-100 flex items-center justify-center text-stone-500 group-hover:text-brand-700 transition-colors mb-1.5">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-stone-700 group-hover:text-brand-800">
              + เพิ่มรูปแปลง
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5">
              เลือกได้หลายรูป
            </span>
          </label>
        )}
      </div>

      {photos.length > 0 && (
        <p className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span>
            รูปภาพแรกจะถูกใช้เป็นภาพปกหลัก เมื่อมีหลายรูป ระบบจะเล่นเป็นภาพวน (Slideshow) ในหน้าแปลงให้อัตโนมัติ
          </span>
        </p>
      )}
    </div>
  );
}
