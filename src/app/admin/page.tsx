import { redirect } from 'next/navigation';

/**
 * /admin → หน้าแรกของศูนย์แอดมินคือคิวอนุมัติสมาชิกใหม่
 * (แต่ละส่วนของศูนย์แอดมินแยกเป็นหน้าย่อยใต้ /admin/* แล้ว)
 */
export default function AdminIndexPage() {
  redirect('/admin/members');
}
