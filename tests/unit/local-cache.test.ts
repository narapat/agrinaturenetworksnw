import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CACHE_KEYS,
  LEGACY_CACHE_KEYS,
  PENDING_UPLOADS_KEY,
  enqueuePendingProduct,
  migrateLegacyCache,
  readPendingUploads,
  replaceWithRemote,
} from '@/services/localCache';
import { withoutDemo } from '@/lib/demoMode';

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

const UID = 'U_PAT_REAL';
const me = { id: 'mem-1790000000000-abcd', fullName: 'นรภัทร', ownerUid: UID, status: 'approved' };
const other = { id: 'mem-1790000000001-zzzz', fullName: 'คนอื่น', ownerUid: 'U_OTHER', status: 'approved' };

function seedLegacy(s: MemStorage) {
  s.setItem(CACHE_KEYS.CURRENT_USER, me.id);
  s.setItem(LEGACY_CACHE_KEYS.MEMBERS, JSON.stringify([me, other, { id: 'mem-001', fullName: 'ตัวอย่าง', ownerUid: UID }]));
  s.setItem(
    LEGACY_CACHE_KEYS.FARMS,
    JSON.stringify([
      { id: 'farm-1790000000000', memberId: me.id, ownerUid: UID, farmName: 'แปลงของฉัน' },
      { id: 'farm-1790000000009', memberId: other.id, ownerUid: 'U_OTHER', farmName: 'แปลงคนอื่น' },
      { id: 'farm-001', memberId: 'mem-001', ownerUid: UID, farmName: 'แปลงตัวอย่าง' },
    ])
  );
  s.setItem(
    LEGACY_CACHE_KEYS.PRODUCTS,
    JSON.stringify([
      { id: 'prod-1790000000100', farmId: 'farm-1790000000000', ownerUid: UID, title: 'ของฉัน' },
      { id: 'prod-1790000000101', farmId: 'farm-1790000000000', title: 'ของฉัน ไม่มี ownerUid' },
      { id: 'prod-1790000000200', farmId: 'farm-1790000000009', ownerUid: 'U_OTHER', title: 'ของคนอื่น' },
      { id: 'prod-001', farmId: 'farm-001', ownerUid: UID, title: 'สินค้าตัวอย่าง' },
    ])
  );
  s.setItem(LEGACY_CACHE_KEYS.NEWS, JSON.stringify([{ id: 'news-001' }]));
  s.setItem(LEGACY_CACHE_KEYS.CATEGORIES, '[]');
}

describe('Legacy cache migration (one-time wipe of v1 caches)', () => {
  const env = process.env.NEXT_PUBLIC_DEMO_MODE;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = env;
  });

  it('wipes every v1 cache key but keeps the signed-in user', () => {
    const s = new MemStorage();
    seedLegacy(s);
    const r = migrateLegacyCache(s);
    expect(r.migrated).toBe(true);
    for (const k of Object.values(LEGACY_CACHE_KEYS)) expect(s.getItem(k)).toBeNull();
    expect(s.getItem(CACHE_KEYS.CURRENT_USER)).toBe(me.id);
  });

  it("queues only the signed-in user's own farms/products — never other people's or demo data", () => {
    const s = new MemStorage();
    seedLegacy(s);
    const r = migrateLegacyCache(s);
    const q = readPendingUploads(s);
    expect(q.farms.map((f) => f.id)).toEqual(['farm-1790000000000']);
    expect(q.products.map((p) => p.id).sort()).toEqual(['prod-1790000000100', 'prod-1790000000101']);
    expect(q.products.every((p) => p.ownerUid === UID)).toBe(true);
    expect(r).toMatchObject({ rescuedFarms: 1, rescuedProducts: 2 });
  });

  it('guests and demo accounts get a plain wipe with nothing queued', () => {
    for (const current of [null, 'guest', 'mem-001']) {
      const s = new MemStorage();
      seedLegacy(s);
      if (current === null) s.removeItem(CACHE_KEYS.CURRENT_USER);
      else s.setItem(CACHE_KEYS.CURRENT_USER, current);
      migrateLegacyCache(s);
      expect(s.getItem(PENDING_UPLOADS_KEY)).toBeNull();
      expect(s.getItem(LEGACY_CACHE_KEYS.FARMS)).toBeNull();
    }
  });

  it('runs only once and survives corrupt JSON', () => {
    const s = new MemStorage();
    s.setItem(CACHE_KEYS.CURRENT_USER, me.id);
    s.setItem(LEGACY_CACHE_KEYS.MEMBERS, '{not json');
    s.setItem(LEGACY_CACHE_KEYS.PRODUCTS, 'null');
    expect(migrateLegacyCache(s).migrated).toBe(true);
    expect(s.getItem(LEGACY_CACHE_KEYS.MEMBERS)).toBeNull();
    expect(migrateLegacyCache(s).migrated).toBe(false);
  });
});

describe('Pending upload queue & server replacement', () => {
  it('enqueue replaces an entry with the same id', () => {
    const s = new MemStorage();
    enqueuePendingProduct(s, { id: 'prod-1', title: 'a' } as any);
    enqueuePendingProduct(s, { id: 'prod-1', title: 'b' } as any);
    enqueuePendingProduct(s, { id: 'prod-2', title: 'c' } as any);
    expect(readPendingUploads(s).products.map((p) => `${p.id}:${p.title}`)).toEqual(['prod-1:b', 'prod-2:c']);
  });

  it('[Regression] an item deleted on the server disappears from the device', () => {
    // บนเครื่องมี farm-deleted ค้างอยู่ แต่เซิร์ฟเวอร์ไม่มีแล้ว → ต้องหาย
    const remote = [{ id: 'farm-a' }, { id: 'farm-new' }];
    const result = replaceWithRemote(remote);
    expect(result.map((f) => f.id)).toEqual(['farm-a', 'farm-new']);
    expect(result.some((f) => f.id === 'farm-deleted')).toBe(false);
  });

  it('keeps queued items only when the server does not have them yet', () => {
    const remote = [{ id: 'prod-a', v: 'server' }];
    const keep = [{ id: 'prod-a', v: 'local' }, { id: 'prod-queued', v: 'local' }];
    expect(replaceWithRemote(remote, keep)).toEqual([
      { id: 'prod-a', v: 'server' },
      { id: 'prod-queued', v: 'local' },
    ]);
  });

  it('an empty server result really empties the list (no stale fallback)', () => {
    expect(replaceWithRemote([], [])).toEqual([]);
  });

  it('demo items are filtered out unless Demo Mode is on', () => {
    const env = process.env.NEXT_PUBLIC_DEMO_MODE;
    const items = [{ id: 'farm-001' }, { id: 'farm-1790000000000' }];
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    expect(withoutDemo('farms', items).map((f) => f.id)).toEqual(['farm-1790000000000']);
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    expect(withoutDemo('farms', items)).toHaveLength(2);
    process.env.NEXT_PUBLIC_DEMO_MODE = env;
  });
});
