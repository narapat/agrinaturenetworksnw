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
        console.warn('LINE Auth Bridge HTTP status:', res.status);
        return false;
      }

      const data = await res.json();
      if (data.success && data.customToken) {
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        if (auth) {
          await signInWithCustomToken(auth, data.customToken);
          console.log('[Auth Bridge] Successfully authenticated with Firebase Custom Token! Role:', data.role);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.warn('LINE Auth Bridge notice:', err);
      return false;
    }
  }

  /**
   * ออกจากระบบ LINE และระบบทั้งหมด (Sign Out)
   */
  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      // 1. ตั้งสถานะ Explicit Logout
      try {
        localStorage.setItem('nsw_user_logged_out', 'true');
        sessionStorage.setItem('nsw_user_logged_out', 'true');
        sessionStorage.removeItem('nsw_line_profile');
        sessionStorage.removeItem('nsw_auth_redirect');
        // ล้างข้อมูลแคชที่อาจมีข้อมูลส่วนตัวในเครื่องสาธารณะ
        localStorage.removeItem('nsw_members_v1');
        localStorage.removeItem('nsw_admin_session');
        localStorage.removeItem('nsw_current_user');
      } catch {}

      // 2. ออกจากระบบ Firebase Authentication
      try {
        const { signOut } = await import('firebase/auth');
        const { auth } = await import('./firebase');
        if (auth && auth.currentUser) {
          await signOut(auth);
        }
      } catch (signOutErr) {
        console.warn('Firebase Auth signOut notice:', signOutErr);
      }

      // 3. ออกจากระบบ LINE LIFF SDK
      if (this.liffInstance && this.liffInstance.isLoggedIn()) {
        try {
          this.liffInstance.logout();
        } catch (liffErr) {
          console.warn('LIFF logout notice:', liffErr);
        }
      }
      this.currentProfile = null;

      // 4. ส่งคำขอไปยังเซิร์ฟเวอร์เพื่อลบ HTTP-Only Cookie
      try {
        await fetch('/api/admin/auth', { method: 'DELETE', keepalive: true });
      } catch {}

      // 5. ล้างค่าใน local storage
      dataService.clearAdminSession();
      dataService.switchUser('guest');

      // 6. นำทางกลับหน้าแรก
      window.location.href = '/';
    } catch (err) {
      console.error('Error logging out:', err);
      dataService.clearAdminSession();
      dataService.switchUser('guest');
      window.location.href = '/';
    }
  }

  isLoggedIn(): boolean {
    return !!this.liffInstance && this.liffInstance.isLoggedIn();
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
