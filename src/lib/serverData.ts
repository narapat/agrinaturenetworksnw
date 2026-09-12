import { getAdminDb } from '@/lib/firebaseAdmin';
import { 
  Farm, 
  Product, 
  SKUGroup, 
  CategoryTag, 
  NewsEvent, 
  MemberProfile 
} from '@/types';
import { 
  INITIAL_FARMS, 
  INITIAL_PRODUCTS, 
  INITIAL_NEWS, 
  INITIAL_CATEGORY_TAGS, 
  INITIAL_MEMBERS 
} from '@/data/mockData';

/**
 * แปลง Firestore Document ให้กลายเป็น Plain JavaScript Object ที่สามารถส่งผ่าน
 * Next.js Server Components ไปยัง Client Components ได้อย่างปลอดภัย (แก้ปัญหา Timestamp Serialization)
 */
function serializeData<T>(obj: any): T {
  if (obj === null || obj === undefined) return obj;

  // แปลง Firestore Timestamp เป็น ISO string
  if (typeof obj === 'object' && typeof obj.toDate === 'function') {
    return obj.toDate().toISOString() as any;
  }

  // แปลง Timestamp ที่มี _seconds
  if (typeof obj === 'object' && typeof obj._seconds === 'number') {
    return new Date(obj._seconds * 1000).toISOString() as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeData(item)) as any;
  }

  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = serializeData(obj[key]);
    }
    return res;
  }

  return obj;
}

/**
 * คัดกรองข้อมูลแปลงสำหรับแสดงสู่สาธารณะ (Anti-Scammer Guarantee)
 * 1. ลบ internalCoordinates (พิกัด GPS จริง) ออก 100%
 * 2. ลบเบอร์โทรศัพท์ออกถ้า isPublicPhone !== true
 * 3. ลบ LINE ID ออกถ้า isPublicLine !== true
 */
export function sanitizeFarmForPublic(farm: Farm): Farm {
  const clean: any = serializeData({ ...farm });
  
  // ตัดพิกัดจริงทิ้งเสมอ ห้ามหลุดออกไปหน้าเว็บสาธารณะ
  delete clean.internalCoordinates;

  if (!clean.isPublicPhone) {
    delete clean.phone;
  }
  if (!clean.isPublicLine) {
    delete clean.lineId;
  }
  return clean as Farm;
}

/**
 * คัดกรองข้อมูลผลผลิตสำหรับแสดงสู่สาธารณะ
 */
export function sanitizeProductForPublic(prod: Product): Product {
  const clean: any = serializeData({ ...prod });

  if (!clean.isPublicPhone) {
    delete clean.phone;
  }
  if (!clean.isPublicLine) {
    delete clean.lineId;
  }
  return clean as Product;
}

/**
 * ดึงรายการสมาชิกที่ได้รับการอนุมัติ (Approved) จาก Firestore หรือ Fallback
 */
async function getApprovedMemberIds(): Promise<Set<string>> {
  const db = getAdminDb();
  if (!db) {
    return new Set(INITIAL_MEMBERS.filter((m) => m.status === 'approved').map((m) => m.id));
  }

  try {
    const snap = await db.collection('members').where('status', '==', 'approved').get();
    const ids = new Set<string>();
    snap.forEach((doc) => ids.add(doc.id));
    
    // หากฐานข้อมูล Cloud ยังไม่มีข้อมูล ให้เสริมด้วย Initial Members
    if (ids.size === 0) {
      INITIAL_MEMBERS.filter((m) => m.status === 'approved').forEach((m) => ids.add(m.id));
    }
    return ids;
  } catch (err) {
    console.warn('[ServerData] getApprovedMemberIds fallback:', err);
    return new Set(INITIAL_MEMBERS.filter((m) => m.status === 'approved').map((m) => m.id));
  }
}

/**
 * ดึงรายการหมวดหมู่สินค้าทั้งหมด (Categories)
 */
export async function getCategoriesServer(): Promise<CategoryTag[]> {
  const db = getAdminDb();
  if (!db) return serializeData(INITIAL_CATEGORY_TAGS);

  try {
    const snap = await db.collection('categories').get();
    if (snap.empty) {
      return serializeData(INITIAL_CATEGORY_TAGS);
    }
    const cats: CategoryTag[] = [];
    snap.forEach((doc) => {
      cats.push(serializeData({ ...doc.data(), id: doc.id }) as CategoryTag);
    });
    return cats;
  } catch (err) {
    console.warn('[ServerData] getCategoriesServer fallback:', err);
    return serializeData(INITIAL_CATEGORY_TAGS);
  }
}

/**
 * ดึงรายการแปลงกสิกรรมธรรมชาติสาธารณะ (Server-side with Anti-Scammer Privacy)
 */
export async function getPublicFarmsServer(district?: string): Promise<Farm[]> {
  const approvedMemberIds = await getApprovedMemberIds();
  const db = getAdminDb();

  let farms: Farm[] = [];

  if (db) {
    try {
      const snap = await db.collection('farms').get();
      if (!snap.empty) {
        snap.forEach((doc) => {
          const data = doc.data();
          // กรองเฉพาะแปลงที่เจ้าของเป็นสมาชิกที่ได้รับการอนุมัติ หรือมีสถานะ approved
          const isApproved = (data.memberId && approvedMemberIds.has(data.memberId)) || data.status === 'approved';
          if (isApproved) {
            farms.push(sanitizeFarmForPublic({ ...data, id: doc.id } as Farm));
          }
        });
      }
    } catch (err) {
      console.warn('[ServerData] getPublicFarmsServer query fallback:', err);
    }
  }

  // ถ้าใน Firestore ยังว่างหรือต่อไม่ได้ ให้ใช้ INITIAL_FARMS
  if (farms.length === 0) {
    farms = INITIAL_FARMS
      .filter((f) => f.memberId && approvedMemberIds.has(f.memberId))
      .map((f) => sanitizeFarmForPublic(f));
  }

  if (district && district !== 'ทั้งหมด') {
    farms = farms.filter((f) => f.district === district);
  }

  return farms;
}

/**
 * ดึงข้อมูลแปลงกสิกรรมเดี่ยว (Server-side)
 */
export async function getFarmByIdServer(id: string): Promise<Farm | null> {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim().replace(/"/g, '');

  const db = getAdminDb();
  if (db) {
    try {
      let doc = await db.collection('farms').doc(id).get();
      if (!doc.exists && cleanId !== id) {
        doc = await db.collection('farms').doc(cleanId).get();
      }
      if (doc.exists) {
        return sanitizeFarmForPublic({ ...doc.data(), id: doc.id } as Farm);
      }
    } catch (err) {
      console.warn(`[ServerData] getFarmByIdServer(${id}) fallback:`, err);
    }
  }

  const fallback = INITIAL_FARMS.find((f) => f.id === id || f.id === cleanId);
  return fallback ? sanitizeFarmForPublic(fallback) : null;
}

/**
 * ดึงรายการผลผลิตสาธารณะ (Server-side)
 */
export async function getPublicProductsServer(filters?: { 
  district?: string; 
  category?: string; 
  status?: string 
}): Promise<Product[]> {
  const approvedMemberIds = await getApprovedMemberIds();
  const db = getAdminDb();

  let products: Product[] = [];

  if (db) {
    try {
      // ดึงแปลงที่ได้รับการอนุมัติเพื่อตรวจสอบความถูกต้องของสินค้า
      const farmsSnap = await db.collection('farms').get();
      const approvedFarmIds = new Set<string>();
      farmsSnap.forEach((d) => {
        const data = d.data();
        if ((data.memberId && approvedMemberIds.has(data.memberId)) || data.status === 'approved') {
          approvedFarmIds.add(d.id);
        }
      });

      const snap = await db.collection('products').get();
      if (!snap.empty) {
        snap.forEach((doc) => {
          const data = doc.data() as Product;
          if (data.status !== 'hidden' && (!data.farmId || approvedFarmIds.has(data.farmId))) {
            products.push(sanitizeProductForPublic({ ...data, id: doc.id } as Product));
          }
        });
      }
    } catch (err) {
      console.warn('[ServerData] getPublicProductsServer fallback:', err);
    }
  }

  // Fallback
  if (products.length === 0) {
    const approvedFarmIds = new Set(
      INITIAL_FARMS.filter((f) => f.memberId && approvedMemberIds.has(f.memberId)).map((f) => f.id)
    );
    products = INITIAL_PRODUCTS
      .filter((p) => p.status !== 'hidden' && (!p.farmId || approvedFarmIds.has(p.farmId)))
      .map((p) => sanitizeProductForPublic(p));
  }

  // กรองตาม filters
  if (filters?.district && filters.district !== 'ทั้งหมด') {
    products = products.filter((p) => p.district === filters.district);
  }
  if (filters?.category && filters.category !== 'ทั้งหมด') {
    products = products.filter((p) => p.category === filters.category);
  }
  if (filters?.status && filters.status !== 'ทั้งหมด') {
    products = products.filter((p) => p.status === filters.status);
  }

  return products;
}

/**
 * ดึงข้อมูลผลผลิตเดี่ยว (Server-side)
 */
export async function getProductByIdServer(id: string): Promise<Product | null> {
  if (!id || typeof id !== 'string') return null;
  const cleanId = id.trim().replace(/"/g, '');

  const db = getAdminDb();
  if (db) {
    try {
      let doc = await db.collection('products').doc(id).get();
      if (!doc.exists && cleanId !== id) {
        doc = await db.collection('products').doc(cleanId).get();
      }
      if (doc.exists) {
        return sanitizeProductForPublic({ ...doc.data(), id: doc.id } as Product);
      }
    } catch (err) {
      console.warn(`[ServerData] getProductByIdServer(${id}) fallback:`, err);
    }
  }

  const fallback = INITIAL_PRODUCTS.find((p) => p.id === id || p.id === cleanId);
  return fallback ? sanitizeProductForPublic(fallback) : null;
}

/**
 * สรุปกลุ่มผลผลิตตามมาตรฐานเครือข่าย (Cross-Farm SKU Grouping - Server Side)
 */
export async function getGroupedSKUsServer(filters?: { 
  district?: string; 
  category?: string 
}): Promise<SKUGroup[]> {
  const [activeProducts, categories] = await Promise.all([
    getPublicProductsServer(filters),
    getCategoriesServer()
  ]);

  const groupsMap = new Map<string, SKUGroup>();

  categories.forEach((cat) => {
    const prodsForSku = activeProducts.filter((p) => p.skuTagId === cat.id);
    if (prodsForSku.length === 0) return;
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
 * ดึงรายการข่าวสารและกิจกรรมสาธารณะ (Server-side)
 */
export async function getNewsServer(): Promise<NewsEvent[]> {
  const db = getAdminDb();
  let newsList: NewsEvent[] = [];

  if (db) {
    try {
      const snap = await db.collection('news').get();
      if (!snap.empty) {
        snap.forEach((doc) => {
          const item = doc.data() as NewsEvent;
          if (item.status !== 'hidden') {
            newsList.push(serializeData({ ...item, id: doc.id }));
          }
        });
      }
    } catch (err) {
      console.warn('[ServerData] getNewsServer fallback:', err);
    }
  }

  if (newsList.length === 0) {
    newsList = INITIAL_NEWS
      .filter((n) => n.status !== 'hidden')
      .map((n) => serializeData(n));
  }

  return newsList;
}
