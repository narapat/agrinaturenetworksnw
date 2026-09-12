import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from './firebaseAdmin';

/**
 * เรียกใช้ Firebase Admin Auth แยกออกมาจาก firebaseAdmin.ts
 * ข้อห้ามเด็ดขาด (Architectural Invariant):
 * ห้าม import โมดูลนี้ใน Server Components, Layouts หรือ Pages โดยเด็ดขาด
 * เพื่อป้องกันการ evaluate โมดูล auth บนหน้าเว็บสาธารณะ (ให้ใช้เฉพาะใน Route Handlers / API routes เท่านั้น)
 */
export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
}
