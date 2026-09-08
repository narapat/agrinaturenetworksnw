export type FontSizePref = 'normal' | 'large' | 'xlarge';

export type UserRole = 'guest' | 'member' | 'admin';

export type MemberStatus = 'pending' | 'approved' | 'rejected';

export type ProductStatus = 'sale' | 'share' | 'preorder' | 'out_of_stock';

export type DelegationStatus = 'none' | 'requested' | 'completed';

export interface SocialLinks {
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  lineId?: string;
  website?: string;
}

export interface MemberProfile {
  id: string;
  lineUserId?: string;
  fullName: string; // ชื่อ-นามสกุล / ชื่อเล่น
  facePhotoUrl: string; // รูปหน้าสมาชิกตัวจริง (ใช้สำหรับแอดมินคัดกรอง Verify)
  role: UserRole;
  status: MemberStatus;
  fontSizePref: FontSizePref;
  phone: string; // เบอร์โทรศัพท์ (มีระบบซ่อนเป็นค่าเริ่มต้น)
  lineId: string;
  isPublicPhone: boolean; // สวิตช์ความปลอดภัย: ค่าเริ่มต้น false
  isPublicLine: boolean; // สวิตช์ความปลอดภัย: ค่าเริ่มต้น false
  isPublicSocials: boolean;
  socials: SocialLinks;
  delegationStatus: DelegationStatus; // ร้องขอให้แอดมินช่วยลงข้อมูลแทน
  delegationNote?: string;
  farmId: string;
  createdAt: string;
}

export interface Farm {
  id: string;
  memberId: string;
  ownerName: string;
  farmName: string; // ชื่อแปลง / ศูนย์เรียนรู้
  tagline?: string;
  story: string; // เรื่องเล่าแปลง ปรัชญากสิกรรมธรรมชาติ
  photos: string[];
  district: string; // อำเภอ (ใน 15 อำเภอของนครสวรรค์)
  subdistrict: string; // ตำบล
  // พิกัดจริง (เก็บเป็นฐานข้อมูลภายในเท่านั้น ห้ามเปิดเผยสู่ Client สาธารณะ)
  internalCoordinates: {
    lat: number;
    lng: number;
  };
  // ข้อมูลแสดงผลสาธารณะ (แสดงเฉพาะระดับโซน รัศมี 3-5 กม.)
  publicZone: {
    name: string; // เช่น "โซน ต.หนองกรด อ.เมืองนครสวรรค์"
    approxLat: number;
    approxLng: number;
    radiusKm: number;
  };
  practices: string[]; // เช่น "โคก หนอง นา", "กสิกรรมไร้สารพิษ", "ป่า 3 อย่าง ประโยชน์ 4 อย่าง", "เผาถ่านไบโอชาร์"
  isPublicPhone: boolean;
  isPublicLine: boolean;
  phone?: string; // จะถูกตัดออกถ้า isPublicPhone === false
  lineId?: string; // จะถูกตัดออกถ้า isPublicLine === false
  socials?: SocialLinks;
}

export interface Product {
  id: string;
  farmId: string;
  farmName: string;
  district: string;
  subdistrict: string;
  title: string; // เช่น "ถ่านไบโอชาร์อุณหภูมิสูง", "น้ำส้มควันไม้บริสุทธิ์"
  skuTagId: string; // จับคู่กับ Standard SKU เช่น "biochar", "wood_vinegar", "bokashi"
  skuTagName: string; // เช่น "ถ่านไบโอชาร์"
  category: 'byproduct' | 'raw' | 'processed' | 'seed';
  categoryName: string; // ปัจจัยการผลิต/By-product, วัตถุดิบสด, แปรรูป, เมล็ดพันธุ์
  status: ProductStatus;
  price?: number; // ราคา (ถ้า status === 'sale')
  unit: string; // กิโลกรัม, ขวด 500ml, ถุง 5 กก., กระสอบ, ต้น, ซอง
  description: string;
  images: string[];
  harvestDate?: string;
  isOrganicCertified?: boolean;
  updatedAt: string;
  // Contact permissions (ดึงมาจาก Farm)
  isPublicPhone: boolean;
  isPublicLine: boolean;
  phone?: string;
  lineId?: string;
}

export interface SKUGroup {
  skuTagId: string;
  name: string;
  category: 'byproduct' | 'raw' | 'processed' | 'seed';
  categoryName: string;
  icon: string;
  itemCount: number;
  farmCount: number;
  minPrice?: number;
  maxPrice?: number;
  hasSharing: boolean; // มีแปลงที่แจก/แบ่งปันฟรีหรือไม่
  sampleImage: string;
  districts: string[]; // อำเภอที่มีผลผลิตนี้
}

export interface CategoryTag {
  id: string;
  name: string;
  category: 'byproduct' | 'raw' | 'processed' | 'seed';
  icon: string;
  description: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  action: 'assist_create_product' | 'assist_edit_product' | 'assist_update_farm' | 'approve_member' | 'reject_member';
  performedByAdminId: string;
  performedByAdminName: string;
  targetMemberId: string;
  targetMemberName: string;
  targetFarmName: string;
  details: string;
  timestamp: string;
}

export interface NewsEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  district: string;
  content: string;
  coverImage: string;
  category: 'เอามื้อสามัคคี' | 'อบรมวิชาการ' | 'ตลาดนัดกสิกรรม' | 'ประกาศเครือข่าย';
  author: string;
}
