import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

/**
 * จัดการรูปแบบ Private Key ให้ถูกต้อง รองรับทั้งกรณีมี escape \\n หรือครอบด้วยเครื่องหมายคำพูด
 */
export function formatPrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  let trimmed = key.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    trimmed = trimmed.slice(1, -1);
  } else if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    trimmed = trimmed.slice(1, -1);
  }
  return trimmed.replace(/\\n/g, '\n').trim();
}

/**
 * ตรวจสอบว่ามี Credentials ของ Firebase Service Account ครบถ้วนหรือไม่
 */
export function isFirebaseAdminConfigured(): boolean {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  return !!(projectId && clientEmail && privateKey);
}

/**
 * รับ instance ของ Firebase Admin App แบบ Singleton (ป้องกันการ Initialize ซ้ำ)
 */
export function getFirebaseAdminApp(): App | null {
  if (adminApp) return adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'agrinature-network-nsw';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    return null;
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
    return adminApp;
  } catch (err) {
    console.error('[FirebaseAdmin] Failed to initialize Firebase Admin SDK:', err);
    return null;
  }
}

/**
 * เรียกใช้ Firebase Admin Auth
 */
export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  return app ? getAuth(app) : null;
}

/**
 * เรียกใช้ Firebase Admin Firestore
 */
export function getAdminDb(): Firestore | null {
  const app = getFirebaseAdminApp();
  return app ? getFirestore(app) : null;
}
