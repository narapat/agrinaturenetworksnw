'use client';

import type { CategoryTag, FarmPracticeTag, NewsEvent, Product, ProductCategory, PracticeCategory } from '@/types';

/**
 * Client สำหรับ Admin Server API (/api/admin/*)
 *
 * - ทุกการกระทำของแอดมินไปผ่าน server (Admin SDK) ไม่เขียน Firestore จากเบราว์เซอร์โดยตรง
 * - ยืนยันตัวตนด้วย admin session cookie (ส่งอัตโนมัติ) + LINE ID Token ถ้ามี
 * - คำขอที่ล้มเหลว throw AdminApiError พร้อมข้อความภาษาไทยจาก server — ผู้เรียกต้องแสดงให้ผู้ใช้เห็น
 */

export class AdminApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface AdminSessionInfo {
  authenticated: boolean;
  method?: 'line' | 'passcode';
  actorName?: string;
  expiresAt?: number;
}

export interface AdminSnapshot {
  members: any[];
  farms: any[];
  products: Product[];
  categories: CategoryTag[];
  practices: FarmPracticeTag[];
  news: NewsEvent[];
  auditLogs: any[];
  fetchedAt: string;
}

async function lineAuthHeader(): Promise<Record<string, string>> {
  try {
    const { liffService } = await import('./liffService');
    const token = liffService.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function adminFetch<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(await lineAuthHeader()) };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method || 'GET',
      headers,
      credentials: 'same-origin',
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new AdminApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const fallback =
      res.status === 401
        ? 'หมดเวลาการเข้าสู่ระบบแอดมิน กรุณาเข้าสู่ระบบใหม่'
        : `เกิดข้อผิดพลาด (HTTP ${res.status})`;
    throw new AdminApiError(data?.message || fallback, res.status);
  }
  return data as T;
}

const enc = encodeURIComponent;

export const adminApi = {
  session: async (): Promise<AdminSessionInfo> => {
    const res = await fetch('/api/admin/auth', { headers: await lineAuthHeader(), credentials: 'same-origin' });
    if (!res.ok) return { authenticated: false };
    return res.json();
  },

  snapshot: () => adminFetch<AdminSnapshot>('/api/admin/snapshot'),

  // สมาชิก
  approveMember: (memberId: string) =>
    adminFetch(`/api/admin/members/${enc(memberId)}`, { method: 'POST', body: { action: 'approve' } }),
  rejectMember: (memberId: string, reason?: string) =>
    adminFetch(`/api/admin/members/${enc(memberId)}`, { method: 'POST', body: { action: 'reject', reason } }),
  deleteMember: (memberId: string) => adminFetch(`/api/admin/members/${enc(memberId)}`, { method: 'DELETE' }),

  // ช่วยลงข้อมูล
  assistAddProduct: (body: {
    memberId: string;
    skuTagId: string;
    title: string;
    price: number;
    unit?: string;
    description?: string;
    images?: string[];
  }) => adminFetch<{ product: Product }>('/api/admin/assist-product', { method: 'POST', body }),

  // ผลผลิตของแปลง
  updateProduct: (
    id: string,
    body: Partial<Pick<Product, 'title' | 'price' | 'unit' | 'description' | 'status' | 'skuTagId'>>
  ) => adminFetch<{ product: Product }>(`/api/admin/products/${enc(id)}`, { method: 'PATCH', body }),
  deleteProduct: (id: string) => adminFetch(`/api/admin/products/${enc(id)}`, { method: 'DELETE' }),

  // ชนิดผลผลิต (SKU)
  addCategory: (body: { name: string; category: ProductCategory; icon?: string; description?: string }) =>
    adminFetch<{ category: CategoryTag }>('/api/admin/categories', { method: 'POST', body }),
  updateCategory: (id: string, body: Partial<Omit<CategoryTag, 'id'>>) =>
    adminFetch<{ category: CategoryTag; updatedProductCount: number }>(`/api/admin/categories/${enc(id)}`, {
      method: 'PATCH',
      body,
    }),
  deleteCategory: (id: string, targetId?: string) =>
    adminFetch<{ deletedName: string; reassignedCount: number }>(
      `/api/admin/categories/${enc(id)}${targetId ? `?targetId=${enc(targetId)}` : ''}`,
      { method: 'DELETE' }
    ),

  // วิถี/ศาสตร์
  addPractice: (body: { name: string; category: PracticeCategory; icon?: string; description?: string }) =>
    adminFetch<{ practice: FarmPracticeTag }>('/api/admin/practices', { method: 'POST', body }),
  updatePractice: (id: string, body: Partial<Pick<FarmPracticeTag, 'name' | 'category' | 'icon' | 'description' | 'isActive'>>) =>
    adminFetch<{ practice: FarmPracticeTag; updatedFarmCount: number }>(`/api/admin/practices/${enc(id)}`, {
      method: 'PATCH',
      body,
    }),
  deletePractice: (id: string, targetId?: string) =>
    adminFetch<{ deletedName: string; reassignedCount: number }>(
      `/api/admin/practices/${enc(id)}${targetId ? `?targetId=${enc(targetId)}` : ''}`,
      { method: 'DELETE' }
    ),

  // ข่าวสาร
  addNews: (body: Omit<NewsEvent, 'id' | 'createdAt' | 'updatedAt'>) =>
    adminFetch<{ news: NewsEvent }>('/api/admin/news', { method: 'POST', body }),
  updateNews: (id: string, body: Partial<Omit<NewsEvent, 'id' | 'createdAt' | 'updatedAt'>>) =>
    adminFetch<{ news: NewsEvent }>(`/api/admin/news/${enc(id)}`, { method: 'PATCH', body }),
  deleteNews: (id: string) => adminFetch(`/api/admin/news/${enc(id)}`, { method: 'DELETE' }),
};
