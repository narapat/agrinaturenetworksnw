import {
  MemberProfile,
  Farm,
  Product,
  CategoryTag,
  AuditLog,
  NewsEvent,
  NewsStatus,
  NewsCategory,
  SKUGroup,
  FontSizePref,
  UserRole,
  hasAdminRole,
} from '@/types';
import {
  INITIAL_MEMBERS,
  INITIAL_FARMS,
  INITIAL_PRODUCTS,
  INITIAL_CATEGORY_TAGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NEWS,
} from '@/data/mockData';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

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

// รายชื่อบัญชีทดสอบระบบ (Demo Profiles) เท่านั้น - ห้ามแสดงสมาชิกจริงที่ลงทะเบียนใหม่
export const DEMO_MEMBER_IDS = [
  'mem-001', // ลุงสมชาย
  'mem-002', // ป้าปราณี
  'mem-003', // ครูบุญชู
  'mem-004', // พี่ชัยณรงค์
  'mem-005', // น้องกานต์
  'admin-001', // นพรัตน์ แอดมิน
];

// State Helper with LocalStorage + Firebase Firestore sync
class DataService {
  private members: MemberProfile[] = [];
  private farms: Farm[] = [];
  private products: Product[] = [];
  private categories: CategoryTag[] = [];
  private auditLogs: AuditLog[] = [];
  private news: NewsEvent[] = [];
  private currentUserId: string = 'guest'; // ค่าเริ่มต้น: ผู้เข้าชมทั่วไป (หากเข้าผ่าน LINE ยังไม่เป็นสมาชิก)
  private isFirestoreSynced: boolean = false;
  private syncPromise: Promise<void> | null = null;

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

      // หากเปิดเข้ามาในเซสชันแอดมินที่ผ่านการพิสูจน์รหัสแล้ว และสถานะยังเป็น guest ให้เริ่มต้นเป็น admin-001 ทันที
      if (this.isAdminSession() && (this.currentUserId === 'guest' || !this.currentUserId)) {
        this.currentUserId = 'admin-001';
      }

      // Ensure all standard initial categories (especially tool categories) exist in local state
      for (const initCat of INITIAL_CATEGORY_TAGS) {
        const existingCat = this.categories.find((c) => c.id === initCat.id);
        if (!existingCat) {
          this.categories.push(initCat);
        } else if (existingCat.category !== initCat.category) {
          existingCat.category = initCat.category;
        }
      }

      // Ensure standard products exist
      for (const initProd of INITIAL_PRODUCTS) {
        if (!this.products.some((p) => p.id === initProd.id)) {
          this.products.push(initProd);
        }
      }

      // Ensure all members have roles array properly initialized
      for (const m of this.members) {
        if (!m.roles || m.roles.length === 0) {
          m.roles = m.role === 'admin' ? ['member', 'admin'] : ['member'];
        }
      }

      // Ensure farm-admin exists so admin has their own farm
      for (const initFarm of INITIAL_FARMS) {
        if (!this.farms.some((f) => f.id === initFarm.id)) {
          this.farms.push(initFarm);
        }
      }

      // Ensure all news have status field properly initialized and new sample events exist
      for (const initN of INITIAL_NEWS) {
        const existing = this.news.find((n) => n.id === initN.id);
        if (!existing) {
          this.news.push(initN);
        }
      }
      this.news = this.news.map((item) => ({
        ...item,
        status: item.status || 'published',
      }));

      // Background Firestore Sync
      setTimeout(() => {
        this.syncWithFirestore();
      }, 300);
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
      this.dispatchDataUpdated();
    } catch (e) {
      console.error('Error saving data to localStorage', e);
    }
  }

  public dispatchDataUpdated() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
  }

  // ==================== FIRESTORE REAL-TIME SYNC ====================

  /**
   * รับประกันว่าข้อมูลจาก Cloud Firestore ถูกซิงค์เรียบร้อยแล้ว
   */
  async ensureFirestoreSync(): Promise<void> {
    if (typeof window === 'undefined' || !db) return;
    if (this.isFirestoreSynced) return;
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.syncWithFirestore();
    return this.syncPromise;
  }

  /**
   * ซิงค์ข้อมูลกับ Cloud Firestore แบบ 2 ทาง (Auto-seed ครั้งแรก และดึงข้อมูลล่าสุด)
   */
  private async syncWithFirestore() {
    if (typeof window === 'undefined' || !db || this.isFirestoreSynced) return;
    try {
      const productsSnap = await getDocs(collection(db, 'products'));

      if (productsSnap.empty) {
        // ครั้งแรก: นำข้อมูลเริ่มต้น Seed เข้าสู่ Cloud Firestore อัตโนมัติ
        console.log('🌾 Initializing Cloud Firestore seed data for Agri-Nature Nakhon Sawan...');
        for (const p of INITIAL_PRODUCTS) {
          await setDoc(doc(db, 'products', p.id), this.cleanForFirestore(p));
        }
        for (const m of INITIAL_MEMBERS) {
          await setDoc(doc(db, 'members', m.id), this.cleanForFirestore(m));
        }
        for (const f of INITIAL_FARMS) {
          await setDoc(doc(db, 'farms', f.id), this.cleanForFirestore(f));
        }
        for (const c of INITIAL_CATEGORY_TAGS) {
          await setDoc(doc(db, 'categories', c.id), this.cleanForFirestore(c));
        }
        for (const n of INITIAL_NEWS) {
          await setDoc(doc(db, 'news', n.id), this.cleanForFirestore(n));
        }
        for (const l of INITIAL_AUDIT_LOGS) {
          await setDoc(doc(db, 'auditLogs', l.id), this.cleanForFirestore(l));
        }
        console.log('✅ Firestore seed completed!');
      } else {
        // ดึงข้อมูลจริงล่าสุดจาก Cloud Firestore ซิงค์เข้าเครื่องแบบผสาน (Merge) เพื่อไม่ให้ทับสถานะที่แอดมินอนุมัติไปแล้ว
        const remoteProds = productsSnap.docs.map((d) => d.data() as Product);
        if (remoteProds.length > 0) {
          const remoteProdMap = new Map(remoteProds.map((p) => [p.id, p]));
          this.products = this.products.map((localP) => {
            const remoteP = remoteProdMap.get(localP.id);
            return remoteP ? { ...remoteP, ...localP } : localP;
          });
          for (const rp of remoteProds) {
            if (!this.products.some((p) => p.id === rp.id)) {
              this.products.push(rp);
            }
          }
        }

        const membersSnap = await getDocs(collection(db, 'members'));
        if (!membersSnap.empty) {
          const remoteMembers = membersSnap.docs.map((d) => d.data() as MemberProfile);
          const remoteMemMap = new Map(remoteMembers.map((m) => [m.id, m]));

          this.members = this.members.map((localM) => {
            const remoteM = remoteMemMap.get(localM.id);
            if (!remoteM) return localM;
            // จุดสำคัญ: ถ้าสมาชิกได้รับการอนุมัติในเครื่องแล้ว ห้ามโดนข้อมูลเก่าใน Firestore ทับกลับเป็น pending!
            if (localM.status === 'approved') {
              if (remoteM.status !== 'approved') {
                this.firestoreUpdate('members', localM.id, { status: 'approved' });
              }
              return { ...remoteM, ...localM, status: 'approved' };
            }
            return { ...localM, ...remoteM };
          });

          for (const rm of remoteMembers) {
            if (!this.members.some((m) => m.id === rm.id)) {
              this.members.push(rm);
            }
          }
        }

        const farmsSnap = await getDocs(collection(db, 'farms'));
        if (!farmsSnap.empty) {
          const remoteFarms = farmsSnap.docs.map((d) => d.data() as Farm);
          const remoteFarmMap = new Map(remoteFarms.map((f) => [f.id, f]));

          this.farms = this.farms.map((localF) => {
            const remoteF = remoteFarmMap.get(localF.id);
            return remoteF ? { ...remoteF, ...localF } : localF;
          });

          for (const rf of remoteFarms) {
            if (!this.farms.some((f) => f.id === rf.id)) {
              this.farms.push(rf);
            }
          }
        }

        const categoriesSnap = await getDocs(collection(db, 'categories'));
        if (!categoriesSnap.empty) {
          const remoteCats = categoriesSnap.docs.map((d) => d.data() as CategoryTag);
          for (const rc of remoteCats) {
            if (!this.categories.some((c) => c.id === rc.id)) {
              this.categories.push(rc);
            }
          }
        }

        // Push initial categories (including tools) to Firestore
        for (const initCat of INITIAL_CATEGORY_TAGS) {
          if (!this.categories.some((c) => c.id === initCat.id)) {
            this.categories.push(initCat);
          }
          this.firestoreSet('categories', initCat.id, initCat);
        }

        const logsSnap = await getDocs(collection(db, 'auditLogs'));
        if (!logsSnap.empty) {
          const remoteLogs = logsSnap.docs.map((d) => d.data() as AuditLog);
          for (const rl of remoteLogs) {
            if (!this.auditLogs.some((l) => l.id === rl.id)) {
              this.auditLogs.push(rl);
            }
          }
        }

        const newsSnap = await getDocs(collection(db, 'news'));
        if (!newsSnap.empty) {
          const remoteNews = newsSnap.docs.map((d) => d.data() as NewsEvent);
          if (remoteNews.length > 0) {
            this.news = remoteNews;
          }
        }

        this.save();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('nsw_data_updated'));
        }
      }

      this.isFirestoreSynced = true;
    } catch (err) {
      console.warn('Firestore sync running in offline-first mode:', err);
    }
  }

  // ป้องกัน undefined values ซึ่งทำให้ Firestore error
  private cleanForFirestore(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    const result: any = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        result[key] = typeof val === 'object' && val !== null ? this.cleanForFirestore(val) : val;
      }
    }
    return result;
  }

  private async firestoreSet(collectionName: string, id: string, data: any) {
    if (typeof window === 'undefined' || !db) return;
    try {
      await setDoc(doc(db, collectionName, id), this.cleanForFirestore(data));
    } catch (e) {
      console.warn(`Firestore set error [${collectionName}/${id}]:`, e);
    }
  }

  private async firestoreUpdate(collectionName: string, id: string, data: any) {
    if (typeof window === 'undefined' || !db) return;
    try {
      await updateDoc(doc(db, collectionName, id), this.cleanForFirestore(data));
    } catch (e) {
      console.warn(`Firestore update error [${collectionName}/${id}]:`, e);
    }
  }

  private async firestoreDelete(collectionName: string, id: string) {
    if (typeof window === 'undefined' || !db) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.warn(`Firestore delete error [${collectionName}/${id}]:`, e);
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
    // กรองสินค้าสถานะ 'hidden' (ไม่แสดง) ออกจากตลาด e-Catalog สาธารณะ 100%
    let result = this.products
      .filter((p) => p.status !== 'hidden')
      .map((p) => this.sanitizeProductForPublic(p));

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
        categoryName: prodsForSku[0]?.categoryName || (
          cat.category === 'smartfarm' ? 'สมาร์ทฟาร์ม (Smart Farm)' :
          cat.category === 'tool' ? 'อุปกรณ์ เครื่องมือ' :
          cat.category === 'byproduct' ? 'ปัจจัยการผลิต/By-product' :
          cat.category === 'seed' ? 'เมล็ดพันธุ์/กิ่งพันธุ์' :
          cat.category === 'processed' ? 'แปรรูป' : 'ผลผลิตสด'
        ),
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

  // ดึงข้อมูลสินค้าตัวเต็มสำหรับเจ้าของหรือแอดมินแก้ไขข้อมูล
  getRawProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
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

  getFarmByMemberId(memberId: string): Farm | undefined {
    const farm = this.farms.find((f) => f.memberId === memberId);
    return farm ? this.sanitizeFarmForPublic(farm) : undefined;
  }

  // สำหรับผู้ดูแลระบบดูพิกัดจริง (Internal Network Only)
  getInternalFarmById(id: string): Farm | undefined {
    return this.farms.find((f) => f.id === id);
  }

  getProductsByFarmId(farmId: string, includeHidden = false): Product[] {
    return this.products
      .filter((p) => p.farmId === farmId && (includeHidden || p.status !== 'hidden'))
      .map((p) => this.sanitizeProductForPublic(p));
  }

  // ==================== USER PROFILE & PERMISSIONS ====================

  /**
   * ตรวจสอบว่าปัจจุบันอยู่ในเซสชันผู้ดูแลระบบ (Admin) หรือไม่
   */
  isAdminSession(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return (
        sessionStorage.getItem('nsw_admin_session_token') === 'authenticated' ||
        localStorage.getItem('nsw_admin_session_token') === 'authenticated'
      );
    } catch {
      return false;
    }
  }

  /**
   * ตั้งค่าเซสชันผู้ดูแลระบบ
   */
  setAdminSession(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('nsw_admin_session_token', 'authenticated');
      localStorage.setItem('nsw_admin_session_token', 'authenticated');
    } catch {}
  }

  /**
   * ล้างเซสชันผู้ดูแลระบบ
   */
  clearAdminSession(): void {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem('nsw_admin_session_token');
      localStorage.removeItem('nsw_admin_session_token');
    } catch {}
  }

  getCurrentUser(): MemberProfile | null {
    if (this.currentUserId === 'guest') {
      // หากอยู่ในเซสชันแอดมิน ให้ดึงบัญชีแอดมินหลัก 'admin-001'
      if (this.isAdminSession()) {
        const admin = this.members.find((m) => m.id === 'admin-001');
        if (admin) return admin;
      }
      return null;
    }
    const user = this.members.find((m) => m.id === this.currentUserId);
    if (user && this.isAdminSession() && !hasAdminRole(user)) {
      // หากผู้ใช้อยู่ในเซสชันแอดมิน ให้มอบสิทธิ์ admin ควบคู่ทันที
      user.roles = Array.from(new Set<UserRole>([...(user.roles || []), 'member', 'admin']));
      user.role = 'admin';
    }
    return user || null;
  }

  // ดึงเฉพาะบัญชีทดสอบระบบ (Demo Profiles) เท่านั้น ห้ามส่งสมาชิกจริง
  getDemoMembers(): MemberProfile[] {
    return this.members.filter((m) => DEMO_MEMBER_IDS.includes(m.id));
  }

  switchUser(userId: string) {
    // ป้องกันความปลอดภัย: อนุญาตให้สลับเฉพาะบัญชีทดสอบหรือ guest เท่านั้น ห้ามสลับไปยังบัญชีสมาชิกจริง
    if (userId !== 'guest' && !DEMO_MEMBER_IDS.includes(userId)) {
      console.warn('Security: Cannot switch to non-demo member account via demo switcher');
      return;
    }
    this.currentUserId = userId;
    this.save();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
  }

  // เข้าสู่ระบบในฐานะสมาชิกจริง (เช่น ผ่าน LINE Login หรือหลังสมัครสมาชิก)
  loginAsMember(userId: string): MemberProfile | null {
    const member = this.members.find((m) => m.id === userId);
    if (!member) return null;
    this.currentUserId = member.id;
    this.save();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
    return member;
  }

  // ตรวจสอบหรือเข้าสู่ระบบด้วยข้อมูลจาก LINE Profile (LINE Login / LIFF)
  loginWithLineProfile(profile: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }): { member: MemberProfile | null; isRegistered: boolean } {
    // 1. ค้นหาสมาชิกเดิมที่มี lineUserId ตรงกัน
    let member = this.members.find((m) => m.lineUserId === profile.userId);

    // 2. ถ้าไม่พบ ลองค้นหาด้วย lineId หรือชื่อ (Smart & Partial Matching)
    if (!member && profile.displayName) {
      const cleanName = profile.displayName.trim().toLowerCase();
      const firstWord = cleanName.split(/[\s/\\_-]+/)[0].trim();

      member = this.members.find((m) => {
        const mLineId = (m.lineId || '').trim().toLowerCase();
        const mFullName = (m.fullName || '').trim().toLowerCase();

        // ตรงกันเป๊ะ
        if (mLineId && (mLineId === cleanName || mLineId === profile.userId)) return true;
        if (mFullName && mFullName === cleanName) return true;

        // Smart Partial Matching:
        // ตัวอย่าง: LINE ชื่อ "Narapat /E24YVI" แต่ในระบบกรอก lineId: "narapat"
        if (firstWord && firstWord.length >= 3) {
          if (mLineId && (mLineId === firstWord || cleanName.startsWith(mLineId))) return true;
          if (mFullName && (mFullName === firstWord || cleanName.startsWith(mFullName))) return true;
        }

        return false;
      });
    }

    if (member) {
      let changed = false;
      if (!member.lineUserId || member.lineUserId !== profile.userId) {
        member.lineUserId = profile.userId;
        changed = true;
      }
      if (profile.pictureUrl && (!member.facePhotoUrl || member.facePhotoUrl.includes('unsplash'))) {
        member.facePhotoUrl = profile.pictureUrl;
        changed = true;
      }
      // หากอยู่ในเซสชันแอดมิน ให้มอบสิทธิ์ admin ให้สมาชิกบัญชีนี้ทันที
      if (this.isAdminSession() && !hasAdminRole(member)) {
        member.roles = Array.from(new Set<UserRole>([...(member.roles || []), 'member', 'admin']));
        member.role = 'admin';
        changed = true;
      }
      const wasDifferentUser = this.currentUserId !== member.id;
      this.currentUserId = member.id;
      if (changed || wasDifferentUser) {
        this.save();
        if (changed) {
          this.firestoreUpdate('members', member.id, {
            lineUserId: member.lineUserId,
            facePhotoUrl: member.facePhotoUrl,
            role: member.role,
            roles: member.roles,
          });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('nsw_data_updated'));
        }
      }
      return { member, isRegistered: true };
    }

    // 3. หากยังไม่เคยเป็นสมาชิก:
    // ห้ามคงสถานะ currentUserId เป็น demo account อื่น (เช่น mem-001) เพราะจะทำให้ระบบสับสน
    // ยกเว้นกรณีอยู่ในเซสชันแอดมิน และ currentUserId คือ admin-001 ห้ามรีเซ็ตเป็น guest!
    if (this.currentUserId && DEMO_MEMBER_IDS.includes(this.currentUserId)) {
      if (!this.isAdminSession() || this.currentUserId !== 'admin-001') {
        this.currentUserId = 'guest';
        this.save();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('nsw_data_updated'));
        }
      }
    }
    return { member: null, isRegistered: false };
  }

  // เข้าสู่ระบบด้วย LINE Profile แบบ Async โดยรับประกันว่าข้อมูลจาก Firestore ถูกซิงค์แล้ว
  async loginWithLineProfileAsync(profile: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }): Promise<{ member: MemberProfile | null; isRegistered: boolean }> {
    // 1. รอซิงค์ข้อมูลจาก Cloud Firestore ให้สมบูรณ์ก่อน
    await this.ensureFirestoreSync();

    // 2. ตรวจสอบในหน่วยความจำ
    const res = this.loginWithLineProfile(profile);
    if (res.isRegistered && res.member) {
      return res;
    }

    // 3. ป้องกันกรณี Firestore มีข้อมูลสมาชิกใหม่แต่ยังไม่ได้รวมเข้า this.members
    if (db) {
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        // 3.1 ค้นหาด้วย lineUserId
        const q = query(collection(db, 'members'), where('lineUserId', '==', profile.userId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteMem = snap.docs[0].data() as MemberProfile;
          if (this.isAdminSession() && !hasAdminRole(remoteMem)) {
            remoteMem.roles = Array.from(new Set<UserRole>([...(remoteMem.roles || []), 'member', 'admin']));
            remoteMem.role = 'admin';
          }
          if (!this.members.some((m) => m.id === remoteMem.id)) {
            this.members.unshift(remoteMem);
          }
          this.currentUserId = remoteMem.id;
          this.save();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('nsw_data_updated'));
          }
          return { member: remoteMem, isRegistered: true };
        }

        // 3.2 ค้นหาด้วย Smart lineId (เช่น narapat)
        if (profile.displayName) {
          const cleanName = profile.displayName.trim().toLowerCase();
          const firstWord = cleanName.split(/[\s/\\_-]+/)[0].trim();
          if (firstWord && firstWord.length >= 3) {
            const qLineId = query(collection(db, 'members'), where('lineId', '==', firstWord));
            const snapLineId = await getDocs(qLineId);
            if (!snapLineId.empty) {
              const remoteMem = snapLineId.docs[0].data() as MemberProfile;
              remoteMem.lineUserId = profile.userId;
              if (this.isAdminSession() && !hasAdminRole(remoteMem)) {
                remoteMem.roles = Array.from(new Set<UserRole>([...(remoteMem.roles || []), 'member', 'admin']));
                remoteMem.role = 'admin';
              }
              if (!this.members.some((m) => m.id === remoteMem.id)) {
                this.members.unshift(remoteMem);
              } else {
                const idx = this.members.findIndex((m) => m.id === remoteMem.id);
                if (idx !== -1) {
                  this.members[idx].lineUserId = profile.userId;
                  if (this.isAdminSession()) {
                    this.members[idx].role = 'admin';
                    this.members[idx].roles = remoteMem.roles;
                  }
                }
              }
              this.currentUserId = remoteMem.id;
              this.save();
              this.firestoreUpdate('members', remoteMem.id, { 
                lineUserId: profile.userId,
                role: remoteMem.role,
                roles: remoteMem.roles,
              });
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('nsw_data_updated'));
              }
              return { member: remoteMem, isRegistered: true };
            }
          }
        }
      } catch (err) {
        console.warn('Direct Firestore query notice:', err);
      }
    }

    return res;
  }

  updateFontSizePreference(userId: string, size: FontSizePref) {
    const member = this.members.find((m) => m.id === userId);
    if (member) {
      member.fontSizePref = size;
      this.save();
      this.firestoreUpdate('members', userId, { fontSizePref: size });
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
        this.firestoreUpdate('farms', farm.id, { isPublicPhone, isPublicLine });
      }

      // ซิงค์ไปยังสินค้าของแปลงนี้
      this.products = this.products.map((p) => {
        if (p.farmId === member.farmId) {
          const updated = {
            ...p,
            isPublicPhone,
            isPublicLine,
            phone: isPublicPhone ? member.phone : undefined,
            lineId: isPublicLine ? member.lineId : undefined,
          };
          this.firestoreUpdate('products', p.id, {
            isPublicPhone,
            isPublicLine,
            phone: isPublicPhone ? member.phone : null,
            lineId: isPublicLine ? member.lineId : null,
          });
          return updated;
        }
        return p;
      });

      this.save();
      this.firestoreUpdate('members', userId, { isPublicPhone, isPublicLine });
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
    lineUserId?: string;
    isPublicPhone: boolean;
    isPublicLine: boolean;
    practices: string[];
    coordinates?: { lat: number; lng: number };
    trainingCourse?: string;
    trainingLocation?: string;
    photos?: string[];
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
      photos: data.photos && data.photos.length > 0 ? data.photos : [
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
      lineUserId: data.lineUserId || '',
      fullName: data.fullName,
      facePhotoUrl: data.facePhotoUrl,
      role: 'member',
      roles: ['member'],
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

    // ซิงค์ไปยัง Cloud Firestore
    this.firestoreSet('farms', newFarm.id, newFarm);
    this.firestoreSet('members', newMember.id, newMember);

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
      this.firestoreUpdate('members', memberId, { delegationStatus: 'requested', delegationNote: note });
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

    // ซิงค์ไปยัง Cloud Firestore
    this.firestoreSet('products', newProduct.id, newProduct);
    this.firestoreUpdate('members', member.id, { delegationStatus: 'completed' });
    this.firestoreSet('auditLogs', newLog.id, newLog);

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
    this.firestoreSet('products', newProduct.id, newProduct);
    return newProduct;
  }

  updateProductStatus(productId: string, status: Product['status']) {
    const prod = this.products.find((p) => p.id === productId);
    if (prod) {
      prod.status = status;
      prod.updatedAt = new Date().toISOString().split('T')[0];
      this.save();
      this.firestoreUpdate('products', productId, { status, updatedAt: prod.updatedAt });
    }
  }

  // แก้ไขข้อมูลผลผลิตที่ลงไปแล้ว (ชื่อ, ราคา, หมวดหมู่, รูปภาพ, สถานะ, คำอธิบาย)
  updateProduct(productId: string, updatedData: Partial<Product>): Product | null {
    const index = this.products.findIndex((p) => p.id === productId);
    if (index === -1) return null;

    const existing = this.products[index];
    const updated: Product = {
      ...existing,
      ...updatedData,
      id: existing.id,
      farmId: existing.farmId,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    this.products[index] = updated;
    this.save();
    this.firestoreUpdate('products', productId, updated);
    return updated;
  }

  // ลบผลผลิตออกจากระบบ
  deleteProduct(productId: string): boolean {
    const initialLen = this.products.length;
    this.products = this.products.filter((p) => p.id !== productId);
    if (this.products.length !== initialLen) {
      this.save();
      this.firestoreDelete('products', productId);
      return true;
    }
    return false;
  }

  // แก้ไขข้อมูลแปลงกสิกรรม (ชื่อแปลง, คำขวัญ, เรื่องเล่า, อำเภอ, ตำบล, แนวทางปฏิบัติ)
  updateFarm(farmId: string, updatedData: Partial<Farm>): Farm | null {
    const farm = this.farms.find((f) => f.id === farmId);
    if (!farm) return null;

    Object.assign(farm, updatedData);

    // ซิงค์ชื่อแปลง อำเภอ ตำบล ไปยังสินค้าของแปลงนี้
    if (updatedData.farmName || updatedData.district || updatedData.subdistrict) {
      this.products = this.products.map((p) => {
        if (p.farmId === farmId) {
          const updatedP = {
            ...p,
            farmName: farm.farmName,
            district: farm.district,
            subdistrict: farm.subdistrict,
          };
          this.firestoreUpdate('products', p.id, {
            farmName: farm.farmName,
            district: farm.district,
            subdistrict: farm.subdistrict,
          });
          return updatedP;
        }
        return p;
      });
    }

    this.save();
    this.firestoreUpdate('farms', farmId, farm);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
    return farm;
  }

  // สร้างแปลงกสิกรรมใหม่สำหรับสมาชิกที่ยังไม่มีแปลง
  createFarm(
    memberId: string,
    farmData: {
      farmName: string;
      tagline?: string;
      story: string;
      district: string;
      subdistrict: string;
      photos?: string[];
      practices?: string[];
      coordinates?: { lat: number; lng: number };
      phone?: string;
      lineId?: string;
      isPublicPhone?: boolean;
      isPublicLine?: boolean;
    }
  ): Farm {
    const member = this.members.find((m) => m.id === memberId);
    const farmId = `farm-${Date.now()}`;
    const newFarm: Farm = {
      id: farmId,
      memberId: memberId,
      ownerName: member ? member.fullName : 'สมาชิกเครือข่าย',
      farmName: farmData.farmName,
      tagline: farmData.tagline || 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง',
      story: farmData.story || 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์',
      photos: farmData.photos && farmData.photos.length > 0 ? farmData.photos : [
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop',
      ],
      district: farmData.district,
      subdistrict: farmData.subdistrict,
      internalCoordinates: farmData.coordinates || {
        lat: 15.7 + Math.random() * 0.2,
        lng: 100.0 + Math.random() * 0.2,
      },
      publicZone: {
        name: `โซน ต.${farmData.subdistrict} อ.${farmData.district}`,
        approxLat: 15.7 + Math.random() * 0.2,
        approxLng: 100.0 + Math.random() * 0.2,
        radiusKm: 4.0,
      },
      practices: farmData.practices && farmData.practices.length > 0 ? farmData.practices : ['กสิกรรมธรรมชาติ', 'ไร้สารเคมี 100%'],
      isPublicPhone: farmData.isPublicPhone !== undefined ? farmData.isPublicPhone : (member?.isPublicPhone ?? false),
      isPublicLine: farmData.isPublicLine !== undefined ? farmData.isPublicLine : (member?.isPublicLine ?? true),
      phone: farmData.phone || member?.phone || '',
      lineId: farmData.lineId || member?.lineId || '',
      socials: {
        lineId: farmData.lineId || member?.lineId || '',
      },
    };

    this.farms.unshift(newFarm);
    if (member) {
      member.farmId = farmId;
      this.firestoreUpdate('members', member.id, { farmId });
    }
    this.save();
    this.firestoreSet('farms', farmId, newFarm);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
    return newFarm;
  }

  // อัปเดตข้อมูลสมาชิก
  updateMember(memberId: string, updatedData: Partial<MemberProfile>): MemberProfile | null {
    const member = this.members.find((m) => m.id === memberId);
    if (!member) return null;
    Object.assign(member, updatedData);
    this.save();
    this.firestoreUpdate('members', memberId, updatedData);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
    return member;
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
    this.firestoreSet('categories', newCat.id, newCat);
    return newCat;
  }

  toggleCategoryStatus(catId: string) {
    const cat = this.categories.find((c) => c.id === catId);
    if (cat) {
      cat.isActive = !cat.isActive;
      this.save();
      this.firestoreUpdate('categories', catId, { isActive: cat.isActive });
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
      const adminId = admin?.id || 'admin-001';
      const adminName = admin?.fullName || 'แอดมินเครือข่าย';

      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        action: 'approve_member',
        performedByAdminId: adminId,
        performedByAdminName: adminName,
        targetMemberId: member.id,
        targetMemberName: member.fullName,
        targetFarmName: farm?.farmName || 'แปลงใหม่',
        details: `แอดมิน ${adminName} อนุมัติการเป็นสมาชิกของ ${member.fullName} (${farm?.farmName || ''}) ผ่านการตรวจรูปหน้าและยืนยันตัวตน`,
        timestamp: new Date().toLocaleString('th-TH'),
      };
      this.auditLogs.unshift(newLog);
      this.save();

      this.firestoreUpdate('members', memberId, { status: 'approved' });
      this.firestoreSet('auditLogs', newLog.id, newLog);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nsw_data_updated'));
      }
    }
  }

  getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  // ==================== NEWS & EVENTS ====================

  getNews(includeHidden: boolean = false): NewsEvent[] {
    if (includeHidden) {
      return this.news;
    }
    return this.news.filter((n) => n.status !== 'hidden');
  }

  getNewsById(id: string): NewsEvent | undefined {
    return this.news.find((n) => n.id === id);
  }

  addNews(event: Omit<NewsEvent, 'id'>): NewsEvent {
    const actor = this.getCurrentUser();
    const newItem: NewsEvent = {
      ...event,
      id: `news-${Date.now()}`,
      status: event.status || 'published',
      createdAt: event.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.news.unshift(newItem);
    this.save();
    this.firestoreSet('news', newItem.id, newItem);

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      action: 'create_news',
      performedByAdminId: actor ? actor.id : 'admin-001',
      performedByAdminName: actor ? actor.fullName : 'แอดมินเครือข่าย',
      targetMemberId: 'network-broadcast',
      targetMemberName: 'เครือข่ายกสิกรรมธรรมชาตินครสวรรค์',
      targetFarmName: newItem.location,
      details: `ลงประกาศกิจกรรมใหม่: "${newItem.title}" (${newItem.category}) สถานะ: ${newItem.status === 'hidden' ? 'ซ่อนไว้' : 'เผยแพร่อยู่'}`,
      timestamp: new Date().toLocaleString('th-TH'),
    });
    this.save();

    return newItem;
  }

  updateNews(id: string, updates: Partial<Omit<NewsEvent, 'id'>>): NewsEvent | null {
    const idx = this.news.findIndex((n) => n.id === id);
    if (idx === -1) return null;

    const actor = this.getCurrentUser();
    const existing = this.news[idx];
    const updatedItem: NewsEvent = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.news[idx] = updatedItem;
    this.save();
    this.firestoreUpdate('news', id, updatedItem);

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      action: 'update_news',
      performedByAdminId: actor ? actor.id : 'admin-001',
      performedByAdminName: actor ? actor.fullName : 'แอดมินเครือข่าย',
      targetMemberId: 'network-broadcast',
      targetMemberName: 'เครือข่ายกสิกรรมธรรมชาตินครสวรรค์',
      targetFarmName: updatedItem.location,
      details: `แก้ไขข้อมูลประกาศกิจกรรม: "${updatedItem.title}" สถานะ: ${updatedItem.status === 'hidden' ? 'ซ่อนไว้' : 'เผยแพร่อยู่'}`,
      timestamp: new Date().toLocaleString('th-TH'),
    });
    this.save();

    return updatedItem;
  }

  toggleNewsStatus(id: string): NewsEvent | null {
    const item = this.news.find((n) => n.id === id);
    if (!item) return null;
    const newStatus: NewsStatus = item.status === 'hidden' ? 'published' : 'hidden';
    return this.updateNews(id, { status: newStatus });
  }

  deleteNews(id: string): boolean {
    const idx = this.news.findIndex((n) => n.id === id);
    if (idx === -1) return false;
    const deleted = this.news[idx];
    const actor = this.getCurrentUser();

    this.news.splice(idx, 1);
    this.save();
    this.firestoreDelete('news', id);

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      action: 'delete_news',
      performedByAdminId: actor ? actor.id : 'admin-001',
      performedByAdminName: actor ? actor.fullName : 'แอดมินเครือข่าย',
      targetMemberId: 'network-broadcast',
      targetMemberName: 'เครือข่ายกสิกรรมธรรมชาตินครสวรรค์',
      targetFarmName: deleted.location,
      details: `ลบประกาศกิจกรรม: "${deleted.title}" ออกจากระบบ`,
      timestamp: new Date().toLocaleString('th-TH'),
    });
    this.save();

    return true;
  }

  // ==================== ROLE ASSIGNMENT ====================

  assignAdminRole(memberId: string, makeAdmin: boolean): boolean {
    const member = this.members.find((m) => m.id === memberId);
    if (!member) return false;
    if (member.status !== 'approved') return false; // เฉพาะสมาชิกที่ผ่านการอนุมัติแล้วเท่านั้น

    const currentRoles = member.roles && member.roles.length > 0 
      ? [...member.roles] 
      : [member.role || 'member'];

    let newRoles: UserRole[];
    if (makeAdmin) {
      newRoles = Array.from(new Set<UserRole>([...currentRoles, 'member', 'admin']));
      member.role = 'admin'; // เพื่อ backward compatibility
    } else {
      newRoles = currentRoles.filter((r) => r !== 'admin');
      if (newRoles.length === 0) newRoles = ['member'];
      member.role = 'member';
    }
    member.roles = newRoles;

    this.save();
    this.firestoreUpdate('members', memberId, { role: member.role, roles: member.roles });

    // บันทึกประวัติการมอบ/ถอนสิทธิ์เข้า Audit Logs
    const actor = this.getCurrentUser();
    const farm = this.farms.find((f) => f.memberId === member.id) || this.getFarmById(member.farmId);
    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      action: makeAdmin ? 'assign_admin' : 'revoke_admin',
      performedByAdminId: actor ? actor.id : 'admin-001',
      performedByAdminName: actor ? actor.fullName : 'แอดมินเครือข่าย',
      targetMemberId: member.id,
      targetMemberName: member.fullName,
      targetFarmName: farm?.farmName || 'แปลงสมาชิก',
      details: `${makeAdmin ? 'แต่งตั้งสิทธิ์แอดมินเครือข่าย' : 'ถอนสิทธิ์แอดมินเครือข่าย'} ให้แก่สมาชิก บทบาทปัจจุบัน: ${member.roles.join(', ')}`,
      timestamp: new Date().toLocaleString('th-TH'),
    });
    this.save();

    return true;
  }
}

export const dataService = new DataService();
