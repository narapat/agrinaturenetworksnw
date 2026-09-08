'use client';

import React, { useState } from 'react';
import { compressImage, cropImageToAspect } from '@/utils/imageOptimizer';
import { Crop, Check, X, RotateCw, Sparkles } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onConfirm: (optimizedDataUrl: string) => void;
  aspectRatio?: number;
}

export default function ImageCropperModal({
  isOpen,
  onClose,
  file,
  onConfirm,
  aspectRatio = 4 / 3,
}: ImageCropperModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (file && isOpen) {
      setIsProcessing(true);
      compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 })
        .then((res) => {
          setPreviewUrl(res.dataUrl);
          setOriginalSize(res.originalSize);
          setCompressedSize(res.compressedSize);
          setIsProcessing(false);
        })
        .catch((err) => {
          console.error(err);
          setIsProcessing(false);
        });
    }
  }, [file, isOpen]);

  if (!isOpen || !file) return null;

  const handleApplyCrop = async () => {
    if (!previewUrl) return;
    setIsProcessing(true);
    try {
      const cropped = await cropImageToAspect(previewUrl, aspectRatio);
      onConfirm(cropped);
      onClose();
    } catch (e) {
      console.error(e);
      onConfirm(previewUrl);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseWithoutCrop = () => {
    if (previewUrl) {
      onConfirm(previewUrl);
      onClose();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb > 1024) return (kb / 1024).toFixed(1) + ' MB';
    return kb.toFixed(0) + ' KB';
  };

  const savedPercent = originalSize > 0 
    ? Math.round(((originalSize - compressedSize) / originalSize) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-stone-900 text-lg">ปรับแต่งรูปภาพผลผลิต</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Image Preview & Optimization Badge */}
        <div className="p-6">
          <div className="relative aspect-4/3 w-full bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 flex items-center justify-center">
            {isProcessing ? (
              <div className="text-center p-6">
                <RotateCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-stone-500 font-medium">กำลังย่อรูปให้เหมาะสมกับการโหลด...</p>
              </div>
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="รูปผลผลิต"
                className="w-full h-full object-contain"
              />
            ) : null}
          </div>

          {/* Size Reduction Badge */}
          {!isProcessing && originalSize > 0 && (
            <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-2xl flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-brand-900 font-medium">
                <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
                <span>
                  ย่อรูปจาก <b>{formatSize(originalSize)}</b> เหลือ <b>{formatSize(compressedSize)}</b>
                </span>
              </div>
              <span className="px-2 py-0.5 bg-brand-600 text-white rounded-full text-xs font-bold">
                ประหยัดเน็ต {savedPercent}%
              </span>
            </div>
          )}

          <p className="text-xs text-stone-500 mt-2 text-center">
            *รูปภาพจะคงสัดส่วนเดิม และถูกปรับให้โหลดเร็ว ไม่เปลืองพื้นที่จัดเก็บ
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleUseWithoutCrop}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-2xl border border-stone-200 bg-white hover:bg-stone-100 font-semibold text-stone-700 text-sm sm:text-base transition-colors touch-target-big"
          >
            ใช้รูปนี้เลย
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 font-bold text-white text-sm sm:text-base shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition-all touch-target-big"
          >
            <Check className="w-5 h-5" />
            <span>ตัดครอบพอดีกรอบ (แนะนำ)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
