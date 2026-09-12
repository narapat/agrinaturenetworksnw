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

  it('2. should match and link unlinked member by exact fullName', () => {
    const member = dataService.getMemberById('mem-003');
    expect(member).toBeDefined();
    // Ensure no lineUserId yet
    member!.lineUserId = undefined;

    const result = dataService.loginWithLineProfile({
      userId: 'U_NEW_LINE_ID_BOONCHOO',
      displayName: member!.fullName,
    });

    expect(result.isRegistered).toBe(true);
    expect(result.member?.id).toBe('mem-003');
    // Verify lineUserId was auto-linked!
    expect(result.member?.lineUserId).toBe('U_NEW_LINE_ID_BOONCHOO');
  });

  it('3. should match via smart partial matching (e.g. "Name / CallSign")', () => {
    const member = dataService.getMemberById('mem-004');
    expect(member).toBeDefined();
    member!.lineUserId = undefined;
    member!.lineId = 'chainarong';

    // User's LINE name contains extra suffix or callsign
    const result = dataService.loginWithLineProfile({
      userId: 'U_CHAINARONG_123',
      displayName: 'chainarong / HS6XYZ',
    });

    expect(result.isRegistered).toBe(true);
    expect(result.member?.id).toBe('mem-004');
    expect(result.member?.lineUserId).toBe('U_CHAINARONG_123');
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
