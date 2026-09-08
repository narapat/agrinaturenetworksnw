import {
  MemberProfile,
  Farm,
  Product,
  CategoryTag,
  AuditLog,
  NewsEvent,
  SKUGroup,
  FontSizePref,
} from '@/types';
import {
  INITIAL_MEMBERS,
  INITIAL_FARMS,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORY_TAGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NEWS,
} from '@/data/mockData';

// Local Storage Keys
const STORAGE_KEYS = {
  MEMBERS: 'nsw_members_v1',
  FARMS: 'nsw_farms_v1',
  PRODUCTS: 'nsw_products_v1',
  CATEGORIES: 'nsw_categories_v1',
  LOGS: 'nsw_audit_logs_v1',
  NEWS: 'nsw_news_v1',
  CURRENT_USER: 'nsw_current_user_v1',
};

// State Helper with LocalStorage sync
class DataService {
  private members: MemberProfile[] = [];
  private farms: Farm[] = [];
  private products: Product[] = [];
  private categories: CategoryTag[] = [];
  private auditLogs: AuditLog[] = [];
  private news: NewsEvent[] = [];
  private currentUserId: string = 'guest'; // ค่าเริ่มต้น: ผู้เข้าชมทั่วไป (หากเข้าผ่าน LINE ยังไม่เป็นสมาชิก)

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') {
      this.members = [...INITIAL_MEMBERS];
      this.farms = [...INITIAL_FARMS];
      this.products = [...INITIAL_PRODUCTS];
      this.categories = [...INITIAL_CATEGORY_TAGS];
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
      this.news = [...INITIAL_NEWS];
      return;
    }

    try {
      const storedMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      this.members = storedMembers ? JSON.parse(storedMembers) : [...INITIAL_MEMBERS];

      const storedFarms = localStorage.getItem(STORAGE_KEYS.FARMS);
      this.farms = storedFarms ? JSON.parse(storedFarms) : [...INITIAL_FARMS];

      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      this.products = storedProducts ? JSON.parse(storedProducts) : [...INITIAL_PRODUCTS];

      const storedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      this.categories = storedCategories ? JSON.parse(storedCategories) : [...INITIAL_CATEGORY_TAGS];

      const storedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      this.auditLogs = storedLogs ? JSON.parse(storedLogs) : [...INITIAL_AUDIT_LOGS];

      const storedNews = localStorage.getItem(STORAGE_KEYS.NEWS);
      this.news = storedNews ? JSON.parse(storedNews) : [...INITIAL_NEWS];

      const storedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (storedUser) {
        this.currentUserId = storedUser;
      } else {
        this.currentUserId = 'guest';
      }
    } catch (e) {
      console.error('Error loading data from localStorage', e);
      this.members = [...INITIAL_MEMBERS];
      this.farms = [...INITIAL_FARMS];
      this.products = [...INITIAL_PRODUCTS];
      this.categories = [...INITIAL_CATEGORY_TAGS];
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
      this.news = [...INITIAL_NEWS];
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(this.members));
      localStorage.setItem(STORAGE_KEYS.FARMS, JSON.stringify(this.farms));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(this.auditLogs));
      localStorage.setItem(STORAGE_KEYS.NEWS, JSON.stringify(this.news));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, this.currentUserId);
    } catch (e) {
      console.error('Error saving data to localStorage', e);
    }
  }

  // ==================== SECURITY & ZERO-DATA LEAKAGE ====================
  // คัดกรองข้อมูลก่อนส่งให้บุคคลทั่วไปดู (ตัดเบอร์โทร, LINE ID, และพิกัดจริงทิ้งทั้งหมด)
  private sanitizeFarmForPublic(farm: Farm): Farm {
    const clean = { ...farm };
    // ตัดพิกัดจริงออก 100% เหลือเฉพาะโซนรัศมี
    delete (clean as any).internalCoordinates;
    
    // ตัดเบอร์โทรและ LINE ID ถ้าเจ้าของไม่ได้เปิดเผยสู่สาธารณะ
    if (!clean.isPublicPhone) {
      delete clean.phone;
    }
    if (!clean.isPublicLine) {
      delete clean.lineId;
    }
    return clean;
  }

  private sanitizeProductForPublic(prod: Product): Product {
    const clean = { ...prod };
    if (!clean.isPublicPhone) {
      delete clean.phone;
    }
    if (!clean.isPublicLine) {
      delete clean.lineId;
    }
    return clean;
  }

  // ==================== PRODUCT & SKU GROUPING ====================

  /**
   * ดึงรายการผลผลิตสาธารณะทั้งหมด (ปลอดภัยจากมิจฉาชีพ)
   */
  getPublicProducts(filters?: { district?: string; category?: string; status?: string }): Product[] {
    let result = this.products.map((p) => this.sanitizeProductForPublic(p));

    if (filters?.district && filters.district !== 'ทั้งหมด') {
      result = result.filter((p) => p.district === filters.district);
    }
    if (filters?.category && filters.category !== 'ทั้งหมด') {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters?.status && filters.status !== 'ทั้งหมด') {
      result = result.filter((p) => p.status === filters.status);
    }
    return result;
  }

  /**
   * รวบรวมกลุ่มผลผลิตตาม SKU (Cross-Farm Aggregation)
   * แสดงว่าผลผลิตชนิดนี้ มีจำหน่ายกี่แปลงในนครสวรรค์ ราคาเริ่มต้นเท่าไร มีแจกฟรีไหม
   */
  getGroupedSKUs(filters?: { district?: string; category?: string }): SKUGroup[] {
    const activeProducts = this.getPublicProducts(filters);
    const groupsMap = new Map<string, SKUGroup>();

    this.categories.forEach((cat) => {
      if (!cat.isActive) return;

      const prodsForSku = activeProducts.filter((p) => p.skuTagId === cat.id);
      if (prodsForSku.length === 0) return;

      const farmIds = new Set(prodsForSku.map((p) => p.farmId));
      const districts = Array.from(new Set(prodsForSku.map((p) => p.district)));
      const prices = prodsForSku
        .map((p) => p.price)
        .filter((pr): pr is number => typeof pr === 'number' && pr > 0);

      const hasSharing = prodsForSku.some((p) => p.status === 'share');

      groupsMap.set(cat.id, {
        skuTagId: cat.id,
        name: cat.name,
        category: cat.category,
        categoryName: prodsForSku[0]?.categoryName || 'ผลผลิต',
        icon: cat.icon,
        itemCount: prodsForSku.length,
        farmCount: farmIds.size,
        minPrice: prices.length ? Math.min(...prices) : undefined,
        maxPrice: prices.length ? Math.max(...prices) : undefined,
        hasSharing,
        sampleImage: prodsForSku[0]?.images[0] || '',
        districts,
      });
    });

    return Array.from(groupsMap.values());
  }

  /**
   * ดึงผลผลิตประเภทเดียวกันจากพี่น้องในเครือข่าย (Cross-Farm Showcase)
   * แสดงในหน้ารายละเอียดสินค้าเพื่อส่งเสริมการเกื้อกูลกัน
   */
  getRelatedCrossFarmProducts(currentProductId: string, skuTagId: string): Product[] {
    return this.products
      .filter((p) => p.id !== currentProductId && p.skuTagId === skuTagId)
      .map((p) => this.sanitizeProductForPublic(p));
  }

  getProductById(id: string): Product | undefined {
    const prod = this.products.find((p) => p.id === id);
    return prod ? this.sanitizeProductForPublic(prod) : undefined;
  }

  // ==================== FARM & DIRECTORY ====================

  getPublicFarms(district?: string): Farm[] {
    let result = this.farms.map((f) => this.sanitizeFarmForPublic(f));
    if (district && district !== 'ทั้งหมด') {
      result = result.filter((f) => f.district === district);
    }
    return result;
  }

  getFarmById(id: string): Farm | undefined {
    const farm = this.farms.find((f) => f.id === id);
    return farm ? this.sanitizeFarmForPublic(farm) : undefined;
  }

  // สำหรับผู้ดูแลระบบดูพิกัดจริง (Internal Network Only)
  getInternalFarmById(id: string): Farm | undefined {
    return this.farms.find((f) => f.id === id);
  }

  getProductsByFarmId(farmId: string): Product[] {
    return this.products
      .filter((p) => p.farmId === farmId)
      .map((p) => this.sanitizeProductForPublic(p));
  }

  // ==================== USER PROFILE & PERMISSIONS ====================

  getCurrentUser(): MemberProfile | null {
    if (this.currentUserId === 'guest') {
      return null;
    }
    const user = this.members.find((m) => m.id === this.currentUserId);
    return user || null;
  }

  switchUser(userId: string) {
    this.currentUserId = userId;
    this.save();
  }

  updateFontSizePreference(userId: string, size: FontSizePref) {
    const member = this.members.find((m) => m.id === userId);
    if (member) {
      member.fontSizePref = size;
      this.save();
    }
  }

  updateContactPrivacy(userId: string, isPublicPhone: boolean, isPublicLine: boolean) {
    const member = this.members.find((m) => m.id === userId);
    if (member) {
      member.isPublicPhone = isPublicPhone;
      member.isPublicLine = isPublicLine;

      const farm = this.farms.find((f) => f.id === member.farmId);
      if (farm) {
        farm.isPublicPhone = isPublicPhone;
        farm.isPublicLine = isPublicLine;
      }

      // ซิงค์ไปยังสินค้าของแปลงนี้
      this.products = this.products.map((p) => {
        if (p.farmId === member.farmId) {
          return {
            ...p,
            isPublicPhone,
            isPublicLine,
            phone: isPublicPhone ? member.phone : undefined,
            lineId: isPublicLine ? member.lineId : undefined,
          };
        }
        return p;
      });

      this.save();
    }
  }

  // ==================== MEMBER REGISTRATION ====================

  /**
   * สมาชิกเกษตรกรลงทะเบียนแปลงใหม่ (สถานะเริ่มต้น: รออนุมัติ pending)
   */
  registerNewMember(data: {
    fullName: string;
    facePhotoUrl: string;
    farmName: string;
    tagline?: string;
    story: string;
    district: string;
    subdistrict: string;
    phone: string;
    lineId: string;
    isPublicPhone: boolean;
    isPublicLine: boolean;
    practices: string[];
    coordinates?: { lat: number; lng: number };
    trainingCourse?: string;
    trainingLocation?: string;
  }): { member: MemberProfile; farm: Farm } {
    const memberId = `mem-${Date.now()}`;
    const farmId = `farm-${Date.now()}`;

    const newFarm: Farm = {
      id: farmId,
      memberId: memberId,
      ownerName: data.fullName,
      farmName: data.farmName,
      tagline: data.tagline || 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง',
      story: data.story || 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์',
      photos: [
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop',
      ],
      district: data.district,
      subdistrict: data.subdistrict,
      internalCoordinates: data.coordinates || {
        lat: 15.7 + Math.random() * 0.2,
        lng: 100.0 + Math.random() * 0.2,
      },
      publicZone: {
        name: `โซน ต.${data.subdistrict} อ.${data.district}`,
        approxLat: 15.7 + Math.random() * 0.2,
        approxLng: 100.0 + Math.random() * 0.2,
        radiusKm: 4.0,
      },
      practices: data.practices.length > 0 ? data.practices : ['กสิกรรมธรรมชาติ', 'ไร้สารเคมี 100%'],
      isPublicPhone: data.isPublicPhone,
      isPublicLine: data.isPublicLine,
      phone: data.phone,
      lineId: data.lineId,
      socials: {
        lineId: data.lineId,
      },
    };

    const newMember: MemberProfile = {
      id: memberId,
      fullName: data.fullName,
      facePhotoUrl: data.facePhotoUrl,
      role: 'member',
      status: 'pending', // ต้องให้แอดมินเครือข่ายตรวจสอบและอนุมัติก่อน
      fontSizePref: 'normal',
      phone: data.phone,
      lineId: data.lineId,
      isPublicPhone: data.isPublicPhone,
      isPublicLine: data.isPublicLine,
      isPublicSocials: true,
      socials: {
        lineId: data.lineId,
      },
      delegationStatus: 'none',
      trainingCourse: data.trainingCourse || '',
      trainingLocation: data.trainingLocation || '',
      farmId: farmId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    this.farms.unshift(newFarm);
    this.members.unshift(newMember);
    this.currentUserId = memberId; // สลับผู้ใช้เป็นสมาชิกใหม่ทันที
    this.save();

    return { member: newMember, farm: newFarm };
  }

  // ==================== ASSISTED ENTRY & TRACEABILITY ====================

  /**
   * สมาชิกร้องขอให้แอดมินช่วยลงข้อมูลแทน
   */
  requestAdminAssistance(memberId: string, note: string) {
    const member = this.members.find((m) => m.id === memberId);
    if (member) {
      member.delegationStatus = 'requested';
      member.delegationNote = note;
      this.save();
    }
  }

  /**
   * แอดมินช่วยลงผลผลิตแทนสมาชิก (พร้อมบันทึก Audit Log เพื่อความโปร่งใส)
   */
  adminAssistAddProduct(
    admin: MemberProfile,
    targetMemberId: string,
    productData: Omit<Product, 'id' | 'updatedAt' | 'farmId' | 'farmName' | 'district' | 'subdistrict' | 'isPublicPhone' | 'isPublicLine'>
  ): Product {
    const member = this.members.find((m) => m.id === targetMemberId);
    if (!member) throw new Error('Member not found');

    const farm = this.farms.find((f) => f.id === member.farmId);
    if (!farm) throw new Error('Farm not found');

    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      farmId: farm.id,
      farmName: farm.farmName,
      district: farm.district,
      subdistrict: farm.subdistrict,
      isPublicPhone: farm.isPublicPhone,
      isPublicLine: farm.isPublicLine,
      phone: farm.isPublicPhone ? farm.phone : undefined,
      lineId: farm.isPublicLine ? farm.lineId : undefined,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    this.products.unshift(newProduct);
    member.delegationStatus = 'completed';

    // บันทึก Audit Log
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'assist_create_product',
      performedByAdminId: admin.id,
      performedByAdminName: admin.fullName,
      targetMemberId: member.id,
      targetMemberName: member.fullName,
      targetFarmName: farm.farmName,
      details: `แอดมิน ${admin.fullName} ช่วยลงข้อมูลผลผลิต "${newProduct.title}" ให้กับแปลง ${farm.farmName} ตามคำขอ`,
      timestamp: new Date().toLocaleString('th-TH'),
    };
    this.auditLogs.unshift(newLog);

    this.save();
    return newProduct;
  }

  // สมาชิกลงข้อมูลด้วยตนเอง
  memberAddProduct(productData: Omit<Product, 'id' | 'updatedAt'>): Product {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.products.unshift(newProduct);
    this.save();
    return newProduct;
  }

  updateProductStatus(productId: string, status: Product['status']) {
    const prod = this.products.find((p) => p.id === productId);
    if (prod) {
      prod.status = status;
      prod.updatedAt = new Date().toISOString().split('T')[0];
      this.save();
    }
  }

  // ==================== ADMIN: CATEGORIES & MEMBERS ====================

  getCategories(): CategoryTag[] {
    return this.categories;
  }

  addCategoryTag(category: Omit<CategoryTag, 'id'>): CategoryTag {
    const newCat: CategoryTag = {
      ...category,
      id: `sku-${Date.now()}`,
    };
    this.categories.push(newCat);
    this.save();
    return newCat;
  }

  toggleCategoryStatus(catId: string) {
    const cat = this.categories.find((c) => c.id === catId);
    if (cat) {
      cat.isActive = !cat.isActive;
      this.save();
    }
  }

  getPendingMembers(): MemberProfile[] {
    return this.members.filter((m) => m.status === 'pending');
  }

  getAllMembers(): MemberProfile[] {
    return this.members;
  }

  approveMember(admin: MemberProfile, memberId: string) {
    const member = this.members.find((m) => m.id === memberId);
    if (member) {
      member.status = 'approved';

      const farm = this.farms.find((f) => f.id === member.farmId);
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        action: 'approve_member',
        performedByAdminId: admin.id,
        performedByAdminName: admin.fullName,
        targetMemberId: member.id,
        targetMemberName: member.fullName,
        targetFarmName: farm?.farmName || 'แปลงใหม่',
        details: `แอดมิน ${admin.fullName} อนุมัติการเป็นสมาชิกของ ${member.fullName} (${farm?.farmName || ''}) ผ่านการตรวจรูปหน้าและยืนยันตัวตน`,
        timestamp: new Date().toLocaleString('th-TH'),
      };
      this.auditLogs.unshift(newLog);
      this.save();
    }
  }

  getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  // ==================== NEWS & EVENTS ====================

  getNews(): NewsEvent[] {
    return this.news;
  }

  addNews(event: Omit<NewsEvent, 'id'>): NewsEvent {
    const newItem: NewsEvent = {
      ...event,
      id: `news-${Date.now()}`,
    };
    this.news.unshift(newItem);
    this.save();
    return newItem;
  }
}

export const dataService = new DataService();
