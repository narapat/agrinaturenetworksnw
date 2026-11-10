import type { NewsCategory, NewsStatus, PracticeCategory, ProductCategory, ProductStatus } from '@/types';

/**
 * ค่าคงที่และชื่อแสดงผลของหมวดหมู่ต่างๆ (ใช้ร่วมกันทั้ง client และ server เพื่อไม่ให้ชื่อเพี้ยนกัน)
 */

export const PRODUCT_CATEGORIES: ProductCategory[] = ['byproduct', 'raw', 'processed', 'seed', 'tool', 'smartfarm'];
export const PRODUCT_STATUSES: ProductStatus[] = ['sale', 'share', 'preorder', 'out_of_stock', 'hidden'];
export const PRACTICE_CATEGORIES: PracticeCategory[] = ['water', 'soil', 'forest', 'biodiversity', 'energy', 'animal', 'other'];
export const NEWS_CATEGORIES: NewsCategory[] = ['เอามื้อสามัคคี', 'อบรมวิชาการ', 'ตลาดนัดกสิกรรม', 'ประกาศเครือข่าย'];
export const NEWS_STATUSES: NewsStatus[] = ['published', 'hidden'];

export function productCategoryName(category: ProductCategory): string {
  switch (category) {
    case 'smartfarm':
      return 'สมาร์ทฟาร์ม (Smart Farm)';
    case 'tool':
      return 'อุปกรณ์ เครื่องมือ';
    case 'byproduct':
      return 'ปัจจัยการผลิต/By-product';
    case 'seed':
      return 'เมล็ดพันธุ์/กิ่งพันธุ์';
    case 'processed':
      return 'แปรรูป';
    case 'raw':
    default:
      return 'ผลผลิตสด';
  }
}

export function practiceCategoryName(category: PracticeCategory): string {
  switch (category) {
    case 'water':
      return 'ด้านน้ำและการจัดการพื้นที่';
    case 'soil':
      return 'ด้านดิน ปุ๋ยหมัก และจุลินทรีย์';
    case 'forest':
      return 'ด้านป่าและไม้ยืนต้น';
    case 'biodiversity':
      return 'ด้านความหลากหลายและเมล็ดพันธุ์';
    case 'energy':
      return 'ด้านพลังงานและแปรรูป';
    case 'animal':
      return 'ด้านปศุสัตว์และประมงธรรมชาติ';
    case 'other':
    default:
      return 'กสิกรรมธรรมชาติ / วิถีอื่นๆ';
  }
}
