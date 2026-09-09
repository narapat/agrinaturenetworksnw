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

            // ตรวจสอบกับระบบสมาชิกเครือข่าย
            const { member, isRegistered } = dataService.loginWithLineProfile(this.currentProfile);

            if (isRegistered && member) {
              // กรณีเป็นสมาชิกแล้ว: ถ้ามีบันทึกปลายทางไว้ หรืออยู่ในหน้าลงทะเบียน ให้พาไปหน้าแปลง
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
                  window.location.href = target;
                }
              }
            } else {
              // กรณีล็อกอินผ่าน LINE สำเร็จ แต่ยังไม่เคยลงทะเบียนสมาชิก:
              // ถ้าผู้ใช้พยายามเข้าหน้าแดชบอร์ด ให้พาไปหน้าลงทะเบียนพร้อมส่งค่า LINE ไปด้วย
              if (window.location.pathname === '/member/dashboard' || window.location.pathname === '/member/create-farm') {
                window.location.href = '/member/register?from_line=1';
              }
              // แจ้งเตือนคอมโพเนนต์ต่างๆ ให้ทราบว่ามีโปรไฟล์ LINE เชื่อมต่ออยู่
              window.dispatchEvent(new Event('nsw_data_updated'));
            }
          } catch (profileErr) {
            console.warn('LIFF: Could not fetch profile despite isLoggedIn = true:', profileErr);
          }
        } else {
          // หากผู้ใช้เข้ามาผ่านลิงก์ที่มี ?liff.referrer ในเบราว์เซอร์ภายนอก (ไม่ใช่ใน LINE app)
          const params = new URLSearchParams(window.location.search);
          if (params.has('liff.referrer') && !liff.isInClient()) {
            console.log('LIFF: Detected liff.referrer in external browser, initiating LINE OAuth login...');
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
            const { member, isRegistered } = dataService.loginWithLineProfile(profile);
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
