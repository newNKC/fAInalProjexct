'use client';

// Dashboard (งานของพิชญ์ เดิม dashboard/page.tsx + Data/dashboardData.ts)
// ปรับให้ใช้ข้อมูลจริงจาก store + เติมส่วนที่ขาด:
//  - ชิปช่วงเวลาตาม requirement (รายปี / รายเดือน / รายอาทิตย์ / 3 วัน / วันนี้ / ทั้งหมด / กำหนดเอง) และกรองตัวเลข+กราฟจริง
//  - ขอบเขตตามโรล: หัวหน้าต้นสังกัด = คำขอของฝ่ายตัวเอง · หัวหน้าแผนก = คำขอที่เข้าแผนก · ผู้บริหาร/ผู้ดูแลระบบ = ทุกแผนก
//  - ช่องค้นหา/กระดิ่งใช้งานได้จริง · งานเกินกำหนดกดเปิดได้และเรียงลำดับได้ · เพิ่มกราฟตามแผนกปลายทาง
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Calendar } from '@tailgrids/icons';
import { GlobalSearch, NotificationBell } from '@/components/page-header';
import { Guard } from '@/components/role-shell';
import SortSelect, { sortBy, type SortOption } from '@/components/sort-select';
import { useQueryState } from '@/components/use-query-state';
import { daysBetween, isOverdue, thaiDate, thaiMonths, todayISO, type Request } from '@/data/requests';
import { useStore } from '@/data/store';

export default function DashboardPage() {
  return <Guard roles={['approver', 'head', 'executive', 'admin']} perm="dashboard"><Dashboard /></Guard>;
}

type Period = 'year' | 'month' | 'week' | '3days' | 'today' | 'all' | 'custom';
type Scope = 'all' | 'target' | 'source';

const periods: { value: Period; label: string }[] = [
  { value: 'year', label: 'รายปี' },
  { value: 'month', label: 'รายเดือน' },
  { value: 'week', label: 'รายอาทิตย์' },
  { value: '3days', label: '3 วัน' },
  { value: 'today', label: 'วันนี้' },
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'custom', label: 'กำหนดเอง' },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s: string, n: number) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return iso(d); };

// ช่วงวันที่ของแต่ละชิป (นับถึงวันนี้)
function rangeOf(p: Period, today: string, custom: { from: string; to: string }): { from: string; to: string } {
  const d = new Date(`${today}T00:00:00`);
  switch (p) {
    case 'year': return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'month': return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'week': return { from: addDays(today, -((d.getDay() + 6) % 7)), to: today }; // ตั้งแต่วันจันทร์
    case '3days': return { from: addDays(today, -2), to: today };
    case 'today': return { from: today, to: today };
    case 'custom': return { from: custom.from || '2000-01-01', to: custom.to || today };
    default: return { from: '2000-01-01', to: today };
  }
}

// สีแท่งของหมวด (ตามสีที่ผู้ดูแลระบบตั้งในหน้า "หมวดคำขอ")
function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color ? '' : 'bg-indigo-600'}`} style={{ width: `${(value / Math.max(1, max)) * 100}%`, background: color }} />
    </div>
  );
}

function Dashboard() {
  const store = useStore();
  const user = store.user!;
  const today = todayISO();
  useEffect(() => { document.title = 'Dashboard · ระบบจัดการคำขอ'; }, []);

  // ขอบเขตที่ผู้ใช้คนนี้ดูได้ (มีหลายโรลเลือกได้)
  const scopes: { value: Scope; label: string }[] = [];
  if (user.roles.includes('executive') || user.roles.includes('admin')) scopes.push({ value: 'all', label: 'ทุกแผนก' });
  if (user.roles.includes('head')) scopes.push({ value: 'target', label: `คำขอที่เข้า${user.dept}` });
  if (user.roles.includes('approver')) scopes.push({ value: 'source', label: `คำขอของ${user.dept}` });

  // --- STATE MANAGEMENT --- (เก็บใน URL เพื่อให้กดย้อนกลับ/ส่งลิงก์แล้วยังเห็นช่วงเดิม)
  const [scopeParam, setScope] = useQueryState<Scope>('scope', scopes[0].value);
  const scope = scopes.some((s) => s.value === scopeParam) ? scopeParam : scopes[0].value;
  const [selectedPeriod, setSelectedPeriod] = useQueryState<Period>('period', 'year');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [overdueSort, setOverdueSort] = useState('late');

  const inScope = store.requests.filter((r) =>
    scope === 'all' ? true : scope === 'target' ? r.targetDept === user.dept : store.userById(r.requesterId)?.dept === user.dept);
  const range = rangeOf(selectedPeriod, today, custom);
  const rows = inScope.filter((r) => { const d = r.createdAt.slice(0, 10); return d >= range.from && d <= range.to; });
  const firstDay = rows.map((r) => r.createdAt.slice(0, 10)).sort()[0] ?? today;
  const from = range.from === '2000-01-01' ? firstDay : range.from;
  const rangeText = `${thaiDate(from, true)} – ${thaiDate(range.to, true)}`;
  const periodLabel = periods.find((p) => p.value === selectedPeriod)!.label;
  const scopeLabel = scopes.find((s) => s.value === scope)!.label;

  // --- การ์ดสรุป ---
  const approvedStatuses = ['pending_target', 'in_progress', 'pending_acceptance', 'done'];
  const overdue = rows.filter((r) => isOverdue(r));
  const summary = [
    { label: 'คำขอทั้งหมด', value: rows.length, detail: 'ในช่วงที่เลือก', color: 'bg-slate-400' },
    { label: 'อนุมัติแล้ว', value: rows.filter((r) => approvedStatuses.includes(r.status) || store.logs.some((l) => l.requestId === r.id && l.action === 'อนุมัติ')).length, detail: 'ผ่านขั้นถัดไป', color: 'bg-green-600' },
    { label: 'ปฏิเสธ/ส่งกลับ', value: rows.filter((r) => r.status === 'rejected' || r.status === 'returned').length, detail: 'พร้อมเหตุผล', color: 'bg-red-600' },
    { label: 'กำลังดำเนินการ', value: rows.filter((r) => r.status === 'in_progress').length, detail: 'มีงานย่อยค้าง', color: 'bg-indigo-600' },
    { label: 'เสร็จสิ้น', value: rows.filter((r) => r.status === 'done').length, detail: 'ตรวจรับแล้ว', color: 'bg-sky-600' },
    { label: 'เกินกำหนด', value: overdue.length, detail: 'ต้องติดตาม', color: 'bg-orange-500' },
  ];

  // --- กราฟตามช่วงเวลา: ช่วงยาวกว่า 2 เดือน → รายเดือน, สั้นกว่า → รายวัน ---
  const byMonth = daysBetween(from, range.to) > 62;
  const buckets: { key: string; label: string }[] = [];
  if (byMonth) {
    let [y, m] = from.slice(0, 7).split('-').map(Number);
    while (`${y}-${String(m).padStart(2, '0')}` <= range.to.slice(0, 7)) {
      buckets.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: thaiMonths[m - 1] });
      if (m === 12) { y++; m = 1; } else m++;
    }
  } else {
    for (let d = from; d <= range.to; d = addDays(d, 1)) buckets.push({ key: d, label: thaiDate(d) });
  }
  const monthlyRequests = buckets.map((b) => ({ ...b, count: rows.filter((r) => r.createdAt.slice(0, byMonth ? 7 : 10) === b.key).length }));
  const maxMonth = Math.max(1, ...monthlyRequests.map((m) => m.count));
  const labelEvery = Math.ceil(monthlyRequests.length / 12);

  const categories = store.categories.map((c) => ({ name: c.name, color: c.color, count: rows.filter((r) => r.categoryId === c.id).length }));
  const departments = store.depts.map((d) => ({ name: d, count: rows.filter((r) => store.userById(r.requesterId)?.dept === d).length })).filter((d) => d.count > 0);
  const targets = store.depts.map((d) => ({ name: d, count: rows.filter((r) => r.targetDept === d).length })).filter((d) => d.count > 0);

  const overdueOptions: SortOption<Request>[] = [
    { key: 'late', label: 'เลยกำหนดนานสุด', value: (r) => r.dueDate },
    { key: 'recent', label: 'เพิ่งเลยกำหนด', value: (r) => r.dueDate, dir: 'desc' },
    { key: 'code', label: 'รหัสคำขอ', value: (r) => r.code },
    { key: 'title', label: 'ชื่อคำขอ', value: (r) => r.title },
  ];

  return (
    <div className="min-w-0 text-slate-800">
      <div className="w-full">

        {/* --- HEADER SECTION --- */}
        {/* ส่วนหัวของหน้า ประกอบด้วยชื่อหน้า, ช่องค้นหา และปุ่มแจ้งเตือน */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-bold leading-9 tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">{scope === 'all' ? 'ภาพรวมทุกแผนก · ดูอย่างเดียว' : `ภาพรวม${scopeLabel}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <GlobalSearch />
            <NotificationBell />
          </div>
        </header>

        {/* --- PERIOD FILTER SECTION --- */}
        {/* แถบสำหรับเลือกช่วงเวลาข้อมูล และแสดงช่วงวันที่ปัจจุบัน */}
        <section aria-label="ตัวกรองช่วงเวลา" className="mb-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
          {scopes.length > 1 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-slate-600">ขอบเขต:</span>
              {scopes.map((s) => (
                <button key={s.value} type="button" aria-pressed={scope === s.value} onClick={() => setScope(s.value)}
                  className={`rounded-full border px-4 py-2 text-xs transition-colors ${scope === s.value
                    ? 'border-indigo-500 bg-indigo-50 font-semibold text-indigo-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* ปุ่มเลือกช่วงเวลา */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-slate-600">ช่วงเวลา:</span>
              {periods.map((period) => (
                <button key={period.value} type="button" aria-pressed={selectedPeriod === period.value}
                  onClick={() => setSelectedPeriod(period.value)} // เปลี่ยนช่วงเวลา → ตัวเลขและกราฟคำนวณใหม่
                  className={`rounded-full border px-4 py-2 text-xs transition-colors ${selectedPeriod === period.value
                    ? 'border-indigo-500 bg-indigo-50 font-semibold text-indigo-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {period.label}
                </button>
              ))}
            </div>

            {/* ช่วงวันที่ · เลือก "กำหนดเอง" แล้วเลือกวันได้ */}
            {selectedPeriod === 'custom' ? (
              <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-600">
                <Calendar className="h-4 w-4 text-slate-600" />
                <input aria-label="ตั้งแต่วันที่" type="date" className="outline-none" value={custom.from} max={custom.to || today} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                <span>–</span>
                <input aria-label="ถึงวันที่" type="date" className="outline-none" value={custom.to} min={custom.from} max={today} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
              </div>
            ) : (
              <button type="button" onClick={() => setSelectedPeriod('custom')} title="กำหนดช่วงวันที่เอง"
                className="inline-flex h-11 min-w-[260px] items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-600 hover:bg-slate-50">
                <span>{rangeText}</span>
                <Calendar className="h-4 w-4 text-slate-600" />
              </button>
            )}
          </div>

          {/* แถบแจ้งสถานะมุมมองปัจจุบัน */}
          <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-700">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>กำลังแสดง: {periodLabel} · {rangeText} · {scopeLabel} · {rows.length} คำขอ</span>
          </div>
        </section>

        {/* --- SUMMARY CARDS SECTION --- */}
        <section aria-label="สรุปคำขอ" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {summary.map((item) => (
            <article key={item.label} className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className={`h-2 w-2 rounded-full ${item.color}`} />
                {item.label}
              </div>
              <p className="mt-2 text-[28px] font-bold leading-8 text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
            </article>
          ))}
        </section>

        {/* --- CHARTS SECTION (Monthly Requests & Categories) --- */}
        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* กราฟแท่งคำขอรายเดือน (ช่วงสั้นแสดงรายวัน) */}
          <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm xl:col-span-7">
            <h2 className="text-lg font-semibold text-slate-800">{byMonth ? 'คำขอรายเดือน' : 'คำขอรายวัน'}</h2>
            <p className="mt-1 text-xs text-slate-600">{rangeText}</p>
            <div className="mt-6 flex h-[175px] items-end justify-between gap-1">
              {monthlyRequests.map((item, index) => (
                <div key={item.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${item.label}: ${item.count} คำขอ`}>
                  <span className="mb-1 text-[11px] font-semibold text-slate-600">{item.count || ''}</span>
                  {/* แท่งกราฟ (ความสูงตามสัดส่วน · เน้นสีช่วงล่าสุด) */}
                  <div className={`w-full max-w-[30px] rounded-t-[4px] ${index === monthlyRequests.length - 1 ? 'bg-indigo-600' : 'bg-indigo-200'}`}
                    style={{ height: `${(item.count / maxMonth) * 128}px` }} />
                  <span className="mt-2 h-3 text-[10px] text-slate-600">{index % labelEvery === 0 ? item.label : ''}</span>
                </div>
              ))}
            </div>
          </article>

          {/* สถิติตามหมวดคำขอ */}
          <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm xl:col-span-5">
            <h2 className="text-lg font-semibold text-slate-800">ตามหมวดคำขอ</h2>
            <div className="mt-5 space-y-4">
              {categories.map((category) => (
                <div key={category.name} className="flex items-center gap-2.5">
                  <span className="w-[100px] shrink-0 text-sm text-slate-600">{category.name}</span>
                  <Bar value={category.count} max={Math.max(...categories.map((c) => c.count))} color={category.color} />
                  <span className="w-7 text-right text-xs font-semibold text-slate-700">{category.count}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* --- DEPARTMENTS & OVERDUE --- */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm xl:col-span-6">
            <h2 className="text-lg font-semibold text-slate-800">ตามแผนกที่ส่งคำขอ</h2>
            <div className="mt-5 space-y-4">
              {departments.length === 0 && <p className="text-sm text-slate-600">ไม่มีคำขอในช่วงนี้</p>}
              {departments.map((department) => (
                <div key={department.name} className="flex items-center gap-2.5">
                  <span className="w-[110px] shrink-0 text-sm text-slate-600">{department.name}</span>
                  <Bar value={department.count} max={Math.max(...departments.map((d) => d.count))} />
                  <span className="w-7 text-right text-xs font-semibold text-slate-700">{department.count}</span>
                </div>
              ))}
            </div>
            <h2 className="mt-8 text-lg font-semibold text-slate-800">ตามแผนกปลายทาง</h2>
            <div className="mt-5 space-y-4">
              {targets.length === 0 && <p className="text-sm text-slate-600">ไม่มีคำขอในช่วงนี้</p>}
              {targets.map((department) => (
                <div key={department.name} className="flex items-center gap-2.5">
                  <span className="w-[110px] shrink-0 text-sm text-slate-600">{department.name}</span>
                  <Bar value={department.count} max={Math.max(...targets.map((d) => d.count))} />
                  <span className="w-7 text-right text-xs font-semibold text-slate-700">{department.count}</span>
                </div>
              ))}
            </div>
          </article>

          {/* รายการงานเกินกำหนด */}
          <article className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm xl:col-span-6">
            <div className="flex items-center justify-between gap-3 bg-slate-100/90 px-5 py-3 text-xs font-semibold text-slate-600">
              <h2>งานเกินกำหนด ({overdue.length})</h2>
              <SortSelect options={overdueOptions} value={overdueSort} onChange={setOverdueSort} />
            </div>
            <div className="divide-y divide-slate-200">
              {overdue.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-600">ไม่มีงานเกินกำหนดในช่วงนี้</p>}
              {sortBy(overdue, overdueOptions, overdueSort).map((task) => (
                <Link key={task.id} href={`/requests/${task.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{task.code} · กำหนด {thaiDate(task.dueDate, true)} · {task.targetDept}</p>
                  </div>
                  {/* ป้ายสถานะเกินกำหนด สีแดง */}
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    เลยกำหนด {daysBetween(task.dueDate, today)} วัน
                  </span>
                </Link>
              ))}
            </div>
          </article>
        </section>

      </div>
    </div>
  );
}
