import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  sanitizeFarmForPublic, 
  sanitizeProductForPublic, 
  getPublicFarmsServer, 
  getPublicProductsServer, 
  getGroupedSKUsServer, 
  getNewsServer,
  getFarmByIdServer,
  getProductByIdServer
} from '@/lib/serverData';
import { Farm, Product } from '@/types';

describe('Server Data Layer & ISR Sanitization Tests', () => {
  const mockRawFarm: Farm = {
    id: 'farm-test-101',
    memberId: 'member-test-101',
    ownerName: 'ลุงทดสอบ กสิกรรม',
    farmName: 'แปลงทดสอบกสิกรรมธรรมชาติ',
    story: 'เรื่องเล่าแปลงทดสอบ',
    photos: ['https://example.com/photo1.jpg'],
    district: 'ชุมแสง',
    subdistrict: 'ทับกฤช',
    internalCoordinates: {
      lat: 15.889123,
      lng: 100.234567,
    },
    publicZone: {
      name: 'โซน ต.ทับกฤช อ.ชุมแสง',
      approxLat: 15.89,
      approxLng: 100.23,
      radiusKm: 3,
    },
    practices: ['โคก หนอง นา', 'เผาถ่านไบโอชาร์'],
    isPublicPhone: false,
    phone: '081-999-8888',
    isPublicLine: false,
    lineId: 'secret_farmer_line',
  };

  const mockRawProduct: Product = {
    id: 'prod-test-101',
    farmId: 'farm-test-101',
    farmName: 'แปลงทดสอบกสิกรรมธรรมชาติ',
    district: 'ชุมแสง',
    subdistrict: 'ทับกฤช',
    title: 'ถ่านไบโอชาร์อินทรีย์',
    skuTagId: 'biochar',
    skuTagName: 'ถ่านไบโอชาร์',
    category: 'byproduct',
    categoryName: 'ปัจจัยการผลิต/By-product',
    status: 'sale',
    price: 150,
    unit: 'กระสอบ 10 กก.',
    description: 'ถ่านคุณภาพสูง',
    images: ['https://example.com/biochar.jpg'],
    updatedAt: new Date().toISOString(),
    isPublicPhone: false,
    phone: '081-999-8888',
    isPublicLine: false,
    lineId: 'secret_farmer_line',
  };

  describe('1. Anti-Scammer Sanitization Functions', () => {
    it('MUST strip internalCoordinates from public farm data', () => {
      const sanitized = sanitizeFarmForPublic(mockRawFarm);
      expect((sanitized as any).internalCoordinates).toBeUndefined();
      expect(sanitized.publicZone).toBeDefined();
      expect(sanitized.publicZone.name).toBe('โซน ต.ทับกฤช อ.ชุมแสง');
    });

    it('MUST omit phone and lineId when isPublicPhone/isPublicLine are false', () => {
      const sanitized = sanitizeFarmForPublic(mockRawFarm);
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.lineId).toBeUndefined();
    });

    it('MUST preserve phone and lineId when explicitly permitted by farmer', () => {
      const publicFarm: Farm = {
        ...mockRawFarm,
        isPublicPhone: true,
        isPublicLine: true,
      };
      const sanitized = sanitizeFarmForPublic(publicFarm);
      expect(sanitized.phone).toBe('081-999-8888');
      expect(sanitized.lineId).toBe('secret_farmer_line');
      // internalCoordinates must STILL be stripped!
      expect((sanitized as any).internalCoordinates).toBeUndefined();
    });

    it('MUST sanitize product contact information according to flags', () => {
      const sanitized = sanitizeProductForPublic(mockRawProduct);
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.lineId).toBeUndefined();

      const publicProd: Product = {
        ...mockRawProduct,
        isPublicPhone: true,
        isPublicLine: true,
      };
      const sanitizedPublic = sanitizeProductForPublic(publicProd);
      expect(sanitizedPublic.phone).toBe('081-999-8888');
      expect(sanitizedPublic.lineId).toBe('secret_farmer_line');
    });
  });

  describe('2. Server Public Data Fetchers & ISR Helpers', () => {
    it('getPublicFarmsServer() returns farms without any internalCoordinates', async () => {
      const farms = await getPublicFarmsServer();
      expect(farms.length).toBeGreaterThan(0);

      for (const farm of farms) {
        expect((farm as any).internalCoordinates).toBeUndefined();
        expect(farm.publicZone).toBeDefined();
        if (!farm.isPublicPhone) {
          expect(farm.phone).toBeUndefined();
        }
        if (!farm.isPublicLine) {
          expect(farm.lineId).toBeUndefined();
        }
      }
    });

    it('getPublicFarmsServer(district) filters correctly by district', async () => {
      const allFarms = await getPublicFarmsServer();
      const firstDistrict = allFarms[0]?.district;
      if (firstDistrict) {
        const filtered = await getPublicFarmsServer(firstDistrict);
        expect(filtered.every((f) => f.district === firstDistrict)).toBe(true);
      }
    });

    it('getPublicProductsServer() filters out hidden products', async () => {
      const products = await getPublicProductsServer();
      expect(products.length).toBeGreaterThan(0);
      expect(products.every((p) => p.status !== 'hidden')).toBe(true);
    });

    it('getGroupedSKUsServer() calculates groups and farm counts', async () => {
      const skuGroups = await getGroupedSKUsServer();
      expect(skuGroups.length).toBeGreaterThan(0);
      for (const group of skuGroups) {
        expect(group.skuTagId).toBeDefined();
        expect(group.name).toBeDefined();
        expect(group.itemCount).toBeGreaterThanOrEqual(1);
        expect(group.farmCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('getNewsServer() returns published news items', async () => {
      const news = await getNewsServer();
      expect(news.length).toBeGreaterThan(0);
      expect(news.every((n) => n.status !== 'hidden')).toBe(true);
    });

    it('getFarmByIdServer() returns sanitized farm or null', async () => {
      const farms = await getPublicFarmsServer();
      const firstId = farms[0].id;
      const farm = await getFarmByIdServer(firstId);
      expect(farm).not.toBeNull();
      expect((farm as any).internalCoordinates).toBeUndefined();

      const nonexistent = await getFarmByIdServer('nonexistent-999');
      expect(nonexistent).toBeNull();
    });

    it('getProductByIdServer() returns sanitized product or null', async () => {
      const products = await getPublicProductsServer();
      const firstId = products[0].id;
      const product = await getProductByIdServer(firstId);
      expect(product).not.toBeNull();

      const nonexistent = await getProductByIdServer('nonexistent-999');
      expect(nonexistent).toBeNull();
    });
  });
});
