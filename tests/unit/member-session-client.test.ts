import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * ฝั่ง client: localStorage เป็นแค่แคช เซิร์ฟเวอร์เป็นผู้ตัดสินว่ายังล็อกอินอยู่หรือไม่
 * และการออกจากระบบต้องไม่ถูกงานล็อกอินที่ค้างอยู่ตั้งผู้ใช้กลับมา
 */

const UID = 'U_ME';
const ME = { id: 'mem-me', fullName: 'นรภัทร', ownerUid: UID, lineUserId: UID, lineId: 'narapat', status: 'approved', role: 'member', roles: ['member'] };

let remote: Record<string, any[]> = {};
let releaseSync: (() => void) | null = null;
let holdSync = false;

vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  query: (c: { name: string }, ...filters: any[]) => ({ name: c.name, filters }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  doc: (_db: unknown, ...path: string[]) => ({ path }),
  getDocs: async (q: { name: string; filters?: Array<{ field: string; value: unknown }> }) => {
    if (holdSync) await new Promise<void>((r) => (releaseSync = r));
    let items = remote[q.name] || [];
    for (const f of q.filters || []) items = items.filter((x) => x[f.field] === f.value);
    return { empty: items.length === 0, docs: items.map((d) => ({ id: d.id, data: () => ({ ...d }) })) };
  },
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
}));
vi.mock('@/services/liffService', () => ({ liffService: { getIdToken: () => null } }));

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

describe('Member session (client)', () => {
  const env = process.env.NEXT_PUBLIC_DEMO_MODE;
  let ls: MemStorage;
  let win: EventTarget & { location: { href: string } };
  let sessionResponse: () => Promise<any>;

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false';
    holdSync = false;
    releaseSync = null;
    ls = new MemStorage();
    ls.setItem('nsw_current_user_v1', ME.id);
    ls.setItem('nsw_members_v2', JSON.stringify([ME]));
    remote = { members: [ME], farms: [], products: [], categories: [], practices: [], auditLogs: [], news: [] };
    sessionResponse = async () => ({ ok: true, status: 200, json: async () => ({ authenticated: true, lineUserId: UID }) });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url === '/api/auth/session' ? sessionResponse() : { ok: true, status: 200, json: async () => ({}) }))
    );
    vi.stubGlobal('localStorage', ls);
    vi.stubGlobal('sessionStorage', new MemStorage());
    win = Object.assign(new EventTarget(), { location: { href: 'http://localhost/' } });
    vi.stubGlobal('window', win);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = env;
    vi.unstubAllGlobals();
  });

  const load = async () => (await import('@/services/dataService')).dataService;

  it('keeps the user logged in while the server session belongs to them', async () => {
    const ds = await load();
    expect(await ds.reconcileSessionWithServer()).toBe('kept');
    expect(ds.getCurrentUser()?.id).toBe(ME.id);
  });

  it('logs out when the server has no session (expired or logged out elsewhere)', async () => {
    sessionResponse = async () => ({ ok: false, status: 401, json: async () => ({ authenticated: false }) });
    const ds = await load();
    expect(await ds.reconcileSessionWithServer()).toBe('logged_out');
    expect(ds.getCurrentUser()).toBeNull();
    expect(ls.getItem('nsw_current_user_v1')).toBe('guest');
  });

  it('logs out when the session belongs to a different LINE account', async () => {
    sessionResponse = async () => ({ ok: true, status: 200, json: async () => ({ authenticated: true, lineUserId: 'U_SOMEONE_ELSE' }) });
    const ds = await load();
    expect(await ds.reconcileSessionWithServer()).toBe('logged_out');
    expect(ds.getCurrentUser()).toBeNull();
  });

  it('does not log anyone out when the server cannot check (5xx) or the network is down', async () => {
    sessionResponse = async () => ({ ok: false, status: 500, json: async () => ({}) });
    let ds = await load();
    expect(await ds.reconcileSessionWithServer()).toBe('skipped');
    expect(ds.getCurrentUser()?.id).toBe(ME.id);

    vi.resetModules();
    sessionResponse = async () => {
      throw new TypeError('Failed to fetch');
    };
    ds = await load();
    expect(await ds.reconcileSessionWithServer()).toBe('skipped');
    expect(ds.getCurrentUser()?.id).toBe(ME.id);
  });

  it('a login still in progress when the user logs out does not log them back in', async () => {
    ls.setItem('nsw_current_user_v1', 'guest');
    const ds = await load();
    holdSync = true;
    const pending = ds.loginWithLineProfileAsync({ userId: UID, displayName: 'Narapat' });
    await Promise.resolve();
    ds.markLoggedOut(); // ผู้ใช้กดออกจากระบบระหว่างที่ระบบยังรอข้อมูล
    holdSync = false;
    releaseSync?.();
    const result = await pending;
    expect(result.isRegistered).toBe(false);
    expect(ds.getCurrentUser()).toBeNull();
    expect(ls.getItem('nsw_current_user_v1')).toBe('guest');
  });

  it('after an explicit logout, a leftover LINE profile cannot log the user back in', async () => {
    const ds = await load();
    ds.markLoggedOut();
    ls.setItem('nsw_user_logged_out', 'true');
    const result = ds.loginWithLineProfile({ userId: UID, displayName: 'Narapat' });
    expect(result.isRegistered).toBe(false);
    expect(ds.getCurrentUser()).toBeNull();
  });

  it('logging out in another tab logs this tab out too', async () => {
    const ds = await load();
    expect(ds.getCurrentUser()?.id).toBe(ME.id);
    win.dispatchEvent(Object.assign(new Event('storage'), { key: 'nsw_current_user_v1', newValue: 'guest' }));
    expect(ds.getCurrentUser()).toBeNull();
  });
});
