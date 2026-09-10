import { describe, it, expect, beforeEach } from 'vitest';
import { dataService } from '@/services/dataService';

describe('Farm Practices Management & Member Activities Logging Tests', () => {
  beforeEach(() => {
    dataService.switchUser('guest');
  });

  describe('1. Farm Practices Management (วิถีและศาสตร์กสิกรรมธรรมชาติ)', () => {
    it('should have initial practices including updated approved names', () => {
      const practices = dataService.getPractices();
      expect(practices.length).toBeGreaterThanOrEqual(8);

      const practiceNames = practices.map((p) => p.name);
      expect(practiceNames).toContain('น้ำหมักเจ็ดรส');
      expect(practiceNames).toContain('เกษตรอินทรีย์');
      expect(practiceNames).toContain('กสิกรรมธรรมชาติ');
      expect(practiceNames).toContain('โคก หนอง นา');
      expect(practiceNames).toContain('เตาเผาไบโอชาร์ 1,000°C');
      expect(practiceNames).toContain('น้ำส้มควันไม้ไร้ทาร์');
      expect(practiceNames).toContain('ป่า 3 อย่าง ประโยชน์ 4 อย่าง');
      expect(practiceNames).toContain('อนุรักษ์เมล็ดพันธุ์พื้นบ้าน');
    });

    it('should return active practice names via getActivePracticeNames()', () => {
      const activeNames = dataService.getActivePracticeNames();
      expect(activeNames.length).toBeGreaterThan(0);
      expect(activeNames).toContain('โคก หนอง นา');
    });

    it('should add a new farm practice tag successfully', () => {
      const initialCount = dataService.getPractices().length;
      const newPractice = dataService.addPracticeTag({
        name: 'การเลี้ยงชันโรงผสมเกสร',
        icon: '🐝',
        category: 'animal',
        categoryName: 'การเลี้ยงสัตว์อารมณ์ดี',
        description: 'การเพาะเลี้ยงชันโรงเพื่อช่วยผสมเกสรไม้ผล',
        isActive: true,
      });

      expect(newPractice.id).toBeDefined();
      expect(newPractice.name).toBe('การเลี้ยงชันโรงผสมเกสร');
      expect(dataService.getPractices().length).toBe(initialCount + 1);
      expect(dataService.getActivePracticeNames()).toContain('การเลี้ยงชันโรงผสมเกสร');
    });

    it('should toggle practice active status', () => {
      const practices = dataService.getPractices();
      const target = practices[0];
      const initialActive = target.isActive;

      dataService.togglePracticeStatus(target.id);
      const updated = dataService.getPractices().find((p) => p.id === target.id);
      expect(updated?.isActive).toBe(!initialActive);

      // Toggle back
      dataService.togglePracticeStatus(target.id);
      const reverted = dataService.getPractices().find((p) => p.id === target.id);
      expect(reverted?.isActive).toBe(initialActive);
    });

    it('should update practice tag and cascade name changes to all farms', async () => {
      // First ensure a farm has a unique practice
      const customTag = dataService.addPracticeTag({
        name: 'เทคนิคดินมีชีวิต-ทดสอบ',
        icon: '🪱',
        category: 'soil',
        categoryName: 'ดินและอินทรีย์วัตถุ',
        description: 'ทดสอบ',
        isActive: true,
      });

      const farm = await dataService.createFarm('mem-001', {
        farmName: 'แปลงทดสอบดินมีชีวิต',
        story: 'เรื่องเล่าทดสอบ',
        district: 'เมือง',
        subdistrict: 'นครสวรรค์ตก',
        practices: ['เทคนิคดินมีชีวิต-ทดสอบ', 'โคก หนอง นา'],
      });

      expect(farm.practices).toContain('เทคนิคดินมีชีวิต-ทดสอบ');
      expect(dataService.getFarmCountByPractice('เทคนิคดินมีชีวิต-ทดสอบ')).toBeGreaterThanOrEqual(1);

      // Rename practice
      const updateResult = dataService.updatePracticeTag(customTag.id, {
        name: 'เทคนิคดินมีชีวิต-ฉบับสมบูรณ์',
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.updatedFarmCount).toBeGreaterThanOrEqual(1);

      const refreshedFarm = dataService.getFarmById(farm.id);
      expect(refreshedFarm?.practices).toContain('เทคนิคดินมีชีวิต-ฉบับสมบูรณ์');
      expect(refreshedFarm?.practices).not.toContain('เทคนิคดินมีชีวิต-ทดสอบ');
    });

    it('should delete practice tag and reassign to target practice in all farms', async () => {
      const tagA = dataService.addPracticeTag({
        name: 'วิถีทดสอบเอ',
        icon: '🅰️',
        category: 'other',
        categoryName: 'วิถีกสิกรรมทั่วไป',
        description: 'A',
        isActive: true,
      });
      const tagB = dataService.addPracticeTag({
        name: 'วิถีทดสอบบี',
        icon: '🅱️',
        category: 'other',
        categoryName: 'วิถีกสิกรรมทั่วไป',
        description: 'B',
        isActive: true,
      });

      const farm = await dataService.createFarm('mem-002', {
        farmName: 'แปลงทดสอบโยกย้ายวิถี',
        story: 'เรื่องเล่า',
        district: 'เมือง',
        subdistrict: 'ปากน้ำโพ',
        practices: ['วิถีทดสอบเอ'],
      });

      expect(dataService.getFarmById(farm.id)?.practices).toContain('วิถีทดสอบเอ');

      // Delete tagA and reassign to tagB
      const delResult = dataService.deletePracticeTagWithReassign(tagA.id, tagB.id);
      expect(delResult.success).toBe(true);
      expect(delResult.reassignedCount).toBeGreaterThanOrEqual(1);

      const updatedFarm = dataService.getFarmById(farm.id);
      expect(updatedFarm?.practices).not.toContain('วิถีทดสอบเอ');
      expect(updatedFarm?.practices).toContain('วิถีทดสอบบี');
    });
  });

  describe('2. Member Activities Logging (กิจกรรมของสมาชิก)', () => {
    it('should log member login when loginAsMember is called', () => {
      const logsBefore = dataService.getAuditLogs().length;
      dataService.loginAsMember('mem-001');

      const logsAfter = dataService.getAuditLogs();
      expect(logsAfter.length).toBeGreaterThan(logsBefore);

      const latestLog = logsAfter[0];
      expect(latestLog.action).toBe('member_login');
      expect(latestLog.targetMemberId).toBe('mem-001');
      expect(latestLog.details).toContain('สมชาย');
    });

    it('should log create_farm and update_farm actions', async () => {
      const createdFarm = await dataService.createFarm('mem-003', {
        farmName: 'แปลงบ้านไร่สายน้ำผึ้ง',
        story: 'แปลงทดสอบกิจกรรม',
        district: 'เก้าเลี้ยว',
        subdistrict: 'เก้าเลี้ยว',
        practices: ['โคก หนอง นา'],
      });

      let latestLog = dataService.getAuditLogs()[0];
      expect(latestLog.action).toBe('create_farm');
      expect(latestLog.targetFarmName).toBe('แปลงบ้านไร่สายน้ำผึ้ง');

      // Now update the farm
      await dataService.updateFarm(createdFarm.id, {
        tagline: 'คำขวัญใหม่สดใส',
      });

      latestLog = dataService.getAuditLogs()[0];
      expect(latestLog.action).toBe('update_farm');
      expect(latestLog.targetFarmName).toBe('แปลงบ้านไร่สายน้ำผึ้ง');
    });

    it('should log product CRUD operations (create_product, update_product, delete_product)', async () => {
      const newProduct = await dataService.memberAddProduct({
        farmId: 'farm-001',
        farmName: 'สวนเกษตรศานติ',
        district: 'เมือง',
        subdistrict: 'หนองกรด',
        title: 'ฝรั่งกิมจูออร์แกนิค',
        skuTagId: 'sku-raw',
        skuTagName: 'ผลผลิตสด',
        category: 'raw',
        categoryName: 'วัตถุดิบสด',
        status: 'sale',
        price: 45,
        unit: 'กก.',
        description: 'กรอบหวานไร้สารเคมี',
        images: [],
        rating: 5,
        reviewCount: 0,
        tags: [],
        isOrganic: true,
      });

      let latestLog = dataService.getAuditLogs()[0];
      expect(latestLog.action).toBe('create_product');
      expect(latestLog.details).toContain('ฝรั่งกิมจูออร์แกนิค');

      // Update product
      await dataService.updateProduct(newProduct.id, { price: 50 });
      latestLog = dataService.getAuditLogs()[0];
      expect(latestLog.action).toBe('update_product');
      expect(latestLog.details).toContain('50');

      // Update product status
      await dataService.updateProductStatus(newProduct.id, 'out_of_stock');
      latestLog = dataService.getAuditLogs()[0];
      expect(latestLog.action).toBe('update_product');
      expect(latestLog.details).toContain('หมดชั่วคราว');

      // Delete product
      await dataService.deleteProduct(newProduct.id);
      latestLog = dataService.getAuditLogs()[0];
      expect(latestLog.action).toBe('delete_product');
      expect(latestLog.details).toContain('ฝรั่งกิมจูออร์แกนิค');
    });
  });
});
