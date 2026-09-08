/**
 * Image Optimizer utility for client-side compression & aspect-ratio preservation
 * บีบอัดภาพถ่ายความละเอียดสูงจากกล้องมือถือให้อัตโนมัติก่อนส่งขึ้นระบบ
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<{ dataUrl: string; blob: Blob; originalSize: number; compressedSize: number }> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // คำนวณรักษาสัดส่วนภาพ (Keep Aspect Ratio)
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // วาดภาพลง Canvas ด้วยสัดส่วนใหม่
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            const dataUrl = canvas.toDataURL(mimeType, quality);
            resolve({
              dataUrl,
              blob,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          mimeType,
          quality
        );
      };

      img.onerror = (error) => reject(error);
    };

    reader.onerror = (error) => reject(error);
  });
}

/**
 * ตัดรูปภาพ (Crop) ให้ได้อัตราส่วนที่กำหนด (เช่น 4:3 หรือ 1:1)
 */
export async function cropImageToAspect(
  dataUrl: string,
  targetAspect: number = 4 / 3
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const sourceAspect = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (sourceAspect > targetAspect) {
        // กว้างกว่าสัดส่วนที่ต้องการ ให้ตัดขอบซ้ายขวา
        sw = img.height * targetAspect;
        sx = (img.width - sw) / 2;
      } else {
        // สูงกว่าสัดส่วนที่ต้องการ ให้ตัดขอบบนล่าง
        sh = img.width / targetAspect;
        sy = (img.height - sh) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(sw, 1200);
      canvas.height = Math.min(sh, 1200 / targetAspect);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = (err) => reject(err);
  });
}
