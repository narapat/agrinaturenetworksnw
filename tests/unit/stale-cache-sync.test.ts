import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * จำลองเครื่องผู้ใช้ที่มีแคชรุ่นเก่า (v1) ค้างอยู่ แล้วเปิดแอปเวอร์ชันใหม่:
 * แอปต้องแสดงตามเซิร์ฟเวอร์ ไม่ใช่ตามแคช และต้องไม่ส่งของที่ถูกลบกลับขึ้นไป
 */

const UID = 'U_ME';
const ME = { id: 'mem-me', fullName: 'นรภัทร', ownerUid: UID, lineUserId: UID, status: 'approved', role: 'member', roles: ['member'], farmId: 'farm-mine' };

// ---- สิ่งที่ "เซิร์ฟเวอร์" มี ----
let remote: Record<string, any[]> = {};
vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  query: (c: { name: string }, ...filters: any[]) => ({ name: c.name, filters }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  doc: (_db: unknown, ...path: string[]) => ({ path }),
  getDocs: async (q: { name: string; filters?: Array<{ field: string; value: unknown }> }) => {
    let items = remote[q.name] || [];
    for (const f of q.filters || []) items = items.filter((x) => x[f.field] === f.value);
    return { empty: items.length === 0, docs: items.map((d) => ({ id: d.id, data: () => ({ ...d }) })) };
  },
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
}));
vi.mock('@/services/liffService', () => ({ liffService: { getIdToken: () => 'line-token' } }));

class MemStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

function seedStaleV1Cache(ls: MemStorage) {
  ls.setItem('nsw_current_user_v1', ME.id);
  ls.setItem('nsw_members_v1', JSON.stringify([ME]));
  ls.setItem(
    'nsw_farms_v1',
    JSON.stringify([
      { id: 'farm-001', memberId: 'mem-001', farmName: 'แปลงตัวอย่าง', status: 'approved', district: 'ลาดยาว' },
      { id: 'farm-deleted', memberId: 'mem-gone', ownerUid: 'U_GONE', farmName: 'แปลงที่แอดมินลบแล้ว', status: 'approved' },
      { id: 'farm-mine', memberId: ME.id, ownerUid: UID, farmName: 'แปลงของฉัน', status: 'approved' },
    ])
  );
  ls.setItem(
    'nsw_products_v1',
    JSON.stringify([
      { id: 'prod-001', farmId: 'farm-001', title: 'สินค้าตัวอย่าง', status: 'sale' },
      { id: 'prod-old-deleted', farmId: 'farm-deleted', ownerUid: 'U_GONE', title: 'ของที่ถูกลบ', status: 'sale' },
      { id: 'prod-unsent', farmId: 'farm-mine', ownerUid: UID, title: 'บันทึกตอนเน็ตหลุด', status: 'sale', skuTagId: 'biochar' },
      { id: 'prod-admin-deleted', farmId: 'farm-mine', ownerUid: UID, title: 'แอดมินลบไปแล้ว', status: 'sale', skuTagId: 'biochar' },
    ])
  );
  ls.setItem('nsw_news_v1', JSON.stringify([{ id: 'news-001', title: 'ข่าวตัวอย่าง', status: 'published' }]));
}

describe('Device with a stale cache opens the new version', () => {
  const env = process.env.NEXT_PUBLIC_DEMO_MODE;
  let ls: MemStorage;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    ls = new MemStorage();
    seedStaleV1Cache(ls);
    remote = {
      members: [ME],
      farms: [{ id: 'farm-mine', memberId: ME.id, ownerUid: UID, farmName: 'แปลงของฉัน', status: 'approved', district: 'ลาดยาว' }],
      products: [],
      categories: [],
      practices: [],
      auditLogs: [],
      news: [{ id: 'news-real', title: 'ข่าวจริง', status: 'published' }],
    };
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/sync/rescue') {
        const { products } = JSON.parse(String(init?.body));
        return {
          ok: true,
          json: async () => ({
            success: true,
            results: products.map((p: any) =>
              p.id === 'prod-admin-deleted' ? { id: p.id, status: 'deleted' } : { id: p.id, status: 'created', product: { ...p, fromServer: true } }
            ),
          }),
        };
      }
      return { ok: true, json: async () => ({ success: true }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', ls);
    vi.stubGlobal('sessionStorage', new MemStorage());
    vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { href: 'http://localhost/' } }));
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = env;
    vi.unstubAllGlobals();
  });

  async function openApp() {
    const { dataService } = await import('@/services/dataService');
    await dataService.ensureFirestoreSync(true);
    return dataService;
  }

  it('shows only what the server has: deleted and sample farms/products/news are gone', async () => {
    const ds = await openApp();
    expect(ds.getFarmById('farm-deleted')).toBeUndefined();
    expect(ds.getFarmById('farm-001')).toBeUndefined();
    expect(ds.getFarmById('farm-mine')?.farmName).toBe('แปลงของฉัน');
    expect(ds.getRawProductById('prod-001')).toBeUndefined();
    expect(ds.getRawProductById('prod-old-deleted')).toBeUndefined();
    expect(ds.getNews(true).map((n) => n.id)).toEqual(['news-real']);
  });

  it('wipes the old cache keys and writes the new versioned cache', async () => {
    await openApp();
    expect(ls.getItem('nsw_farms_v1')).toBeNull();
    expect(ls.getItem('nsw_products_v1')).toBeNull();
    expect(JSON.parse(ls.getItem('nsw_farms_v2')!).map((f: any) => f.id)).toEqual(['farm-mine']);
    expect(ls.getItem('nsw_current_user_v1')).toBe(ME.id); // ผู้ใช้ไม่หลุดออกจากระบบ
  });

  it("sends only the user's own unsent products through the server check; deleted ones stay deleted", async () => {
    const ds = await openApp();
    const rescueCalls = fetchMock.mock.calls.filter((c) => c[0] === '/api/sync/rescue');
    expect(rescueCalls).toHaveLength(1);
    const sent = JSON.parse(String(rescueCalls[0][1].body)).products.map((p: any) => p.id).sort();
    expect(sent).toEqual(['prod-admin-deleted', 'prod-unsent']); // ไม่มีของคนอื่น / ตัวอย่าง
    expect((ds.getRawProductById('prod-unsent') as any)?.fromServer).toBe(true);
    expect(ds.getRawProductById('prod-admin-deleted')).toBeUndefined();
    expect(ls.getItem('nsw_pending_uploads_v2')).toBeNull(); // คิวว่าง
  });

  it('keeps queued items for a retry when the server is unreachable, and still shows them to the owner', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/sync/rescue') throw new Error('offline');
      return { ok: true, json: async () => ({}) };
    });
    const ds = await openApp();
    const queued = JSON.parse(ls.getItem('nsw_pending_uploads_v2')!).products.map((p: any) => p.id).sort();
    expect(queued).toEqual(['prod-admin-deleted', 'prod-unsent']);
    expect(ds.getRawProductById('prod-unsent')).toBeTruthy();
  });

  it('a later visit does not re-upload anything once the queue is empty', async () => {
    await openApp();
    fetchMock.mockClear();
    vi.resetModules();
    const { dataService } = await import('@/services/dataService');
    await dataService.ensureFirestoreSync(true);
    expect(fetchMock.mock.calls.filter((c) => c[0] === '/api/sync/rescue')).toHaveLength(0);
  });
});
