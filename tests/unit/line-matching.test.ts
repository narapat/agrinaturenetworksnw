import { describe, it, expect, beforeEach } from 'vitest';
import { dataService } from '@/services/dataService';

describe('LINE Profile Matching & Account Linking Tests', () => {
  beforeEach(() => {
    dataService.switchUser('guest');
  });

  it('1. should match member by exact lineUserId if already linked', () => {
    // Find an existing member and assign a mock lineUserId
    const member = dataService.getMemberById('mem-002');
    expect(member).toBeDefined();
    member!.lineUserId = 'U_LINKED_LINE_USER_002';

    const result = dataService.loginWithLineProfile({
      userId: 'U_LINKED_LINE_USER_002',
      displayName: 'Any Changed Name',
    });

    expect(result.isRegistered).toBe(true);
    expect(result.member).toBeDefined();
    expect(result.member?.id).toBe('mem-002');
  });

  it('2. [Security] must NOT log in or link by matching the LINE display name to a full name', () => {
    const member = dataService.getMemberById('mem-003');
    expect(member).toBeDefined();
    member!.lineUserId = undefined;
    member!.ownerUid = undefined;

    const result = dataService.loginWithLineProfile({
      userId: 'U_ATTACKER_SAME_NAME',
      displayName: member!.fullName,
    });

    expect(result.isRegistered).toBe(false);
    expect(result.member).toBeNull();
    expect(member!.lineUserId).toBeUndefined();
    expect(member!.ownerUid).toBeUndefined();
    expect(dataService.getCurrentUser()).toBeNull();
  });

  it('3. [Security] must NOT take over an account whose lineId matches the first word of a LINE display name', () => {
    const member = dataService.getMemberById('mem-004');
    expect(member).toBeDefined();
    member!.lineId = 'chainarong';
    member!.ownerUid = 'U_REAL_CHAINARONG';
    member!.lineUserId = 'U_REAL_CHAINARONG';

    const result = dataService.loginWithLineProfile({
      userId: 'U_ATTACKER_123',
      displayName: 'chainarong / HS6XYZ',
    });

    expect(result.isRegistered).toBe(false);
    expect(result.member).toBeNull();
    // บัญชีจริงต้องไม่ถูกเขียนทับ
    expect(member!.ownerUid).toBe('U_REAL_CHAINARONG');
    expect(member!.lineUserId).toBe('U_REAL_CHAINARONG');
    expect(dataService.getCurrentUser()).toBeNull();
  });

  it('4. should return isRegistered: false for unknown LINE account and set current user to guest', () => {
    const result = dataService.loginWithLineProfile({
      userId: 'U_COMPLETELY_UNKNOWN_GUEST_999',
      displayName: 'คนแปลกหน้าที่ไม่เคยสมัคร',
    });

    expect(result.isRegistered).toBe(false);
    expect(result.member).toBeNull();
    // System must treat as guest, not accidentally logging into demo accounts
    expect(dataService.getCurrentUser()).toBeNull();
  });

  it('5. should match member by exact ownerUid if already linked', () => {
    const member = dataService.getMemberById('mem-002');
    expect(member).toBeDefined();
    member!.lineUserId = undefined;
    member!.ownerUid = 'U_OWNER_UID_002';

    const result = dataService.loginWithLineProfile({
      userId: 'U_OWNER_UID_002',
      displayName: 'Any Changed Name',
    });

    expect(result.isRegistered).toBe(true);
    expect(result.member).toBeDefined();
    expect(result.member?.id).toBe('mem-002');
    expect(result.member?.ownerUid).toBe('U_OWNER_UID_002');
  });
});
