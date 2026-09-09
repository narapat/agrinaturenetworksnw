import { describe, it, expect, beforeEach } from 'vitest';
import { dataService } from '@/services/dataService';
import { hasAdminRole, hasMemberRole, MemberProfile } from '@/types';

describe('Data Privacy, Leakage Prevention & Role RBAC Tests', () => {
  beforeEach(() => {
    // Reset or ensure dataService is in clean state
    dataService.switchUser('guest');
  });

  describe('1. Role-Based Access Control (RBAC)', () => {
    it('should correctly identify admin role from role or roles array', () => {
      const singleAdmin: Partial<MemberProfile> = { role: 'admin' };
      const multiRoleAdmin: Partial<MemberProfile> = { role: 'member', roles: ['member', 'admin'] };
      const standardMember: Partial<MemberProfile> = { role: 'member', roles: ['member'] };
      const guestUser: Partial<MemberProfile> = { role: 'guest', roles: [] };

      expect(hasAdminRole(singleAdmin as MemberProfile)).toBe(true);
      expect(hasAdminRole(multiRoleAdmin as MemberProfile)).toBe(true);
      expect(hasAdminRole(standardMember as MemberProfile)).toBe(false);
      expect(hasAdminRole(guestUser as MemberProfile)).toBe(false);
      expect(hasAdminRole(null)).toBe(false);
      expect(hasAdminRole(undefined)).toBe(false);
    });

    it('should correctly identify member role (excluding guest)', () => {
      const singleAdmin: Partial<MemberProfile> = { role: 'admin' };
      const standardMember: Partial<MemberProfile> = { role: 'member' };
      const guestUser: Partial<MemberProfile> = { role: 'guest' };

      expect(hasMemberRole(singleAdmin as MemberProfile)).toBe(true);
      expect(hasMemberRole(standardMember as MemberProfile)).toBe(true);
      expect(hasMemberRole(guestUser as MemberProfile)).toBe(false);
      expect(hasMemberRole(null)).toBe(false);
      expect(hasMemberRole(undefined)).toBe(false);
    });
  });

  describe('2. Farm Data Privacy (Zero-Leakage Guarantee)', () => {
    it('getPublicFarms() must NEVER expose internalCoordinates (GPS lat/long) to the public', () => {
      const publicFarms = dataService.getPublicFarms();
      expect(publicFarms.length).toBeGreaterThan(0);

      for (const farm of publicFarms) {
        // internalCoordinates must be completely omitted
        expect((farm as any).internalCoordinates).toBeUndefined();
        // publicZone approximate coordinates are allowed
        expect(farm.publicZone).toBeDefined();
        expect(typeof farm.publicZone.approxLat).toBe('number');
      }
    });

    it('getPublicFarms() must hide phone number when isPublicPhone is false', () => {
      const publicFarms = dataService.getPublicFarms();
      const privatePhoneFarms = publicFarms.filter((f) => !f.isPublicPhone);

      expect(privatePhoneFarms.length).toBeGreaterThan(0);
      for (const farm of privatePhoneFarms) {
        expect(farm.phone).toBeUndefined();
      }
    });

    it('getFarmById() for public inspection must sanitize private contacts and coordinates', () => {
      const allFarms = dataService.getPublicFarms();
      const testFarm = allFarms.find((f) => !f.isPublicPhone);
      expect(testFarm).toBeDefined();

      const retrieved = dataService.getFarmById(testFarm!.id);
      expect(retrieved).toBeDefined();
      expect((retrieved as any).internalCoordinates).toBeUndefined();
      expect(retrieved?.phone).toBeUndefined();
    });
  });

  describe('3. Product Catalog Privacy & Filtering', () => {
    it('getPublicProducts() must hide products marked with status "hidden"', () => {
      const publicProducts = dataService.getPublicProducts();
      const hiddenProducts = publicProducts.filter((p) => p.status === 'hidden');
      expect(hiddenProducts.length).toBe(0);
    });

    it('getPublicProducts() must omit phone when isPublicPhone is false', () => {
      const publicProducts = dataService.getPublicProducts();
      const privateProducts = publicProducts.filter((p) => !p.isPublicPhone);

      expect(privateProducts.length).toBeGreaterThan(0);
      for (const prod of privateProducts) {
        expect(prod.phone).toBeUndefined();
      }
    });

    it('getPublicProducts() should retain phone when isPublicPhone is true', () => {
      const publicProducts = dataService.getPublicProducts();
      const publicPhoneProducts = publicProducts.filter((p) => p.isPublicPhone && p.phone);

      expect(publicPhoneProducts.length).toBeGreaterThan(0);
      for (const prod of publicPhoneProducts) {
        expect(prod.phone).toBeTruthy();
      }
    });
  });

  describe('4. Privacy Toggle Dynamic Updates', () => {
    it('updateContactPrivacy should toggle visibility of phone in public views', () => {
      const memberId = 'mem-001';
      const member = dataService.getMemberById(memberId);
      expect(member).toBeDefined();

      // Step A: Set to private (false)
      dataService.updateContactPrivacy(memberId, false, false);
      let farm = dataService.getFarmByMemberId(memberId);
      expect(farm?.phone).toBeUndefined();

      // Step B: Set to public (true)
      dataService.updateContactPrivacy(memberId, true, true);
      farm = dataService.getFarmByMemberId(memberId);
      expect(farm?.phone).toBe(member?.phone);

      // Reset back to safe default
      dataService.updateContactPrivacy(memberId, false, false);
    });
  });
});
