'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dataService } from '@/services/dataService';
import { adminApi, type AdminSessionInfo } from '@/services/adminApi';
import type { AuditLog, CategoryTag, Farm, FarmPracticeTag, MemberProfile, NewsEvent, Product } from '@/types';

/**
 * ข้อมูลและสถานะที่ใช้ร่วมกันทุกหน้าย่อยของ /admin
 *
 * - โหลดครั้งเดียวจาก GET /api/admin/snapshot แล้วคงอยู่ระหว่างการสลับหน้า (อยู่ใน layout)
 * - runAction(): ทุกการกระทำของแอดมินผ่านตัวนี้ — รอผลจริง แสดงข้อผิดพลาด แล้วโหลดข้อมูลใหม่จาก server
 */

export const LINE_ONLY_HINT = 'การลบย้อนกลับไม่ได้ ต้องเข้าสู่ระบบแอดมินด้วย LINE';

interface AdminDataValue {
  // ข้อมูล
  currentUser: MemberProfile | null;
  pendingMembers: MemberProfile[];
  rejectedMembers: MemberProfile[];
  allMembers: MemberProfile[];
  assistQueue: MemberProfile[];
  categories: CategoryTag[];
  practices: FarmPracticeTag[];
  newsList: NewsEvent[];
  auditLogs: AuditLog[];
  /** ผลผลิตและแปลงจาก server โดยตรง (ไม่ปนข้อมูลตัวอย่างที่ฝั่ง client อาจเติมเข้ามา) */
  products: Product[];
  farms: Farm[];

  // สถานะ session
  session: AdminSessionInfo;
  isPasscodeSession: boolean;
  actorName: string;

  // สถานะการโหลด / ข้อผิดพลาด
  isSyncing: boolean;
  lastSyncTime: string;
  syncError: string | null;
  actionError: string | null;
  setActionError: (msg: string | null) => void;
  busyKey: string | null;

  refreshFromServer: () => Promise<void>;
  runAction: <T>(key: string, fn: () => Promise<T>, onError?: (message: string) => void) => Promise<T | null>;
}

const AdminDataContext = createContext<AdminDataValue | null>(null);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<MemberProfile | null>(null);
  const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
  const [categories, setCategories] = useState<CategoryTag[]>([]);
  const [practices, setPractices] = useState<FarmPracticeTag[]>([]);
  const [newsList, setNewsList] = useState<NewsEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);

  const [session, setSession] = useState<AdminSessionInfo>({ authenticated: false });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadFromCache = useCallback(() => {
    setCurrentUser(dataService.getCurrentUser());
    setAllMembers([...dataService.getAllMembers()]);
    setCategories([...dataService.getCategories()]);
    setPractices([...dataService.getPractices()]);
    setNewsList([...dataService.getNews(true)]);
    setAuditLogs([...dataService.getAuditLogs()]);
    setLastSyncTime(dataService.getLastSyncTime());
  }, []);

  /** ดึงข้อมูลล่าสุดจาก server (Admin SDK) — server เป็นแหล่งความจริงเพียงแหล่งเดียว */
  const refreshFromServer = useCallback(async () => {
    setIsSyncing(true);
    try {
      const snap = await adminApi.snapshot();
      dataService.applyAdminSnapshot(snap);
      setProducts(snap.products);
      setFarms(snap.farms as Farm[]);
      setSyncError(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ');
    } finally {
      loadFromCache();
      setIsSyncing(false);
    }
  }, [loadFromCache]);

  useEffect(() => {
    adminApi.session().then(setSession).catch(() => {});
    refreshFromServer();
  }, [refreshFromServer]);

  const runAction = useCallback(
    async <T,>(key: string, fn: () => Promise<T>, onError?: (message: string) => void): Promise<T | null> => {
      setBusyKey(key);
      setActionError(null);
      try {
        const result = await fn();
        await refreshFromServer();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        if (onError) onError(message);
        else setActionError(message);
        return null;
      } finally {
        setBusyKey(null);
      }
    },
    [refreshFromServer]
  );

  const value = useMemo<AdminDataValue>(() => {
    const isPasscodeSession = session.method === 'passcode';
    return {
      currentUser,
      allMembers,
      pendingMembers: allMembers.filter((m) => m.status === 'pending'),
      rejectedMembers: allMembers.filter((m) => m.status === 'rejected'),
      assistQueue: allMembers.filter((m) => m.delegationStatus === 'requested'),
      categories,
      practices,
      newsList,
      auditLogs,
      products,
      farms,
      session,
      isPasscodeSession,
      actorName: session.actorName || currentUser?.fullName || 'แอดมินเครือข่าย',
      isSyncing,
      lastSyncTime,
      syncError,
      actionError,
      setActionError,
      busyKey,
      refreshFromServer,
      runAction,
    };
  }, [
    currentUser, allMembers, categories, practices, newsList, auditLogs, products, farms, session,
    isSyncing, lastSyncTime, syncError, actionError, busyKey, refreshFromServer, runAction,
  ]);

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData ต้องใช้ภายใน <AdminDataProvider> (src/app/admin/layout.tsx)');
  return ctx;
}
