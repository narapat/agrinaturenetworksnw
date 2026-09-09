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
        if (liff.isLoggedIn()) {
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
      sessionStorage.setItem('nsw_auth_redirect', redirectPath);
      await this.init();

      if (this.liffInstance) {
        if (this.liffInstance.isLoggedIn()) {
          // ถ้าล็อกอินอยู่แล้ว
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
   * ออกจากระบบ LINE
   */
  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      if (this.liffInstance && this.liffInstance.isLoggedIn()) {
        this.liffInstance.logout();
      }
      this.currentProfile = null;
      try {
        sessionStorage.removeItem('nsw_line_profile');
        sessionStorage.removeItem('nsw_auth_redirect');
      } catch {}
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
