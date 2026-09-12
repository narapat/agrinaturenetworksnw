export type FontSizePref = 'normal' | 'large' | 'xlarge';

export type UserRole = 'guest' | 'member' | 'admin';

export type MemberStatus = 'pending' | 'approved' | 'rejected';

export type ProductStatus = 'sale' | 'share' | 'preorder' | 'out_of_stock' | 'hidden';

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
  ownerUid?: string; // LINE User ID (Firebase Auth UID) สำหรับตรวจสอบ ownership
  fullName: string; // ชื่อ-นามสกุล / ชื่อเล่น
  facePhotoUrl: string; // รูปหน้าสมาชิกตัวจริง (ใช้สำหรับแอดมินคัดกรอง Verify)
  role: UserRole;
  roles?: UserRole[]; // รองรับสมาชิกที่มี 2 บทบาทควบคู่กัน เช่น ['member', 'admin']
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
  trainingCourse?: string; // อบรมหลักสูตรอะไรมา
  trainingLocation?: string; // อบรมที่ไหนมา / ศูนย์ใด
  farmId: string;
  farmName?: string;
  createdAt: string;
}

export interface Farm {
  id: string;
  memberId: string;
  ownerUid?: string; // LINE User ID (Firebase Auth UID) ของเจ้าของแปลง
  ownerName: string;
  farmName: string; // ชื่อแปลง / ศูนย์เรียนรู้
  tagline?: string;
  status?: 'pending' | 'approved' | 'rejected'; // สถานะการอนุมัติแปลง (Option A)
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

export type ProductCategory = 'byproduct' | 'raw' | 'processed' | 'seed' | 'tool' | 'smartfarm';

export interface Product {
  id: string;
  farmId: string;
  farmName: string;
  district: string;
  subdistrict: string;
  title: string; // เช่น "ถ่านไบโอชาร์อุณหภูมิสูง", "น้ำส้มควันไม้บริสุทธิ์"
  skuTagId: string; // จับคู่กับ Standard SKU เช่น "biochar", "wood_vinegar", "bokashi"
  skuTagName: string; // เช่น "ถ่านไบโอชาร์"
  category: ProductCategory;
  categoryName: string; // ปัจจัยการผลิต/By-product, วัตถุดิบสด, แปรรูป, เมล็ดพันธุ์, อุปกรณ์ เครื่องมือ, สมาร์ทฟาร์ม
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
  category: ProductCategory;
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
  category: ProductCategory;
  icon: string;
  description: string;
  isActive: boolean;
}

export type PracticeCategory = 
  | 'water'         // ด้านน้ำและการจัดการพื้นที่ (โคก หนอง นา, ธนาคารน้ำ)
  | 'soil'          // ด้านดิน ปุ๋ยหมัก และจุลินทรีย์ (น้ำหมักเจ็ดรส, ปุ๋ยหมัก)
  | 'forest'        // ด้านป่าและไม้ยืนต้น (ป่า 3 อย่าง 4 ประโยชน์, เกษตรอินทรีย์)
  | 'biodiversity'  // ด้านความหลากหลายและเมล็ดพันธุ์ (อนุรักษ์เมล็ดพันธุ์)
  | 'energy'        // ด้านพลังงานและผลพลอยได้ (เตาเผาไบโอชาร์, น้ำส้มควันไม้)
  | 'animal'        // ด้านปศุสัตว์และประมงธรรมชาติ
  | 'other';        // กสิกรรมธรรมชาติ / ศาสตร์อื่นๆ

export interface FarmPracticeTag {
  id: string;
  name: string;
  category: PracticeCategory;
  categoryName: string;
  icon: string;
  description: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  action: 
    | 'assist_create_product' 
    | 'assist_edit_product' 
    | 'assist_update_farm' 
    | 'approve_member' 
    | 'reject_member' 
    | 'assign_admin' 
    | 'revoke_admin' 
    | 'create_news' 
    | 'update_news' 
    | 'delete_news' 
    | 'update_sku' 
    | 'delete_sku' 
    | 'create_practice'
    | 'update_practice'
    | 'delete_practice'
    | 'register_member'
    | 'member_login'
    | 'create_farm'
    | 'update_farm'
    | 'create_product'
    | 'update_product'
    | 'delete_product';
  performedByAdminId: string;
  performedByAdminName: string;
  targetMemberId: string;
  targetMemberName: string;
  targetFarmName: string;
  details: string;
  timestamp: string;
}

export type NewsCategory = 'เอามื้อสามัคคี' | 'อบรมวิชาการ' | 'ตลาดนัดกสิกรรม' | 'ประกาศเครือข่าย';
export type NewsStatus = 'published' | 'hidden';

export interface NewsEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  district: string;
  content: string;
  coverImage: string;
  category: NewsCategory;
  author: string;
  status?: NewsStatus; // 'published' = แสดงผลสาธารณะ, 'hidden' = ซ่อนไว้
  createdAt?: string;
  updatedAt?: string;
}

export const hasAdminRole = (user: MemberProfile | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.roles && user.roles.includes('admin')) return true;
  return false;
};

export const hasMemberRole = (user: MemberProfile | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === 'guest') return false;
  if (user.role === 'member' || user.role === 'admin') return true;
  if (user.roles && (user.roles.includes('member') || user.roles.includes('admin'))) return true;
  return false;
};
