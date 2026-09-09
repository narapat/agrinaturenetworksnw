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

  describe('5. SKU Management, Editing, and Reassignment (Zero Product Loss)', () => {
    it('updateCategoryTag should update SKU details and cascade to attached products', () => {
      const categories = dataService.getCategories();
      const testCat = categories[0];
      expect(testCat).toBeDefined();

      const origName = testCat.name;
      const updated = dataService.updateCategoryTag(testCat.id, {
        name: 'กล้วยน้ำว้าทองคำพระราชทาน',
        icon: '🍌✨',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('กล้วยน้ำว้าทองคำพระราชทาน');
      expect(updated?.icon).toBe('🍌✨');

      // Verify cascade update on products attached to this SKU
      const attachedProducts = dataService.getPublicProducts().filter((p) => p.skuTagId === testCat.id);
      if (attachedProducts.length > 0) {
        for (const p of attachedProducts) {
          expect(p.skuTagName).toBe('กล้วยน้ำว้าทองคำพระราชทาน');
        }
      }

      // Revert name back to original
      dataService.updateCategoryTag(testCat.id, { name: origName, icon: testCat.icon });
    });

    it('deleteCategoryTagWithReassign should migrate products to target SKU before deletion', () => {
      // Step A: Create a temporary SKU
      const tempSku = dataService.addCategoryTag({
        name: 'ผลผลิตทดสอบชั่วคราว',
        icon: '🧪',
        category: 'raw',
        description: 'หมวดทดสอบสำหรับการลบและโยกย้าย',
        isActive: true,
      });
      expect(tempSku.id).toBeDefined();

      // Step B: Attach a product to this temp SKU
      const products = dataService.getPublicProducts();
      expect(products.length).toBeGreaterThan(0);
      const testProd = products[0];
      const origSkuTagId = testProd.skuTagId;
      const origSkuTagName = testProd.skuTagName;

      dataService.updateProduct(testProd.id, {
        skuTagId: tempSku.id,
        skuTagName: tempSku.name,
      });

      const pInfo = dataService.getProductCountBySku(tempSku.id);
      expect(pInfo.count).toBeGreaterThanOrEqual(1);

      // Step C: Delete tempSku and reassign to another SKU (e.g. origSkuTagId)
      const res = dataService.deleteCategoryTagWithReassign(tempSku.id, origSkuTagId);
      expect(res.success).toBe(true);
      expect(res.reassignedCount).toBeGreaterThanOrEqual(1);

      // Verify tempSku is removed from categories
      const remainingCats = dataService.getCategories();
      expect(remainingCats.some((c) => c.id === tempSku.id)).toBe(false);

      // Verify product was migrated to origSkuTagId
      const checkProd = dataService.getRawProductById(testProd.id);
      expect(checkProd?.skuTagId).toBe(origSkuTagId);
      expect(checkProd?.skuTagName).toBe(origSkuTagName);
    });

    it('getGroupedSKUs should keep inactive SKUs visible if they still have active products', () => {
      const categories = dataService.getCategories();
      const activeCatWithProducts = categories.find((c) => {
        const count = dataService.getProductCountBySku(c.id).count;
        return count > 0 && c.isActive;
      });

      expect(activeCatWithProducts).toBeDefined();

      // Toggle to inactive (ปิดรับชั่วคราว)
      dataService.toggleCategoryStatus(activeCatWithProducts!.id);

      // Check grouped SKUs in market
      const grouped = dataService.getGroupedSKUs();
      const stillInMarket = grouped.some((g) => g.skuTagId === activeCatWithProducts!.id);
      expect(stillInMarket).toBe(true);

      // Toggle back to active
      dataService.toggleCategoryStatus(activeCatWithProducts!.id);
    });
  });
});
