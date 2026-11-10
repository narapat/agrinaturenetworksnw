import { dataService } from '@/services/dataService';
import type { Farm, MemberProfile } from '@/types';
import type { DeleteMemberTarget } from './DeleteMemberDialog';

/**
 * สรุปแปลงและจำนวนผลผลิตของสมาชิก (จากข้อมูลที่โหลดผ่าน snapshot แล้ว)
 * ใช้แสดงในรายการและในกล่องยืนยันการลบ — จำนวนจริงที่ลบคำนวณซ้ำที่ server
 */
export function summarizeMember(member: MemberProfile): { farms: Farm[]; productCount: number } {
  const byId = new Map<string, Farm>();
  const fromId = member.farmId ? dataService.getFarmById(member.farmId) : undefined;
  const fromMember = dataService.getFarmByMemberId(member.id);
  if (fromId) byId.set(fromId.id, fromId);
  if (fromMember) byId.set(fromMember.id, fromMember);
  const farms = Array.from(byId.values());
  const productCount = farms.reduce((sum, f) => sum + dataService.getProductsByFarmId(f.id, true).length, 0);
  return { farms, productCount };
}

export function toDeleteTarget(member: MemberProfile): DeleteMemberTarget {
  const { farms, productCount } = summarizeMember(member);
  return {
    id: member.id,
    fullName: member.fullName,
    farmNames: farms.map((f) => f.farmName).filter(Boolean),
    productCount,
    isApproved: member.status === 'approved',
  };
}
