import { describe, it, expect } from 'vitest';
import { isFarmOwner } from '@/lib/ownership';

const farm = { id: 'farm-1788935859777', memberId: 'mem-emmy', ownerUid: 'U_EMMY' };

describe('isFarmOwner (farm page "owner" view)', () => {
  it('[Regression] an admin viewing another member’s farm is NOT the owner', () => {
    const admin = { id: 'mem-pat', farmId: 'farm-pat', ownerUid: 'U_PAT', lineUserId: 'U_PAT', role: 'admin' as const };
    expect(isFarmOwner(admin, farm)).toBe(false);
  });

  it('the real owner matches by memberId, farmId, or LINE UID', () => {
    expect(isFarmOwner({ id: 'mem-emmy' }, farm)).toBe(true);
    expect(isFarmOwner({ id: 'x', farmId: 'farm-1788935859777' }, farm)).toBe(true);
    expect(isFarmOwner({ id: 'x', ownerUid: 'U_EMMY' }, farm)).toBe(true);
    expect(isFarmOwner({ id: 'x', lineUserId: 'U_EMMY' }, farm)).toBe(true);
  });

  it('guests and missing data are never owners', () => {
    expect(isFarmOwner(null, farm)).toBe(false);
    expect(isFarmOwner({ id: 'x' }, null)).toBe(false);
    // ไม่มี ownerUid ทั้งสองฝั่ง ต้องไม่ถือว่าตรงกัน
    expect(isFarmOwner({ id: 'x' }, { id: 'f', memberId: 'm' })).toBe(false);
  });
});
