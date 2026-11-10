import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, MapPin, ShoppingBag, Users, ShieldCheck } from 'lucide-react';
import { getPublicStatsServer } from '@/lib/serverData';
import type { CountRow } from '@/lib/publicStats';
import { PRODUCT_CATEGORIES, productCategoryName } from '@/lib/taxonomy';

// ISR — คำนวณใหม่ทุก 5 นาที (ตัวเลขสรุป ไม่จำเป็นต้องเป็นวินาทีต่อวินาที)
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'สถิติเครือข่าย | เครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์',
  description: 'จำนวนสมาชิก แปลงกสิกรรม และของดีของเครือข่ายกสิกรรมธรรมชาติ จังหวัดนครสวรรค์ แยกตามอำเภอและหมวดหมู่',
};

const nf = new Intl.NumberFormat('th-TH');

function StatTile({ icon: Icon, label, value, note }: { icon: typeof Users; label: string; value: number; note?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
      <div className="flex items-center gap-2 text-stone-600 text-sm font-semibold">
        <Icon className="w-4 h-4 text-brand-700" aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-4xl sm:text-5xl font-black text-stone-900 tabular-nums">{nf.format(value)}</p>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </div>
  );
}

/**
 * แผนภูมิแท่งแนวนอน (สีเดียว = ขนาด) พร้อมตัวเลขกำกับทุกแท่ง
 * เป็นรายการ HTML จริง จึงอ่านได้ด้วยโปรแกรมอ่านหน้าจอและไม่ต้องใช้ JavaScript
 */
function BarList({ rows, unit, caption, wideLabels = false }: { rows: CountRow[]; unit: string; caption: string; wideLabels?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul aria-label={caption} className="space-y-1.5">
      {rows.map((r) => {
        const pct = r.count === 0 ? 0 : Math.max(2, Math.round((r.count / max) * 100));
        return (
          <li
            key={r.key}
            className={`group grid ${
              wideLabels ? 'grid-cols-[8.5rem_1fr_3rem] sm:grid-cols-[15rem_1fr_3.5rem]' : 'grid-cols-[7.5rem_1fr_3rem] sm:grid-cols-[10rem_1fr_3.5rem]'
            } items-center gap-2 sm:gap-3 rounded-lg px-1 py-0.5 hover:bg-stone-50`}
            title={`${r.label}: ${nf.format(r.count)} ${unit}`}
          >
            <span className={`text-xs sm:text-sm leading-snug ${wideLabels ? 'break-words' : 'truncate'} ${r.count === 0 ? 'text-stone-400' : 'text-stone-700'}`}>{r.label}</span>
            <span className="h-3.5 sm:h-4 bg-stone-100 rounded-r" aria-hidden>
              {pct > 0 && <span className="block h-full rounded-r bg-brand-700 group-hover:bg-brand-800" style={{ width: `${pct}%` }} />}
            </span>
            <span className={`text-right text-xs sm:text-sm tabular-nums ${r.count === 0 ? 'text-stone-400' : 'font-bold text-stone-900'}`}>
              {nf.format(r.count)}
              <span className="sr-only"> {unit}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs">
      <h2 id={id} className="text-lg sm:text-xl font-black text-stone-900">{title}</h2>
      {subtitle && <p className="text-xs sm:text-sm text-stone-500 mt-0.5 mb-4">{subtitle}</p>}
      {children}
    </section>
  );
}

export default async function StatsPage() {
  const stats = await getPublicStatsServer();
  const updated = new Date(stats.generatedAt).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-800 bg-brand-50 px-3 py-1 rounded-full">
          <BarChart3 className="w-3.5 h-3.5" aria-hidden />
          <span>สถิติเครือข่าย</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900">ภาพรวมเครือข่ายกสิกรรมธรรมชาติ จ.นครสวรรค์</h1>
        <p className="text-sm text-stone-500">อัปเดตล่าสุด {updated} น. · ปรับปรุงอัตโนมัติทุก 5 นาที</p>
      </header>

      {/* ตัวเลขหลัก */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatTile icon={Users} label="สมาชิกที่อนุมัติแล้ว" value={stats.approvedMembers} note="คน" />
        <StatTile
          icon={MapPin}
          label="แปลงกสิกรรม"
          value={stats.farmsTotal}
          note={`ครอบคลุม ${stats.districtsWithFarms} จาก ${stats.districtsTotal} อำเภอ`}
        />
        <StatTile icon={ShoppingBag} label="ของดีในตลาดเครือข่าย" value={stats.productsTotal} note="รายการที่เปิดแสดงอยู่" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Section id="farms-by-district" title="จำนวนแปลงในแต่ละอำเภอ" subtitle="แปลงที่ผ่านการอนุมัติ · เรียงจากมากไปน้อย">
          <BarList rows={stats.farmsByDistrict} unit="แปลง" caption="จำนวนแปลงแยกตามอำเภอ" />
        </Section>

        <Section id="products-by-district" title="จำนวนของดีในแต่ละอำเภอ" subtitle="ผลผลิตและปัจจัยการผลิตที่เปิดแสดงในตลาด">
          <BarList rows={stats.productsByDistrict} unit="รายการ" caption="จำนวนของดีแยกตามอำเภอ" />
        </Section>
      </div>

      <Section id="products-by-category" title="จำนวนของดีตามหมวดหมู่">
        <div className="mt-4">
          <BarList rows={stats.productsByCategory} unit="รายการ" caption="จำนวนของดีแยกตามหมวดหมู่" wideLabels />
        </div>
      </Section>

      {/* ตารางละเอียด: อำเภอ × หมวดหมู่ */}
      <Section
        id="products-matrix"
        title="ของดีแยกตามอำเภอและหมวดหมู่"
        subtitle="ตารางละเอียด (เลื่อนแนวนอนได้บนมือถือ)"
      >
        <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
          <table className="w-full min-w-[640px] text-xs sm:text-sm border-collapse">
            <caption className="sr-only">จำนวนของดีแยกตามอำเภอและหมวดหมู่</caption>
            <thead>
              <tr className="border-b border-stone-200 text-stone-600">
                <th scope="col" className="text-left font-semibold py-2 pr-3 sticky left-0 bg-white">อำเภอ</th>
                {PRODUCT_CATEGORIES.map((c) => (
                  <th key={c} scope="col" className="text-right font-semibold py-2 px-2 whitespace-nowrap">
                    {productCategoryName(c)}
                  </th>
                ))}
                <th scope="col" className="text-right font-bold py-2 pl-3 text-stone-900">รวม</th>
              </tr>
            </thead>
            <tbody>
              {stats.matrix.map((row) => (
                <tr key={row.district} className="border-b border-stone-100 hover:bg-stone-50">
                  <th scope="row" className="text-left font-medium py-2 pr-3 text-stone-800 whitespace-nowrap sticky left-0 bg-white">
                    {row.district === 'ไม่ระบุอำเภอ' ? row.district : `อ.${row.district}`}
                  </th>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <td key={c} className={`text-right py-2 px-2 tabular-nums ${row.counts[c] ? 'text-stone-900' : 'text-stone-300'}`}>
                      {row.counts[c] ? nf.format(row.counts[c]) : '–'}
                    </td>
                  ))}
                  <td className="text-right py-2 pl-3 font-bold tabular-nums text-stone-900">{nf.format(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-200">
                <th scope="row" className="text-left font-bold py-2 pr-3 sticky left-0 bg-white">รวมทั้งหมด</th>
                {PRODUCT_CATEGORIES.map((c) => (
                  <td key={c} className="text-right py-2 px-2 font-bold tabular-nums">
                    {nf.format(stats.productsByCategory.find((r) => r.key === c)?.count || 0)}
                  </td>
                ))}
                <td className="text-right py-2 pl-3 font-black tabular-nums">{nf.format(stats.productsTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <p className="flex items-start gap-2 text-xs text-stone-500">
        <ShieldCheck className="w-4 h-4 shrink-0 text-stone-400" aria-hidden />
        <span>
          หน้านี้แสดงเฉพาะจำนวนรวม ไม่มีชื่อ เบอร์โทร หรือพิกัดของสมาชิก · ดูรายละเอียดได้ที่{' '}
          <Link href="/farms" className="font-semibold text-brand-800 hover:underline">แปลงกสิกรรม</Link> และ{' '}
          <Link href="/catalog" className="font-semibold text-brand-800 hover:underline">ของดีเครือข่าย</Link>
        </span>
      </p>
    </div>
  );
}
