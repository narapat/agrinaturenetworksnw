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
  private isInitializing: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private currentProfile: LineUserProfile | null = null;

  /**
   * เริ่มต้นการเชื่อมต่อ LINE LIFF SDK
   */
  async init(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (this.liffInstance) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.isInitializing = true;
        const liffModule = await import('@line/liff');
        const liff = liffModule.default;

        await liff.init({ liffId: LIFF_ID });
        this.liffInstance = liff;

        // ตรวจสอบสถานะการ Login
        if (liff.isLoggedIn()) {
          try {
            const profile = await liff.getProfile();
            this.currentProfile = {
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              statusMessage: profile.statusMessage,
            };

            // ซิงค์เข้ากับระบบสมาชิก dataService อัตโนมัติ
            const { member } = dataService.loginWithLineProfile(this.currentProfile);

            // ตรวจสอบหน้าปลายทางที่บันทึกไว้ใน session
            const savedRedirect = sessionStorage.getItem('nsw_auth_redirect');
            if (savedRedirect) {
              sessionStorage.removeItem('nsw_auth_redirect');
              const farm = member.farmId 
                ? (dataService.getFarmById(member.farmId) || dataService.getFarmByMemberId(member.id))
                : dataService.getFarmByMemberId(member.id);

              let target = savedRedirect;
              if (savedRedirect === '/member/dashboard') {
                target = farm ? '/member/dashboard' : '/member/create-farm';
              }
              if (window.location.pathname !== target) {
                window.location.replace(target);
              }
            }
          } catch (profileErr) {
            console.warn('LIFF: Could not fetch profile despite isLoggedIn = true:', profileErr);
          }
        } else {
          // หากผู้ใช้เข้ามาผ่านลิงก์ที่มี ?liff.referrer แสดงว่าเปิดผ่านภายนอกและ LIFF ดีดกลับมา
          const params = new URLSearchParams(window.location.search);
          if (params.has('liff.referrer') && !liff.isInClient()) {
            console.log('LIFF: Detected liff.referrer, initiating LINE OAuth login...');
            // ล้าง liff.referrer ออกจาก URL history เพื่อป้องกันการ redirect วนซ้ำ
            window.history.replaceState({}, document.title, window.location.pathname);
            sessionStorage.setItem('nsw_auth_redirect', '/member/dashboard');
            try {
              const redirectUri = window.location.origin + '/member/dashboard';
              liff.login({ redirectUri });
            } catch (loginErr) {
              liff.login();
            }
            return false;
          }
        }

        // จัดการ deep-link (liff.state)
        const urlParams = new URLSearchParams(window.location.search);
        const liffState = urlParams.get('liff.state');
        if (liffState) {
          const target = decodeURIComponent(liffState);
          if (target.startsWith('/') && target !== window.location.pathname) {
            window.location.replace(target);
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
      sessionStorage.setItem('nsw_auth_redirect', redirectPath);
      await this.init();

      if (this.liffInstance) {
        if (this.liffInstance.isLoggedIn()) {
          // ถ้าล็อกอินอยู่แล้ว นำทางไปหน้าที่ต้องการทันที
          const user = dataService.getCurrentUser();
          if (user && user.role === 'member') {
            const farm = user.farmId 
              ? (dataService.getFarmById(user.farmId) || dataService.getFarmByMemberId(user.id))
              : dataService.getFarmByMemberId(user.id);
            if (redirectPath === '/member/dashboard') {
              window.location.href = farm ? '/member/dashboard' : '/member/create-farm';
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
   * ออกจากระบบ LINE
   */
  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      if (this.liffInstance && this.liffInstance.isLoggedIn()) {
        this.liffInstance.logout();
      }
      this.currentProfile = null;
      dataService.switchUser('guest');
      window.location.href = '/';
    } catch (err) {
      console.error('Error logging out from LINE:', err);
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
    return this.currentProfile;
  }
}

export const liffService = new LiffService();
