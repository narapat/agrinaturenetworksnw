import { describe, it, expect, afterEach, vi } from 'vitest';
import { dataService } from '@/services/dataService';

/**
 * Regression: updateFarm เคยเขียน farm object ทั้งก้อนจาก memory ลง farms/{id} (อ่านได้สาธารณะ)
 * ซึ่ง object ใน memory อาจถูกเติม phone / lineId / internalCoordinates จาก private subcollection
 * หรือจากการ merge กับข้อมูลสมาชิก ทำให้ข้อมูลอ่อนไหวหลุดขึ้นเอกสารสาธารณะ
 */
describe('updateFarm Zero Data Leakage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('must write ONLY the changed allowlisted fields to the public farms document', async () => {
    const farm = dataService.getFarmById('farm-001') as any;
    expect(farm).toBeTruthy();

    // จำลองสถานะ in-memory ที่ถูกเติมข้อมูลอ่อนไหว (เหมือนหลัง hydrate จาก private/contact หรือ merge กับ member)
    const internalFarm = (dataService as any).farms.find((f: any) => f.id === 'farm-001');
    internalFarm.phone = '0812345678';
    internalFarm.lineId = 'secret-line-id';
    internalFarm.internalCoordinates = { lat: 15.71234, lng: 100.05678 };
    internalFarm.isPublicPhone = false;
    internalFarm.isPublicLine = false;

    const updateSpy = vi.spyOn(dataService as any, 'firestoreUpdate').mockResolvedValue(true);

    await dataService.updateFarm('farm-001', { practices: ['โคก หนอง นา'], tagline: 'ทดสอบ' });

    const farmWrites = updateSpy.mock.calls.filter((c) => c[0] === 'farms' && c[1] === 'farm-001');
    expect(farmWrites).toHaveLength(1);
    const payload = farmWrites[0][2] as Record<string, unknown>;

    expect(Object.keys(payload).sort()).toEqual(['practices', 'tagline']);
    expect(payload).not.toHaveProperty('phone');
    expect(payload).not.toHaveProperty('lineId');
    expect(payload).not.toHaveProperty('internalCoordinates');
    expect(payload).not.toHaveProperty('ownerUid');
    expect(payload).not.toHaveProperty('status');
  });

  it.each([
    ['phone', { phone: '0899999999' }],
    ['lineId', { lineId: 'leak' }],
    ['internalCoordinates', { internalCoordinates: { lat: 1, lng: 2 } }],
    ['status', { status: 'approved' }],
    ['ownerUid', { ownerUid: 'U_ATTACKER' }],
  ])('must reject non-allowlisted field "%s" before mutating anything', async (_name, patch) => {
    const updateSpy = vi.spyOn(dataService as any, 'firestoreUpdate').mockResolvedValue(true);
    const before = JSON.stringify(dataService.getFarmById('farm-001'));

    await expect(dataService.updateFarm('farm-001', patch as any)).rejects.toThrow(/updateFarm ไม่อนุญาต/);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(dataService.getFarmById('farm-001'))).toBe(before);
  });
});
