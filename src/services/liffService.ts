'use client';

import { dataService } from './dataService';

export const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '2011512009-Zjd5Loph';

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

class LiffService {
  private liffInstance: any = null;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private currentProfile: LineUserProfile | null = null;
  private authBridgeFailed: boolean = false;
  private authBridgeErrorMessage: string = '';

  isAuthBridgeFailed(): boolean {
    return this.authBridgeFailed;
  }

  getAuthBridgeErrorMessage(): string {
    return this.authBridgeErrorMessage;
  }

  /**
   * เริ่มต้นการเชื่อมต่อ LINE LIFF SDK (ป้องกันการเรียกซ้ำ 100%)
   */
  async init(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (this.isInitialized && this.liffInstance) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.isInitializing = true;

        // 0. เซิร์ฟเวอร์เป็นผู้ตัดสินว่ายังล็อกอินอยู่หรือไม่ (session หมดอายุ / ออกจากระบบแล้ว -> กลับเป็น guest)
        //    ทำก่อน LIFF เพราะ LIFF อาจโหลดไม่ขึ้น และต้องไม่ปล่อยให้แคชในเครื่องค้างสถานะล็อกอินไว้
        try {
          await dataService.reconcileSessionWithServer();
        } catch (sessionErr) {
          console.warn('Session check notice:', sessionErr);
        }

        const liffModule = await import('@line/liff');
        const liff = liffModule.default;

        await liff.init({ liffId: LIFF_ID });
        this.liffInstance = liff;
        this.isInitialized = true;

        // จัดการกรณี deep linking liff.state เพียงครั้งเดียว และลบ query string ออกจาก URL ทันที
        const urlParams = new URLSearchParams(window.location.search);
        const liffState = urlParams.get('liff.state');
        if (liffState) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('liff.state');
          cleanUrl.searchParams.delete('liff.referrer');
          window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);

          const target = decodeURIComponent(liffState);
          if (target.startsWith('/') && target !== window.location.pathname) {
            window.location.replace(target);
            return true;
          }
        }

        // ล้าง liff.referrer ออกจาก URL ป้องกันลูป
        if (urlParams.has('liff.referrer')) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('liff.referrer');
          window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
        }

        // ตรวจสอบสถานะการ Login
        const isUserLoggedOut = typeof window !== 'undefined' && 
          (localStorage.getItem('nsw_user_logged_out') === 'true' || 
           sessionStorage.getItem('nsw_user_logged_out') === 'true');

        if (liff.isLoggedIn() && !isUserLoggedOut) {
          try {
            const profile = await liff.getProfile();
            this.currentProfile = {
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              statusMessage: profile.statusMessage,
            };

            // บันทึกลง sessionStorage เพื่อให้หน้าลงทะเบียนดึงไปแสดงผล/พรีฟิลข้อมูลได้ทันที
            try {
              sessionStorage.setItem('nsw_line_profile', JSON.stringify(this.currentProfile));
            } catch {}

            // ซิงค์ Token กับ Firebase Auth Bridge (เชื่อมต่อ LINE ID กับ Firebase Auth)
            await this.syncFirebaseAuthBridge();

            // ตรวจสอบกับระบบสมาชิกเครือข่าย (รอ Firestore sync เพื่อให้ได้ข้อมูลจริงล่าสุด)
            const { member, isRegistered } = await dataService.loginWithLineProfileAsync(this.currentProfile);

            if (isRegistered && member) {
              // กรณีเป็นสมาชิกแล้ว: ถ้ามีบันทึกปลายทางไว้จากการกดปุ่มเข้าสู่ระบบ ให้พาไปหน้าแปลง
              const savedRedirect = sessionStorage.getItem('nsw_auth_redirect');
              if (savedRedirect) {
                sessionStorage.removeItem('nsw_auth_redirect');
                const farm = member.farmId 
                  ? (dataService.getFarmById(member.farmId) || dataService.getFarmByMemberId(member.id))
                  : dataService.getFarmByMemberId(member.id);

                const target = savedRedirect === '/member/dashboard'
                  ? (farm ? '/member/dashboard' : '/member/create-farm')
                  : savedRedirect;

                if (window.location.pathname !== target) {
                  window.location.replace(target);
                }
              }
            } else {
              // ยังไม่เคยลงทะเบียน: แจ้งเตือนคอมโพเนนต์ต่างๆ ให้ทราบว่ามีโปรไฟล์ LINE เชื่อมต่ออยู่
              // ปล่อยให้แต่ละหน้า (เช่น dashboard) จัดการ router.replace เอง ไม่ใช้ window.location.href ใน init
              window.dispatchEvent(new Event('nsw_data_updated'));
            }
          } catch (profileErr) {
            console.warn('LIFF: Could not fetch profile despite isLoggedIn = true:', profileErr);
          }
        }

        return true;
      } catch (err: any) {
        console.warn('LIFF initialization notice:', err?.message || err);
        return false;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  /**
   * ดำเนินการเข้าสู่ระบบด้วย LINE (รองรับทั้ง Desktop, Mobile Browser และใน LINE App)
   */
  async login(redirectPath: string = '/member/dashboard'): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      try {
        localStorage.removeItem('nsw_user_logged_out');
        sessionStorage.removeItem('nsw_user_logged_out');
      } catch {}
      sessionStorage.setItem('nsw_auth_redirect', redirectPath);
      await this.init();

      if (this.liffInstance) {
        if (this.liffInstance.isLoggedIn()) {
          // ถ้าล็อกอินอยู่แล้ว
          await this.syncFirebaseAuthBridge();
          const profile = this.currentProfile || (await this.liffInstance.getProfile());
          if (profile) {
            this.currentProfile = profile;
            const { member, isRegistered } = await dataService.loginWithLineProfileAsync(profile);
            if (isRegistered && member) {
              const farm = member.farmId 
                ? (dataService.getFarmById(member.farmId) || dataService.getFarmByMemberId(member.id))
                : dataService.getFarmByMemberId(member.id);
              window.location.href = farm ? '/member/dashboard' : '/member/create-farm';
              return;
            } else {
              // ยังไม่ได้เป็นสมาชิก -> ไปหน้าลงทะเบียน
              window.location.href = '/member/register?from_line=1';
              return;
            }
          }
          window.location.href = redirectPath;
          return;
        }

        // ยังไม่ล็อกอิน -> เรียก liff.login() เพื่อเปิดหน้า LINE Login OAuth ทางการ
        try {
          const redirectUri = window.location.origin + redirectPath;
          this.liffInstance.login({ redirectUri });
        } catch {
          this.liffInstance.login();
        }
      } else {
        // Fallback: ถ้า LIFF init ไม่ผ่าน ให้ส่งไปยัง LIFF URL โดยตรง
        window.location.href = `https://liff.line.me/${LIFF_ID}`;
      }
    } catch (err) {
      console.error('Error logging in with LINE:', err);
      window.location.href = `https://liff.line.me/${LIFF_ID}`;
    }
  }

  /**
   * เชื่อมต่อ LINE ID Token กับ Firebase Auth (Firebase Custom Token Bridge)
   */
  async syncFirebaseAuthBridge(): Promise<boolean> {
    if (typeof window === 'undefined' || !this.liffInstance) return false;
    try {
      if (!this.liffInstance.isLoggedIn()) return false;
      const idToken = this.liffInstance.getIDToken();
      if (!idToken) return false;

      const res = await fetch('/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        this.authBridgeFailed = true;
        this.authBridgeErrorMessage = errorData.message || errorData.error || `HTTP ${res.status}`;
        console.error(`[Auth Bridge Error] HTTP status ${res.status}: Failed to synchronize LINE ID Token with Firebase Auth:`, errorData);
        window.dispatchEvent(new Event('nsw_auth_bridge_failed'));
        return false;
      }

      const data = await res.json();
      if (data.success && data.customToken) {
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        if (auth) {
          await signInWithCustomToken(auth, data.customToken);
          this.authBridgeFailed = false;
          this.authBridgeErrorMessage = '';
          console.log('[Auth Bridge] Successfully authenticated with Firebase Custom Token! Role:', data.role);
          window.dispatchEvent(new Event('nsw_auth_bridge_success'));
          return true;
        }
      }

      this.authBridgeFailed = true;
      this.authBridgeErrorMessage = data.message || 'ไม่ได้รับ Firebase Custom Token จากเซิร์ฟเวอร์';
      console.error('[Auth Bridge Error] Response did not contain a valid customToken:', data);
      window.dispatchEvent(new Event('nsw_auth_bridge_failed'));
      return false;
    } catch (err: any) {
      this.authBridgeFailed = true;
      this.authBridgeErrorMessage = err?.message || 'ข้อผิดพลาดเครือข่ายในการติดต่อ Auth Bridge';
      console.error('[Auth Bridge Error] Network or runtime error during LINE Auth Bridge sync:', err);
      window.dispatchEvent(new Event('nsw_auth_bridge_failed'));
      return false;
    }
  }

  /**
   * ออกจากระบบ LINE และระบบทั้งหมด (Sign Out)
   */
  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    this.authBridgeFailed = false;
    this.authBridgeErrorMessage = '';
    this.currentProfile = null;

    // 1. ตั้งสถานะ Explicit Logout และกลับเป็น guest ทันที
    //    (ยกเลิกงานล็อกอินที่ยังค้างอยู่ ไม่ให้มันตั้งผู้ใช้กลับมาหลังกดออก)
    try {
      localStorage.setItem('nsw_user_logged_out', 'true');
      sessionStorage.setItem('nsw_user_logged_out', 'true');
      sessionStorage.removeItem('nsw_line_profile');
      sessionStorage.removeItem('nsw_auth_redirect');
      localStorage.removeItem('nsw_members_v1');
      localStorage.removeItem('nsw_admin_session');
      localStorage.removeItem('nsw_current_user');
    } catch {}
    try {
      dataService.markLoggedOut();
      dataService.clearAdminSession();
    } catch (e) {
      console.warn('Local logout notice:', e);
    }

    // 2. ลบ session ฝั่งเซิร์ฟเวอร์ (สมาชิก + แอดมิน) รอให้เสร็จก่อนออกจากหน้า
    await Promise.allSettled([
      fetch('/api/auth/session', { method: 'DELETE', keepalive: true }),
      fetch('/api/admin/auth', { method: 'DELETE', keepalive: true }),
    ]);

    // 3. ออกจากระบบ Firebase Authentication
    //    รอให้ Firebase โหลดสถานะผู้ใช้เสร็จก่อน ไม่งั้น currentUser ยังเป็น null แล้วข้ามการ signOut ไป
    try {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('./firebase');
      if (auth) {
        if (typeof auth.authStateReady === 'function') {
          await auth.authStateReady();
        }
        if (auth.currentUser) {
          await signOut(auth);
        }
      }
    } catch (signOutErr) {
      console.warn('Firebase Auth signOut notice:', signOutErr);
    }

    // 4. ออกจากระบบ LINE LIFF SDK (ลบ token ของ LINE ที่เก็บในเบราว์เซอร์)
    try {
      if (this.liffInstance && this.liffInstance.isLoggedIn()) {
        this.liffInstance.logout();
      }
    } catch (liffErr) {
      console.warn('LIFF logout notice:', liffErr);
    }

    // 5. กลับหน้าแรก
    window.location.replace('/');
  }

  isLoggedIn(): boolean {
    return !!this.liffInstance && this.liffInstance.isLoggedIn();
  }

  getIdToken(): string | null {
    if (this.liffInstance && this.liffInstance.isLoggedIn()) {
      return this.liffInstance.getIDToken();
    }
    return null;
  }

  isInClient(): boolean {
    return !!this.liffInstance && this.liffInstance.isInClient();
  }

  getProfile(): LineUserProfile | null {
    if (this.currentProfile) return this.currentProfile;
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('nsw_line_profile');
        if (stored) {
          this.currentProfile = JSON.parse(stored);
          return this.currentProfile;
        }
      } catch {}
    }
    return null;
  }
}

export const liffService = new LiffService();
