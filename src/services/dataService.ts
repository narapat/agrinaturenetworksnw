import {
  MemberProfile,
  Farm,
  Product,
  CategoryTag,
  ProductCategory,
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
        const existing = this.farms.find((f) => f.id === initFarm.id);
        if (!existing) {
          this.farms.push(initFarm);
        } else if (initFarm.id === 'farm-admin') {
          existing.farmName = initFarm.farmName;
        }
      }

      // ปรับปรุงข้อมูลแปลงให้สมบูรณ์
      this.farms = this.farms.map((f) => this.normalizeFarm(f));

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

  private lastSyncTimestamp: number = 0;

  public getLastSyncTime(): string {
    if (!this.lastSyncTimestamp) return 'ยังไม่ได้ซิงค์';
    const d = new Date(this.lastSyncTimestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} น.`;
  }

  /**
   * รับประกันว่าข้อมูลจาก Cloud Firestore ถูกซิงค์เรียบร้อยแล้ว
   * @param force หากเป็น true จะบังคับดึงข้อมูลสดจาก Cloud Firestore ใหม่ทันที
   */
  async ensureFirestoreSync(force: boolean = false): Promise<void> {
    if (typeof window === 'undefined' || !db) return;
    const now = Date.now();

    // ถ้าเคยซิงค์แล้ว และไม่ใช่การบังคับรีเฟรช ให้ใช้ข้อมูลเดิม (ไม่ยิงซ้ำ)
    if (!force && this.isFirestoreSynced) return;

    // ระบบ Debounce: แม้จะ force แต่ถ้าเพิ่งซิงค์ไปไม่ถึง 3 วินาที ให้ข้ามเพื่อไม่ให้ยิง Firestore ซ้ำซ้อน
    if (force && (now - this.lastSyncTimestamp < 3000)) {
      return;
    }

    if (force) {
      this.isFirestoreSynced = false;
      this.syncPromise = null;
    }
    if (this.isFirestoreSynced) return;
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.syncWithFirestore();
    return this.syncPromise;
  }

  /**
   * บีบอัดภาพ Base64 Data URL ให้ปลอดภัย ป้องกันชนเพดาน 1 MB ของ Firestore
   */
  private async compressDataUrlSafe(dataUrl: string, maxDim: number = 800, quality: number = 0.70): Promise<string> {
    if (typeof window === 'undefined' || !dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length < 70000) {
      return dataUrl;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  /**
   * ซิงค์ข้อมูลกับ Cloud Firestore แบบแยกอิสระแต่ละคอลเลกชัน
   * ป้องกันปัญหาคอลเลกชันใดคอลเลกชันหนึ่งขัดข้องแล้วดึงข้อมูลสมาชิกไม่สำเร็จ
   */
  private async syncWithFirestore() {
    if (typeof window === 'undefined' || !db || this.isFirestoreSynced) return;

    try {
      // 1. ซิงค์ Members (สำคัญที่สุดสำหรับระบบแอดมินและสมาชิก)
      try {
        const membersSnap = await getDocs(collection(db, 'members'));
        const remoteMembers = !membersSnap.empty ? membersSnap.docs.map((d) => d.data() as MemberProfile) : [];
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
          // จุดสำคัญ: ถ้าสมาชิกถูกปฏิเสธ (rejected) ในเครื่องแล้ว ห้ามโดนข้อมูลเก่าใน Firestore ทับกลับเป็น pending!
          if (localM.status === 'rejected') {
            if (remoteM.status !== 'rejected') {
              this.firestoreUpdate('members', localM.id, { status: 'rejected' });
            }
            return { ...remoteM, ...localM, status: 'rejected' };
          }
          return { ...localM, ...remoteM };
        });

        for (const rm of remoteMembers) {
          if (!this.members.some((m) => m.id === rm.id)) {
            this.members.push(rm);
          }
        }

        // ===================================================================
        // 🌟 AUTO-RESCUE: ตรวจจับสมาชิกที่สมัครไว้ในเครื่อง (LocalStorage) 
        // แต่ยังไม่เคยส่งขึ้น Cloud Firestore (เฉพาะสถานะ pending เท่านั้น)
        // ส่งขึ้น Cloud Firestore ทันทีอัตโนมัติ เพื่อให้แอดมินมองเห็นและอนุมัติได้
        // ===================================================================
        const unuploadedMembers = this.members.filter(
          (m) => !DEMO_MEMBER_IDS.includes(m.id) && m.status === 'pending' && !remoteMemMap.has(m.id)
        );

        for (const localM of unuploadedMembers) {
          try {
            console.log(`[Auto-Rescue] Syncing unuploaded local member ${localM.id} (${localM.fullName}) to Cloud Firestore...`);
            const cleanPhone = (localM.phone || '').trim().replace(/[^\d+-, ]/g, '').slice(0, 20);
            
            let safePhoto = localM.facePhotoUrl;
            if (safePhoto && safePhoto.length > 500000 && typeof window !== 'undefined') {
              try {
                safePhoto = await this.compressDataUrlSafe(safePhoto, 400, 0.75);
              } catch {}
            }

            const sanitizedMember: MemberProfile = {
              ...localM,
              phone: cleanPhone,
              facePhotoUrl: safePhoto,
            };

            await this.firestoreSet('members', localM.id, sanitizedMember);

            // ซิงค์แปลงกสิกรรมที่ผูกกันด้วย
            const relatedFarm = this.farms.find((f) => f.id === localM.farmId || f.memberId === localM.id);
            if (relatedFarm) {
              await this.firestoreSet('farms', relatedFarm.id, relatedFarm);
            }

            // บันทึก Audit Log
            await this.firestoreSet('auditLogs', `log-rescue-${Date.now()}`, {
              id: `log-rescue-${Date.now()}`,
              timestamp: new Date().toISOString(),
              action: 'register_member',
              actorRole: 'member',
              actorName: localM.fullName,
              details: `ระบบ Auto-Rescue ซิงค์ข้อมูลใบสมัครที่ค้างในเครื่องขึ้น Cloud Firestore อัตโนมัติ (แปลง: ${relatedFarm?.farmName || '-'})`,
              targetId: localM.id,
            });
            console.log(`[Auto-Rescue] Successfully uploaded member ${localM.id} and farm to Cloud Firestore!`);
          } catch (rescueErr) {
            console.warn(`[Auto-Rescue] Error pushing member ${localM.id} to Firestore:`, rescueErr);
          }
        }
      } catch (err) {
        console.warn('Firestore sync [members] notice:', err);
      }

      // 2. ซิงค์ Farms (ข้อมูลแปลงกสิกรรม)
      try {
        const farmsSnap = await getDocs(collection(db, 'farms'));
        if (!farmsSnap.empty) {
          const remoteFarms = farmsSnap.docs.map((d) => this.normalizeFarm(d.data() as Farm));
          const remoteFarmMap = new Map(remoteFarms.map((f) => [f.id, f]));
          const initialFarmIds = new Set(INITIAL_FARMS.map((f) => f.id));

          // ===================================================================
          // 🌟 AUTO-RESCUE FARMS: ตรวจจับแปลงที่สร้างไว้ในเครื่อง (LocalStorage)
          // แต่ยังไม่เคยส่งขึ้น Cloud Firestore (เช่น สร้างขณะออฟไลน์ หรือเน็ตหลุด)
          // ซิงค์ขึ้น Cloud Firestore อัตโนมัติทันที เพื่อไม่ให้ข้อมูลแปลงสูญหาย
          // ===================================================================
          const unuploadedFarms = this.farms.filter(
            (f) => !initialFarmIds.has(f.id) && 
                   !remoteFarmMap.has(f.id) && 
                   this.members.some((m) => m.id === f.memberId || m.farmId === f.id)
          );

          for (const localF of unuploadedFarms) {
            try {
              console.log(`[Auto-Rescue] Syncing unuploaded local farm ${localF.id} (${localF.farmName}) to Cloud Firestore...`);
              let safePhotos = localF.photos || [];
              if (safePhotos.length > 0 && typeof window !== 'undefined') {
                const processedPhotos: string[] = [];
                for (const p of safePhotos) {
                  if (p && p.startsWith('data:image/') && p.length > 70000) {
                    try {
                      const comp = await this.compressDataUrlSafe(p, 800, 0.70);
                      processedPhotos.push(comp);
                    } catch {
                      processedPhotos.push(p);
                    }
                  } else {
                    processedPhotos.push(p);
                  }
                }
                safePhotos = processedPhotos;
              }

              const farmToUpload: Farm = {
                ...localF,
                photos: safePhotos,
              };

              await this.firestoreSet('farms', farmToUpload.id, farmToUpload);
              remoteFarmMap.set(farmToUpload.id, farmToUpload);
              console.log(`[Auto-Rescue] Successfully uploaded local farm ${farmToUpload.id} to Firestore!`);
            } catch (fErr) {
              console.warn(`[Auto-Rescue] Error uploading local farm ${localF.id} to Firestore:`, fErr);
            }
          }

          // จุดสำคัญ: ผสานข้อมูลจริงจาก Cloud Firestore กับข้อมูลในเครื่อง
          this.farms = this.farms.map((localF) => {
            const remoteF = remoteFarmMap.get(localF.id);
            if (!remoteF) return localF;

            // ตรวจสอบกรณีรูปถ่ายแปลง: ถ้าในเครื่องมีรูปจริงแต่ remote ยังไม่มีรูป ให้ซิงค์รูปขึ้น cloud และคงรูปไว้
            const hasLocalPhotos = localF.photos && localF.photos.length > 0 && !localF.photos[0].includes('unsplash');
            const hasRemotePhotos = remoteF.photos && remoteF.photos.length > 0 && !remoteF.photos[0].includes('unsplash');
            if (hasLocalPhotos && !hasRemotePhotos) {
              this.firestoreUpdate('farms', localF.id, { photos: localF.photos });
              return { ...this.normalizeFarm(remoteF), photos: localF.photos };
            }

            return this.normalizeFarm(remoteF);
          });

          for (const rf of remoteFarms) {
            if (!this.farms.some((f) => f.id === rf.id)) {
              this.farms.push(rf);
            }
          }

          // ลบเฉพาะแปลงชั่วคราวตกค้างที่ไม่ใช่ของสมาชิกคนใด และไม่มีใน Firestore
          this.farms = this.farms.filter(
            (f) => remoteFarmMap.has(f.id) || 
                   initialFarmIds.has(f.id) || 
                   this.members.some((m) => m.id === f.memberId || m.farmId === f.id)
          );
        }
      } catch (err) {
        console.warn('Firestore sync [farms] notice:', err);
      }

      // 3. ซิงค์ Products (ตลาดเครือข่าย)
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        const remoteProds = !productsSnap.empty ? productsSnap.docs.map((d) => d.data() as Product) : [];
        const remoteProdMap = new Map(remoteProds.map((p) => [p.id, p]));
        const initialProdIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));

        // ===================================================================
        // 🌟 AUTO-RESCUE PRODUCTS: ตรวจจับผลผลิตที่สร้างไว้ในเครื่อง (LocalStorage) 
        // แต่ยังไม่เคยส่งขึ้น Cloud Firestore (เช่น เพิ่มขณะเน็ตหลุด) ดันขึ้นอัตโนมัติ
        // ===================================================================
        const unuploadedProducts = this.products.filter(
          (p) => !initialProdIds.has(p.id) && 
                 !remoteProdMap.has(p.id) && 
                 this.farms.some((f) => f.id === p.farmId)
        );

        for (const localP of unuploadedProducts) {
          try {
            console.log(`[Auto-Rescue] Syncing unuploaded local product ${localP.id} (${localP.title}) to Cloud Firestore...`);
            let safeImages = localP.images || [];
            if (safeImages.length > 0 && typeof window !== 'undefined') {
              const processedImages: string[] = [];
              for (const img of safeImages) {
                if (img && img.startsWith('data:image/') && img.length > 70000) {
                  try {
                    const comp = await this.compressDataUrlSafe(img, 800, 0.75);
                    processedImages.push(comp);
                  } catch {
                    processedImages.push(img);
                  }
                } else {
                  processedImages.push(img);
                }
              }
              safeImages = processedImages;
            }

            const productToUpload: Product = {
              ...localP,
              images: safeImages,
            };

            await this.firestoreSet('products', productToUpload.id, productToUpload);
            remoteProdMap.set(productToUpload.id, productToUpload);
            console.log(`[Auto-Rescue] Successfully uploaded local product ${productToUpload.id} to Firestore!`);
          } catch (pErr) {
            console.warn(`[Auto-Rescue] Error uploading local product ${localP.id} to Firestore:`, pErr);
          }
        }

        if (remoteProds.length > 0) {
          // ข้อมูลสินค้าจริงจาก Cloud Firestore ผสานกับข้อมูลในเครื่อง
          this.products = this.products.map((localP) => {
            const remoteP = remoteProdMap.get(localP.id);
            return remoteP ? remoteP : localP;
          });
          for (const rp of remoteProds) {
            if (!this.products.some((p) => p.id === rp.id)) {
              this.products.push(rp);
            }
          }
        } else {
          for (const initProd of INITIAL_PRODUCTS) {
            if (!this.products.some((p) => p.id === initProd.id)) {
              this.products.push(initProd);
            }
            this.firestoreSet('products', initProd.id, initProd);
          }
        }
      } catch (err) {
        console.warn('Firestore sync [products] notice:', err);
      }

      // 4. ซิงค์ Categories (หมวดหมู่และ SKU)
      try {
        const categoriesSnap = await getDocs(collection(db, 'categories'));
        if (!categoriesSnap.empty) {
          const remoteCats = categoriesSnap.docs.map((d) => d.data() as CategoryTag);
          for (const rc of remoteCats) {
            if (!this.categories.some((c) => c.id === rc.id)) {
              this.categories.push(rc);
            }
          }
        } else {
          for (const initCat of INITIAL_CATEGORY_TAGS) {
            if (!this.categories.some((c) => c.id === initCat.id)) {
              this.categories.push(initCat);
            }
            this.firestoreSet('categories', initCat.id, initCat);
          }
        }
      } catch (err) {
        console.warn('Firestore sync [categories] notice:', err);
      }

      // 5. ซิงค์ Audit Logs (ประวัติความโปร่งใส)
      try {
        const logsSnap = await getDocs(collection(db, 'auditLogs'));
        if (!logsSnap.empty) {
          const remoteLogs = logsSnap.docs.map((d) => d.data() as AuditLog);
          for (const rl of remoteLogs) {
            if (!this.auditLogs.some((l) => l.id === rl.id)) {
              this.auditLogs.push(rl);
            }
          }
        }
      } catch (err) {
        console.warn('Firestore sync [auditLogs] notice:', err);
      }

      // 6. ซิงค์ News (ข่าวสาร & เอามื้อสามัคคี)
      try {
        const newsSnap = await getDocs(collection(db, 'news'));
        if (!newsSnap.empty) {
          const remoteNews = newsSnap.docs.map((d) => d.data() as NewsEvent);
          if (remoteNews.length > 0) {
            this.news = remoteNews;
          }
        }
      } catch (err) {
        console.warn('Firestore sync [news] notice:', err);
      }

      this.lastSyncTimestamp = Date.now();
      this.isFirestoreSynced = true;
      this.save();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nsw_data_updated'));
      }
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

  private async firestoreSet(collectionName: string, id: string, data: any): Promise<boolean> {
    if (typeof window === 'undefined' || !db) return false;
    try {
      await setDoc(doc(db, collectionName, id), this.cleanForFirestore(data));
      return true;
    } catch (e) {
      console.warn(`Firestore set error [${collectionName}/${id}]:`, e);
      return false;
    }
  }

  private async firestoreUpdate(collectionName: string, id: string, data: any): Promise<boolean> {
    if (typeof window === 'undefined' || !db) return false;
    try {
      await setDoc(doc(db, collectionName, id), this.cleanForFirestore(data), { merge: true });
      return true;
    } catch (e: any) {
      console.warn(`Firestore update error [${collectionName}/${id}]:`, e?.message || e);
      return false;
    }
  }

  private async firestoreDelete(collectionName: string, id: string): Promise<boolean> {
    if (typeof window === 'undefined' || !db) return true;
    try {
      await deleteDoc(doc(db, collectionName, id));
      return true;
    } catch (e) {
      console.warn(`Firestore delete error [${collectionName}/${id}]:`, e);
      return false;
    }
  }

  // ==================== SECURITY & ZERO-DATA LEAKAGE ====================

  /**
   * เติมข้อมูลที่จำเป็น (Fallbacks) ให้แปลงกสิกรรมเสมอ ป้องกันข้อมูลแหว่งจาก Firestore
   */
  normalizeFarm(farm: Partial<Farm> & { id: string; memberId?: string }): Farm {
    const member = this.members.find((m) => m.id === farm.memberId || m.farmId === farm.id);
    const district = farm.district || 'เมืองนครสวรรค์';
    const subdistrict = farm.subdistrict || '';
    const internalCoords = farm.internalCoordinates || { lat: 15.7000, lng: 100.0500 };
    
    return {
      id: farm.id,
      memberId: farm.memberId || member?.id || '',
      ownerName: farm.ownerName || member?.fullName || 'เกษตรกรเครือข่าย',
      farmName: farm.farmName || member?.farmName || (member?.fullName ? `แปลงกสิกรรม ${member.fullName}` : 'แปลงกสิกรรมธรรมชาติ'),
      tagline: farm.tagline || 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง',
      story: farm.story || 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์ ยึดหลักเศรษฐกิจพอเพียง',
      photos: (farm.photos && Array.isArray(farm.photos) && farm.photos.length > 0) ? farm.photos : [
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop'
      ],
      district: district,
      subdistrict: subdistrict,
      internalCoordinates: internalCoords,
      publicZone: farm.publicZone || {
        name: subdistrict ? `โซน ต.${subdistrict} อ.${district}` : `โซน อ.${district}`,
        approxLat: Number((internalCoords.lat + (Math.random() - 0.5) * 0.02).toFixed(6)),
        approxLng: Number((internalCoords.lng + (Math.random() - 0.5) * 0.02).toFixed(6)),
        radiusKm: 3
      },
      practices: (farm.practices && Array.isArray(farm.practices) && farm.practices.length > 0) ? farm.practices : ['โคก หนอง นา', 'กสิกรรมธรรมชาติ'],
      isPublicPhone: farm.isPublicPhone ?? false,
      isPublicLine: farm.isPublicLine ?? false,
      phone: farm.phone || member?.phone,
      lineId: farm.lineId || member?.lineId,
      socials: farm.socials || (member?.socials ? { ...member.socials } : {})
    };
  }

  /**
   * ซ่อมแซม/สร้างข้อมูลแปลงในเครื่องทันทีสำหรับสมาชิกที่สมัครแล้วมี farmId แต่ข้อมูลแปลงยังซิงค์ไม่ลงมา
   */
  repairMissingUserFarm(member: MemberProfile): Farm {
    const existing = this.farms.find((f) => f.id === member.farmId || f.memberId === member.id);
    if (existing) return this.normalizeFarm(existing);

    const farmId = member.farmId || `farm-${Date.now()}`;
    const newFarm = this.normalizeFarm({
      id: farmId,
      memberId: member.id,
      ownerName: member.fullName,
      farmName: member.farmName || (member.fullName ? `แปลงกสิกรรม ${member.fullName}` : 'แปลงกสิกรรมธรรมชาติ'),
      phone: member.phone,
      lineId: member.lineId,
      isPublicPhone: member.isPublicPhone,
      isPublicLine: member.isPublicLine,
    });

    this.farms.push(newFarm);
    if (member.farmId !== farmId) {
      member.farmId = farmId;
    }
    this.save();
    return newFarm;
  }

  // คัดกรองข้อมูลก่อนส่งให้บุคคลทั่วไปดู (ตัดเบอร์โทร, LINE ID, และพิกัดจริงทิ้งทั้งหมด)
  private sanitizeFarmForPublic(farm: Farm): Farm {
    const normalized = this.normalizeFarm(farm);
    const clean = { ...normalized };
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
    const approvedMemberIds = new Set(
      this.members.filter((m) => m.status === 'approved').map((m) => m.id)
    );
    const approvedFarmIds = new Set(
      this.farms
        .filter((f) => f.memberId && approvedMemberIds.has(f.memberId))
        .map((f) => f.id)
    );

    // กรองสินค้าสถานะ 'hidden' (ไม่แสดง) และสินค้าของแปลงที่ยังไม่ได้รับการอนุมัติ ออกจากตลาด e-Catalog สาธารณะ 100%
    let result = this.products
      .filter((p) => p.status !== 'hidden' && (!p.farmId || approvedFarmIds.has(p.farmId)))
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
      const prodsForSku = activeProducts.filter((p) => p.skuTagId === cat.id);
      if (prodsForSku.length === 0) return;
      // หากหมวดหมู่นั้นถูกปิดชั่วคราว แต่ยังมีสินค้าของเกษตรกรคงค้างอยู่ ให้ยังคงแสดงในตลาดเพื่อไม่ให้สินค้าสูญหาย
      // จะข้ามก็ต่อเมื่อหมวดหมู่นั้นปิดใช้งานและไม่มีสินค้าใดๆ ผูกอยู่
      if (!cat.isActive && prodsForSku.length === 0) return;

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
    // 🌟 กฎความปลอดภัย: ฟาร์มจะแสดงสู่สาธารณะก็ต่อเมื่อสมาชิกเจ้าของแปลงได้รับการอนุมัติแล้วเท่านั้น (status === 'approved')
    const approvedMemberIds = new Set(
      this.members.filter((m) => m.status === 'approved').map((m) => m.id)
    );

    let result = this.farms
      .filter((f) => f.memberId && approvedMemberIds.has(f.memberId))
      .map((f) => this.sanitizeFarmForPublic(f));

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
      fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {});
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
    if (userId !== 'guest') {
      try {
        localStorage.removeItem('nsw_user_logged_out');
        sessionStorage.removeItem('nsw_user_logged_out');
      } catch {}
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
    try {
      localStorage.removeItem('nsw_user_logged_out');
      sessionStorage.removeItem('nsw_user_logged_out');
    } catch {}
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

    // 3. หากยังไม่พบ แต่ในเครื่องนี้มีผู้ใช้ปัจจุบันที่สมัครไว้แล้ว (currentUserId) และยังไม่มี lineUserId
    if (!member && this.currentUserId && !DEMO_MEMBER_IDS.includes(this.currentUserId)) {
      const activeMember = this.members.find((m) => m.id === this.currentUserId);
      if (activeMember && !activeMember.lineUserId) {
        member = activeMember;
      }
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
   * บันทึกข้อมูลแบบ Asynchronous พร้อมตรวจสอบความถูกต้อง และจัดเก็บ Audit Log
   */
  async registerNewMember(data: {
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
  }): Promise<{ member: MemberProfile; farm: Farm; success: boolean; firestoreSynced: boolean }> {
    const memberId = `mem-${Date.now()}`;
    const farmId = `farm-${Date.now()}`;

    // ทำความสะอาดและกรองข้อมูล (Sanitization) ป้องกัน Firestore Error
    const cleanFullName = data.fullName.trim().slice(0, 100);
    const cleanFarmName = data.farmName.trim().slice(0, 100);
    const cleanPhone = data.phone.trim().replace(/[^\d+-, ]/g, '').slice(0, 20);
    const cleanLineId = data.lineId.trim().slice(0, 50);
    const cleanDistrict = data.district.trim();
    const cleanSubdistrict = data.subdistrict.trim().slice(0, 50);

    const newFarm: Farm = {
      id: farmId,
      memberId: memberId,
      ownerName: cleanFullName,
      farmName: cleanFarmName,
      tagline: (data.tagline || 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง').trim().slice(0, 120),
      story: (data.story || 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์').trim().slice(0, 1000),
      photos: data.photos && data.photos.length > 0 ? data.photos.slice(0, 10) : [
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop',
      ],
      district: cleanDistrict,
      subdistrict: cleanSubdistrict,
      internalCoordinates: data.coordinates || {
        lat: 15.7 + Math.random() * 0.2,
        lng: 100.0 + Math.random() * 0.2,
      },
      publicZone: {
        name: `โซน ต.${cleanSubdistrict} อ.${cleanDistrict}`,
        approxLat: 15.7 + Math.random() * 0.2,
        approxLng: 100.0 + Math.random() * 0.2,
        radiusKm: 4.0,
      },
      practices: data.practices.length > 0 ? data.practices : ['กสิกรรมธรรมชาติ', 'ไร้สารเคมี 100%'],
      isPublicPhone: data.isPublicPhone,
      isPublicLine: data.isPublicLine,
      phone: cleanPhone,
      lineId: cleanLineId,
      socials: {
        lineId: cleanLineId,
      },
    };

    const newMember: MemberProfile = {
      id: memberId,
      lineUserId: data.lineUserId || '',
      fullName: cleanFullName,
      facePhotoUrl: data.facePhotoUrl,
      role: 'member',
      roles: ['member'],
      status: 'pending', // ต้องให้แอดมินเครือข่ายตรวจสอบและอนุมัติก่อน
      fontSizePref: 'normal',
      phone: cleanPhone,
      lineId: cleanLineId,
      isPublicPhone: data.isPublicPhone,
      isPublicLine: data.isPublicLine,
      isPublicSocials: true,
      socials: {
        lineId: cleanLineId,
      },
      delegationStatus: 'none',
      trainingCourse: (data.trainingCourse || '').trim().slice(0, 150),
      trainingLocation: (data.trainingLocation || '').trim().slice(0, 150),
      farmId: farmId,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // 1. บันทึกลง local cache ทันทีเพื่อความลื่นไหลของระบบ
    this.farms.unshift(newFarm);
    this.members.unshift(newMember);
    this.currentUserId = memberId; // สลับผู้ใช้เป็นสมาชิกใหม่ทันที
    this.save();

    // 2. บันทึกและรอผลจาก Cloud Firestore (Await guarantee)
    let memberSaved = false;
    let farmSaved = false;
    try {
      [memberSaved, farmSaved] = await Promise.all([
        this.firestoreSet('members', newMember.id, newMember),
        this.firestoreSet('farms', newFarm.id, newFarm),
      ]);
    } catch (err) {
      console.warn('Firestore write error in registerNewMember:', err);
    }

    // 3. จัดเก็บ Audit Log บันทึกประวัติการสมัครสมาชิกเพื่อความโปร่งใส
    const auditLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'register_member',
      performedByAdminId: data.lineUserId || memberId,
      performedByAdminName: cleanFullName,
      targetMemberId: memberId,
      targetMemberName: cleanFullName,
      targetFarmName: cleanFarmName,
      timestamp: new Date().toLocaleString('th-TH'),
      details: `สมาชิก ${cleanFullName} ลงทะเบียนแปลง ${cleanFarmName} (เบอร์: ${cleanPhone}, LINE: ${data.lineUserId || cleanLineId || 'N/A'}) รอดำเนินการอนุมัติ`,
    };
    this.auditLogs.unshift(auditLog);
    this.save();
    try {
      await this.firestoreSet('auditLogs', auditLog.id, auditLog);
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }

    return { 
      member: newMember, 
      farm: newFarm, 
      success: true, 
      firestoreSynced: memberSaved 
    };
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
  async adminAssistAddProduct(
    admin: MemberProfile,
    targetMemberId: string,
    productData: Omit<Product, 'id' | 'updatedAt' | 'farmId' | 'farmName' | 'district' | 'subdistrict' | 'isPublicPhone' | 'isPublicLine'>
  ): Promise<Product> {
    const member = this.members.find((m) => m.id === targetMemberId);
    if (!member) throw new Error('Member not found');

    const farm = this.farms.find((f) => f.id === member.farmId);
    if (!farm) throw new Error('Farm not found');

    // บีบอัดรูปภาพ Base64 เสมอ
    let safeImages = productData.images || [];
    if (safeImages.length > 0 && typeof window !== 'undefined') {
      const processed: string[] = [];
      for (const img of safeImages) {
        if (img && img.startsWith('data:image/') && img.length > 70000) {
          try {
            const comp = await this.compressDataUrlSafe(img, 800, 0.75);
            processed.push(comp);
          } catch {
            processed.push(img);
          }
        } else {
          processed.push(img);
        }
      }
      safeImages = processed;
    }

    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      images: safeImages,
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
    await this.firestoreSet('products', newProduct.id, newProduct);
    await this.firestoreUpdate('members', member.id, { delegationStatus: 'completed' });
    await this.firestoreSet('auditLogs', newLog.id, newLog);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }

    return newProduct;
  }

  // สมาชิกลงข้อมูลด้วยตนเอง
  async memberAddProduct(productData: Omit<Product, 'id' | 'updatedAt'>): Promise<Product> {
    // บีบอัดรูปภาพ Base64 เสมอ
    let safeImages = productData.images || [];
    if (safeImages.length > 0 && typeof window !== 'undefined') {
      const processed: string[] = [];
      for (const img of safeImages) {
        if (img && img.startsWith('data:image/') && img.length > 70000) {
          try {
            const comp = await this.compressDataUrlSafe(img, 800, 0.75);
            processed.push(comp);
          } catch {
            processed.push(img);
          }
        } else {
          processed.push(img);
        }
      }
      safeImages = processed;
    }

    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      images: safeImages,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.products.unshift(newProduct);
    this.save();
    await this.firestoreSet('products', newProduct.id, newProduct);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
    return newProduct;
  }

  async updateProductStatus(productId: string, status: Product['status']): Promise<void> {
    const prod = this.products.find((p) => p.id === productId);
    if (prod) {
      prod.status = status;
      prod.updatedAt = new Date().toISOString().split('T')[0];
      this.save();
      await this.firestoreUpdate('products', productId, { status, updatedAt: prod.updatedAt });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nsw_data_updated'));
      }
    }
  }

  // แก้ไขข้อมูลผลผลิตที่ลงไปแล้ว (ชื่อ, ราคา, หมวดหมู่, รูปภาพ, สถานะ, คำอธิบาย)
  async updateProduct(productId: string, updatedData: Partial<Product>): Promise<Product | null> {
    const index = this.products.findIndex((p) => p.id === productId);
    if (index === -1) return null;

    // บีบอัดรูปภาพ Base64 เสมอหากมีการแก้ไขรูป
    if (updatedData.images && Array.isArray(updatedData.images)) {
      const safeImages: string[] = [];
      for (const img of updatedData.images) {
        if (img && img.startsWith('data:image/') && img.length > 70000 && typeof window !== 'undefined') {
          try {
            const comp = await this.compressDataUrlSafe(img, 800, 0.75);
            safeImages.push(comp);
          } catch {
            safeImages.push(img);
          }
        } else {
          safeImages.push(img);
        }
      }
      updatedData.images = safeImages;
    }

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
    await this.firestoreUpdate('products', productId, updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
    return updated;
  }

  // ลบผลผลิตออกจากระบบ
  async deleteProduct(productId: string): Promise<boolean> {
    const initialLen = this.products.length;
    this.products = this.products.filter((p) => p.id !== productId);
    if (this.products.length !== initialLen) {
      this.save();
      await this.firestoreDelete('products', productId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nsw_data_updated'));
      }
      return true;
    }
    return false;
  }

  // แก้ไขข้อมูลแปลงกสิกรรม (ชื่อแปลง, คำขวัญ, เรื่องเล่า, อำเภอ, ตำบล, แนวทางปฏิบัติ)
  async updateFarm(farmId: string, updatedData: Partial<Farm>): Promise<Farm | null> {
    const farm = this.farms.find((f) => f.id === farmId);
    if (!farm) return null;

    // บีบอัดรูปภาพ Base64 ป้องกันชนเพดาน 1 MB ของ Cloud Firestore เสมอ
    if (updatedData.photos && Array.isArray(updatedData.photos)) {
      const safePhotos: string[] = [];
      for (const p of updatedData.photos) {
        if (p && p.startsWith('data:image') && p.length > 80000 && typeof window !== 'undefined') {
          try {
            const compressed = await this.compressDataUrlSafe(p, 800, 0.70);
            safePhotos.push(compressed);
          } catch {
            safePhotos.push(p);
          }
        } else {
          safePhotos.push(p);
        }
      }
      updatedData.photos = safePhotos;
    }

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
    const firestoreOk = await this.firestoreUpdate('farms', farmId, farm);
    if (!firestoreOk && db) {
      throw new Error('ไม่สามารถบันทึกข้อมูลแปลงลง Firestore ได้ กรุณาตรวจสอบขนาดรูปภาพหรือการเชื่อมต่อ');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
    return farm;
  }

  // สร้างแปลงกสิกรรมใหม่สำหรับสมาชิกที่ยังไม่มีแปลง
  async createFarm(
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
  ): Promise<Farm> {
    const member = this.members.find((m) => m.id === memberId);
    const farmId = `farm-${Date.now()}`;
    const rawPhotos = farmData.photos && farmData.photos.length > 0 ? farmData.photos : [
      'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=500&fit=crop',
    ];

    // บีบอัดรูปภาพ Base64 ป้องกันชนเพดาน 1 MB ของ Cloud Firestore เสมอ
    const safePhotos: string[] = [];
    for (const p of rawPhotos) {
      if (p && p.startsWith('data:image') && p.length > 80000 && typeof window !== 'undefined') {
        try {
          const compressed = await this.compressDataUrlSafe(p, 800, 0.70);
          safePhotos.push(compressed);
        } catch {
          safePhotos.push(p);
        }
      } else {
        safePhotos.push(p);
      }
    }

    const newFarm: Farm = {
      id: farmId,
      memberId: memberId,
      ownerName: member ? member.fullName : 'สมาชิกเครือข่าย',
      farmName: farmData.farmName,
      tagline: farmData.tagline || 'วิถีกสิกรรมธรรมชาติเพื่อการพึ่งพาตนเอง',
      story: farmData.story || 'แปลงเกษตรกรเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์',
      photos: safePhotos,
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
      await this.firestoreUpdate('members', member.id, { farmId });
    }
    this.save();
    const firestoreOk = await this.firestoreSet('farms', farmId, newFarm);
    if (!firestoreOk && db) {
      throw new Error('ไม่สามารถบันทึกข้อมูลแปลงลง Firestore ได้ กรุณาตรวจสอบขนาดรูปภาพหรือการเชื่อมต่อ');
    }
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nsw_data_updated'));
      }
    }
  }

  getCategoryName(category: ProductCategory): string {
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

  getProductCountBySku(skuTagId: string): { count: number; farmCount: number } {
    const prods = this.products.filter((p) => p.skuTagId === skuTagId);
    const farmIds = new Set(prods.map((p) => p.farmId));
    return { count: prods.length, farmCount: farmIds.size };
  }

  updateCategoryTag(catId: string, updates: Partial<Omit<CategoryTag, 'id'>>): CategoryTag | null {
    const cat = this.categories.find((c) => c.id === catId);
    if (!cat) return null;

    Object.assign(cat, updates);

    // Cascade update to all attached products if name or category changed
    if (updates.name || updates.category) {
      this.products.forEach((p) => {
        if (p.skuTagId === catId) {
          if (updates.name) p.skuTagName = updates.name;
          if (updates.category) {
            p.category = updates.category;
            p.categoryName = this.getCategoryName(updates.category);
          }
          this.firestoreUpdate('products', p.id, {
            skuTagName: p.skuTagName,
            category: p.category,
            categoryName: p.categoryName,
          });
        }
      });
    }

    this.save();
    this.firestoreUpdate('categories', catId, { ...cat });

    // บันทึก Audit Log เพื่อความโปร่งใส
    const currentUser = this.getCurrentUser();
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'update_sku',
      performedByAdminId: currentUser?.id || 'admin-001',
      performedByAdminName: currentUser?.fullName || 'แอดมินเครือข่าย',
      targetMemberId: '-',
      targetMemberName: '-',
      targetFarmName: '-',
      details: `แก้ไขข้อมูลชนิดผลผลิต (SKU): "${cat.name}" (${this.getCategoryName(cat.category)})`,
      timestamp: new Date().toLocaleString('th-TH'),
    };
    this.auditLogs.unshift(newLog);
    this.firestoreSet('auditLogs', newLog.id, newLog);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }
    return cat;
  }

  deleteCategoryTagWithReassign(
    sourceCatId: string,
    targetCatId?: string
  ): { success: boolean; reassignedCount: number; deletedName: string } {
    const catIndex = this.categories.findIndex((c) => c.id === sourceCatId);
    if (catIndex === -1) return { success: false, reassignedCount: 0, deletedName: '' };

    const deletedCat = this.categories[catIndex];
    const deletedName = deletedCat.name;
    const affectedProds = this.products.filter((p) => p.skuTagId === sourceCatId);

    // If there are affected products and targetCatId is provided, reassign them!
    let reassignedCount = 0;
    if (targetCatId && targetCatId !== sourceCatId) {
      const targetCat = this.categories.find((c) => c.id === targetCatId);
      if (targetCat) {
        affectedProds.forEach((p) => {
          p.skuTagId = targetCat.id;
          p.skuTagName = targetCat.name;
          p.category = targetCat.category;
          p.categoryName = this.getCategoryName(targetCat.category);
          this.firestoreUpdate('products', p.id, {
            skuTagId: p.skuTagId,
            skuTagName: p.skuTagName,
            category: p.category,
            categoryName: p.categoryName,
          });
          reassignedCount++;
        });
      }
    }

    // Remove source category
    this.categories.splice(catIndex, 1);
    this.save();
    this.firestoreDelete('categories', sourceCatId);

    // บันทึก Audit Log เพื่อความโปร่งใส
    const currentUser = this.getCurrentUser();
    const targetCat = targetCatId ? this.categories.find((c) => c.id === targetCatId) : null;
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'delete_sku',
      performedByAdminId: currentUser?.id || 'admin-001',
      performedByAdminName: currentUser?.fullName || 'แอดมินเครือข่าย',
      targetMemberId: '-',
      targetMemberName: '-',
      targetFarmName: '-',
      details: reassignedCount > 0
        ? `ลบชนิดผลผลิต "${deletedName}" และโยกย้ายผลผลิต ${reassignedCount} รายการไปยัง "${targetCat?.name || targetCatId}"`
        : `ลบชนิดผลผลิต "${deletedName}" (ไม่มีผลผลิตตกค้าง)`,
      timestamp: new Date().toLocaleString('th-TH'),
    };
    this.auditLogs.unshift(newLog);
    this.firestoreSet('auditLogs', newLog.id, newLog);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
    }

    return { success: true, reassignedCount, deletedName };
  }

  getPendingMembers(): MemberProfile[] {
    return this.members.filter((m) => m.status === 'pending');
  }

  getAllMembers(): MemberProfile[] {
    return this.members;
  }

  getMemberById(id: string): MemberProfile | undefined {
    return this.members.find((m) => m.id === id);
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

  getRejectedMembers(): MemberProfile[] {
    return this.members.filter((m) => m.status === 'rejected');
  }

  rejectMember(admin: MemberProfile, memberId: string, reason?: string) {
    const member = this.members.find((m) => m.id === memberId);
    if (member) {
      member.status = 'rejected';

      const farm = this.farms.find((f) => f.id === member.farmId);
      const adminId = admin?.id || 'admin-001';
      const adminName = admin?.fullName || 'แอดมินเครือข่าย';

      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        action: 'reject_member',
        performedByAdminId: adminId,
        performedByAdminName: adminName,
        targetMemberId: member.id,
        targetMemberName: member.fullName,
        targetFarmName: farm?.farmName || 'แปลงที่ถูกปฏิเสธ',
        details: `แอดมิน ${adminName} ปฏิเสธการอนุมัติสมาชิก ${member.fullName} (${farm?.farmName || ''}) ${reason ? `เหตุผล: ${reason}` : ''}`,
        timestamp: new Date().toLocaleString('th-TH'),
      };
      this.auditLogs.unshift(newLog);
      this.save();

      this.firestoreUpdate('members', memberId, { status: 'rejected' });
      this.firestoreSet('auditLogs', newLog.id, newLog);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nsw_data_updated'));
      }
    }
  }

  deleteMemberPermanently(admin: MemberProfile, memberId: string) {
    const member = this.members.find((m) => m.id === memberId);
    if (!member) return;

    const farmId = member.farmId;
    const adminId = admin?.id || 'admin-001';
    const adminName = admin?.fullName || 'แอดมินเครือข่าย';

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: 'reject_member',
      performedByAdminId: adminId,
      performedByAdminName: adminName,
      targetMemberId: member.id,
      targetMemberName: member.fullName,
      targetFarmName: 'ลบข้อมูลถาวร',
      details: `แอดมิน ${adminName} ลบข้อมูลสมาชิก ${member.fullName} และแปลงที่ผูกอยู่ออกจากระบบอย่างถาวร`,
      timestamp: new Date().toLocaleString('th-TH'),
    };
    this.auditLogs.unshift(newLog);
    this.firestoreSet('auditLogs', newLog.id, newLog);

    this.members = this.members.filter((m) => m.id !== memberId);
    if (farmId) {
      this.farms = this.farms.filter((f) => f.id !== farmId && f.memberId !== memberId);
      this.products = this.products.filter((p) => p.farmId !== farmId);
    }
    this.save();

    this.firestoreDelete('members', memberId);
    if (farmId) {
      this.firestoreDelete('farms', farmId);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nsw_data_updated'));
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
