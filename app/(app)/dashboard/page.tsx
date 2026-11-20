'use client';

// Dashboard (งานของพิชญ์ เดิม dashboard/page.tsx + Data/dashboardData.ts)
// ปรับให้ใช้ข้อมูลจริงจาก store + เติมส่วนที่ขาด:
//  - ชิปช่วงเวลาตาม requirement (รายปี / รายเดือน / รายอาทิตย์ / 3 วัน / วันนี้ / ทั้งหมด / กำหนดเอง) และกรองตัวเลข+กราฟจริง
//  - ขอบเขตตามโรล: หัวหน้าต้นสังกัด = คำขอของฝ่ายตัวเอง · หัวหน้าแผนก = คำขอที่เข้าแผนก · ผู้บริหาร/ผู้ดูแลระบบ = ทุกแผนก
//  - ขอบเขต "ทุกแผนก" (ผู้บริหาร/ผู้ดูแลระบบ) เลือกเจาะดูทีละแผนกได้ ทั้งคำขอ "จาก" แผนกนั้น และคำขอที่ "ส่งถึง" แผนกนั้น
//  - กดการ์ดสรุป / แท่งกราฟ / แถบหมวดหรือแผนก → เปิดรายการคำขอชุดนั้นใต้การ์ดสรุป แล้วกดเข้าคำขอได้ (?show= ใน URL)
//  - ช่องค้นหา/กระดิ่งใช้งานได้จริง · งานเกินกำหนดกดเปิดได้และเรียงลำดับได้ · เพิ่มกราฟตามแผนกปลายทาง
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Calendar, Xmark } from '@tailgrids/icons';
import { GlobalSearch, NotificationBell } from '@/components/page-header';
import { Guard } from '@/components/role-shell';
import { allRoles } from '@/data/users';
import SortSelect, { sortBy, type SortOption } from '@/components/sort-select';
import { useQueryState } from '@/components/use-query-state';
import StatusBadge from '@/components/status-badge';
import { daysBetween, displayStatus, isDoneLate, isOverdue, thaiDate, thaiMonths, todayISO, type Request } from '@/data/requests';
import { useStore } from '@/data/store';
import { toneStyle } from '@/components/status-tone';

export default function DashboardPage() {
  return <Guard roles={allRoles} perm="dashboard"><Dashboard /></Guard>;
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
  // โรลอื่นที่ได้สิทธิ์ดู Dashboard เพิ่ม (เช่น ผู้ขอ/ผู้รับงาน) → เห็นคำขอของแผนกตัวเอง
  if (scopes.length === 0) scopes.push({ value: 'source', label: `คำขอของ${user.dept}` });

  // --- STATE MANAGEMENT --- (เก็บใน URL เพื่อให้กดย้อนกลับ/ส่งลิงก์แล้วยังเห็นช่วงเดิม)
  const [scopeParam, setScope] = useQueryState<Scope>('scope', scopes[0].value);
  const scope = scopes.some((s) => s.value === scopeParam) ? scopeParam : scopes[0].value;
  // เจาะดูทีละแผนก (เฉพาะขอบเขตทุกแผนก) · '' = ทุกแผนก · side: from = คำขอจากแผนกนี้, to = คำขอที่ส่งถึงแผนกนี้
  const [deptParam, setDept] = useQueryState<string>('dept', '');
  const [sideParam, setSide] = useQueryState<'from' | 'to'>('side', 'from');
  const dept = scope === 'all' && store.depts.includes(deptParam) ? deptParam : '';
  const side = sideParam === 'to' ? 'to' : 'from';
  const [selectedPeriod, setSelectedPeriod] = useQueryState<Period>('period', 'year');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [overdueSort, setOverdueSort] = useState('late');
  // ชุดคำขอที่กดเจาะดู: card:<ลำดับการ์ด> · month:<ช่วง> · cat:<id หมวด> · from:<แผนกผู้ขอ> · to:<แผนกปลายทาง>
  const [show, setShow] = useQueryState<string>('show', '');
  const drillRef = useRef<HTMLElement>(null);

  const inScope = store.requests.filter((r) =>
    scope === 'all'
      ? !dept || (side === 'to' ? r.targetDept === dept : store.userById(r.requesterId)?.dept === dept)
      : scope === 'target' ? r.targetDept === user.dept : store.userById(r.requesterId)?.dept === user.dept);
  const range = rangeOf(selectedPeriod, today, custom);
  const rows = inScope.filter((r) => { const d = r.createdAt.slice(0, 10); return d >= range.from && d <= range.to; });
  const firstDay = rows.map((r) => r.createdAt.slice(0, 10)).sort()[0] ?? today;
  const from = range.from === '2000-01-01' ? firstDay : range.from;
  const rangeText = `${thaiDate(from, true)} – ${thaiDate(range.to, true)}`;
  const periodLabel = periods.find((p) => p.value === selectedPeriod)!.label;
  const scopeLabel = dept ? (side === 'to' ? `คำขอที่ส่งถึง${dept}` : `คำขอจาก${dept}`) : scopes.find((s) => s.value === scope)!.label;

  // --- การ์ดสรุป ---
  const approvedStatuses = ['pending_target', 'in_progress', 'pending_acceptance', 'done'];
  const overdue = rows.filter((r) => isOverdue(r));
  const cards: { label: string; detail: string; color: string; match: (r: Request) => boolean }[] = [
    { label: 'คำขอทั้งหมด', detail: 'ในช่วงที่เลือก', color: 'bg-slate-400', match: () => true },
    { label: 'อนุมัติแล้ว', detail: 'ผ่านขั้นถัดไป', color: 'bg-green-600', match: (r) => approvedStatuses.includes(r.status) || store.logs.some((l) => l.requestId === r.id && l.action === 'อนุมัติ') },
    { label: 'ปฏิเสธ/ส่งกลับ', detail: 'พร้อมเหตุผล', color: 'bg-red-600', match: (r) => r.status === 'rejected' || r.status === 'returned' },
    { label: 'กำลังดำเนินการ', detail: 'มีงานย่อยค้าง', color: 'bg-indigo-600', match: (r) => r.status === 'in_progress' },
    { label: 'เสร็จสิ้น', detail: 'ตรวจรับแล้ว', color: 'bg-sky-600', match: (r) => r.status === 'done' },
    { label: 'เกินกำหนด', detail: 'ต้องติดตาม', color: 'bg-orange-500', match: (r) => isOverdue(r) },
  ];
  const lateDone = rows.filter(isDoneLate).length;
  const summary = cards.map((c) => ({ ...c, value: rows.filter(c.match).length,
    // การ์ดเสร็จสิ้น: บอกด้วยว่ามีกี่คำขอที่ส่งมอบช้ากว่าวันที่ต้องการ
    detail: c.label === 'เสร็จสิ้น' && lateDone ? `ตรวจรับแล้ว · ส่งมอบช้า ${lateDone}` : c.detail }));

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

  const categories = store.categories.map((c) => ({ id: c.id, name: c.name, color: c.color, count: rows.filter((r) => r.categoryId === c.id).length }));
  const departments = store.depts.map((d) => ({ name: d, count: rows.filter((r) => store.userById(r.requesterId)?.dept === d).length })).filter((d) => d.count > 0);
  const targets = store.depts.map((d) => ({ name: d, count: rows.filter((r) => r.targetDept === d).length })).filter((d) => d.count > 0);

  // --- เจาะดู: แปลงค่า ?show= เป็นชื่อหัวข้อ + เงื่อนไขกรอง (คำขอชุดเดียวกับตัวเลขที่กด) ---
  const [kind, ...rest] = show.split(':');
  const arg = rest.join(':');
  const drill: { title: string; match: (r: Request) => boolean } | null =
    kind === 'card' && cards[Number(arg)] ? { title: cards[Number(arg)].label, match: cards[Number(arg)].match }
      : kind === 'month' && arg ? { title: `ส่งเมื่อ ${byMonth ? monthlyRequests.find((m) => m.key === arg)?.label ?? arg : thaiDate(arg, true)}`, match: (r) => r.createdAt.slice(0, arg.length) === arg }
        : kind === 'cat' && store.categories.some((c) => String(c.id) === arg) ? { title: `หมวด ${store.categories.find((c) => String(c.id) === arg)!.name}`, match: (r) => String(r.categoryId) === arg }
          : kind === 'from' && arg ? { title: `ส่งจาก${arg}`, match: (r) => store.userById(r.requesterId)?.dept === arg }
            : kind === 'to' && arg ? { title: `ส่งถึง${arg}`, match: (r) => r.targetDept === arg }
              : null;
  const drillRows = drill ? rows.filter(drill.match).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const toggleShow = (key: string) => setShow(show === key ? '' : key);
  // กดแล้วเลื่อนลงไปที่รายการ
  useEffect(() => { if (show) drillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [show]);
  const picked = (key: string) => show === key ? 'ring-2 ring-indigo-500 ring-offset-1' : '';

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
            <p className="mt-1 text-sm text-slate-600">{scope === 'all' ? (dept ? `ภาพรวม${scopeLabel} · ดูอย่างเดียว` : 'ภาพรวมทุกแผนก · ดูอย่างเดียว') : `ภาพรวม${scopeLabel}`}</p>
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
          {scope === 'all' && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label htmlFor="dash-dept" className="mr-1 text-xs font-medium text-slate-600">แผนก:</label>
              <select id="dash-dept" value={dept} onChange={(e) => setDept(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                <option value="">ทุกแผนก</option>
                {store.depts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {dept && ([['from', 'คำขอจากแผนกนี้'], ['to', 'คำขอที่ส่งถึงแผนกนี้']] as const).map(([v, label]) => (
                <button key={v} type="button" aria-pressed={side === v} onClick={() => setSide(v)}
                  className={`rounded-full border px-4 py-2 text-xs transition-colors ${side === v
                    ? 'border-indigo-500 bg-indigo-50 font-semibold text-indigo-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {label}
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
          {summary.map((item, i) => (
            <button key={item.label} type="button" onClick={() => toggleShow(`card:${i}`)} aria-pressed={show === `card:${i}`} title={`ดูรายการ${item.label}`}
              className={`rounded-xl border border-slate-300 bg-white p-5 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md ${picked(`card:${i}`)}`}>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className={`h-2 w-2 rounded-full ${item.color}`} />
                {item.label}
              </div>
              <p className="mt-2 text-[28px] font-bold leading-8 text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
            </button>
          ))}
        </section>

        {/* --- รายการที่กดเจาะดู --- */}
        {drill && (
          <section ref={drillRef} aria-label={`รายการ${drill.title}`} className="mb-6 scroll-mt-4 overflow-hidden rounded-xl border border-indigo-300 bg-white shadow-md">
            <div className="flex items-center justify-between gap-3 bg-indigo-50 px-5 py-3">
              <h2 className="text-sm font-semibold text-indigo-800">{drill.title} · {drillRows.length} คำขอ <span className="font-normal text-indigo-700">({periodLabel} · {scopeLabel})</span></h2>
              <button type="button" onClick={() => setShow('')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                <Xmark className="size-4" />ปิด
              </button>
            </div>
            <div className="max-h-[420px] divide-y divide-slate-200 overflow-y-auto">
              {drillRows.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-600">ไม่มีคำขอในชุดนี้</p>}
              {drillRows.map((r) => {
                const body = (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{r.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{r.code} · {store.userById(r.requesterId)?.dept} → {r.targetDept} · ส่ง {thaiDate(r.createdAt.slice(0, 10), true)} · ต้องการ {thaiDate(r.dueDate, true)}</p>
                    </div>
                    <StatusBadge status={displayStatus(r)} className="shrink-0 bg-white ring-1 ring-current" />
                  </>
                );
                // เปิดได้เฉพาะคำขอที่ผู้ใช้มีสิทธิ์ดู (ตัวเลขนับได้ แต่บางคนเข้าไปดูรายละเอียดไม่ได้)
                return store.canSee(r)
                  ? <Link key={r.id} href={`/requests/${r.id}`} style={toneStyle(displayStatus(r))} className="tone-item tone-row flex items-center justify-between gap-3 px-5 py-3">{body}</Link>
                  : <div key={r.id} style={toneStyle(displayStatus(r))} className="tone-item flex items-center justify-between gap-3 px-5 py-3" title="ไม่มีสิทธิ์เปิดดูรายละเอียดคำขอนี้">{body}</div>;
              })}
            </div>
          </section>
        )}

        {/* --- CHARTS SECTION (Monthly Requests & Categories) --- */}
        <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* กราฟแท่งคำขอรายเดือน (ช่วงสั้นแสดงรายวัน) */}
          <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm xl:col-span-7">
            <h2 className="text-lg font-semibold text-slate-800">{byMonth ? 'คำขอรายเดือน' : 'คำขอรายวัน'}</h2>
            <p className="mt-1 text-xs text-slate-600">{rangeText}</p>
            <div className="mt-6 flex h-[175px] items-end justify-between gap-1">
              {monthlyRequests.map((item, index) => (
                <button key={item.key} type="button" disabled={!item.count} onClick={() => toggleShow(`month:${item.key}`)} aria-pressed={show === `month:${item.key}`}
                  className={`group flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-md disabled:cursor-default ${show === `month:${item.key}` ? 'bg-indigo-50' : ''}`}
                  title={`${item.label}: ${item.count} คำขอ${item.count ? ' · กดเพื่อดูรายการ' : ''}`}>
                  <span className="mb-1 text-[11px] font-semibold text-slate-600">{item.count || ''}</span>
                  {/* แท่งกราฟ (ความสูงตามสัดส่วน · เน้นสีช่วงล่าสุด) */}
                  <div className={`w-full max-w-[30px] rounded-t-[4px] group-enabled:group-hover:bg-indigo-400 ${index === monthlyRequests.length - 1 || show === `month:${item.key}` ? 'bg-indigo-600' : 'bg-indigo-200'}`}
                    style={{ height: `${(item.count / maxMonth) * 128}px` }} />
                  <span className="mt-2 h-3 text-[10px] text-slate-600">{index % labelEvery === 0 ? item.label : ''}</span>
                </button>
              ))}
            </div>
          </article>

          {/* สถิติตามหมวดคำขอ */}
          <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm xl:col-span-5">
            <h2 className="text-lg font-semibold text-slate-800">ตามหมวดคำขอ</h2>
            <div className="mt-5 space-y-2">
              {categories.map((category) => (
                <button key={category.name} type="button" disabled={!category.count} onClick={() => toggleShow(`cat:${category.id}`)} aria-pressed={show === `cat:${category.id}`}
                  title={category.count ? `ดูคำขอหมวด${category.name}` : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left enabled:hover:bg-slate-50 disabled:cursor-default ${picked(`cat:${category.id}`)}`}>
                  <span className="w-[100px] shrink-0 text-sm text-slate-600">{category.name}</span>
                  <Bar value={category.count} max={Math.max(...categories.map((c) => c.count))} color={category.color} />
                  <span className="w-7 text-right text-xs font-semibold text-slate-700">{category.count}</span>
                </button>
              ))}
            </div>
          </article>
        </section>

        {/* --- DEPARTMENTS & OVERDUE --- */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm xl:col-span-6">
            <h2 className="text-lg font-semibold text-slate-800">ตามแผนกที่ส่งคำขอ</h2>
            <div className="mt-5 space-y-2">
              {departments.length === 0 && <p className="text-sm text-slate-600">ไม่มีคำขอในช่วงนี้</p>}
              {departments.map((department) => (
                <button key={department.name} type="button" onClick={() => toggleShow(`from:${department.name}`)} aria-pressed={show === `from:${department.name}`} title={`ดูคำขอที่ส่งจาก${department.name}`}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left hover:bg-slate-50 ${picked(`from:${department.name}`)}`}>
                  <span className="w-[110px] shrink-0 text-sm text-slate-600">{department.name}</span>
                  <Bar value={department.count} max={Math.max(...departments.map((d) => d.count))} />
                  <span className="w-7 text-right text-xs font-semibold text-slate-700">{department.count}</span>
                </button>
              ))}
            </div>
            <h2 className="mt-8 text-lg font-semibold text-slate-800">ตามแผนกปลายทาง</h2>
            <div className="mt-5 space-y-2">
              {targets.length === 0 && <p className="text-sm text-slate-600">ไม่มีคำขอในช่วงนี้</p>}
              {targets.map((department) => (
                <button key={department.name} type="button" onClick={() => toggleShow(`to:${department.name}`)} aria-pressed={show === `to:${department.name}`} title={`ดูคำขอที่ส่งถึง${department.name}`}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left hover:bg-slate-50 ${picked(`to:${department.name}`)}`}>
                  <span className="w-[110px] shrink-0 text-sm text-slate-600">{department.name}</span>
                  <Bar value={department.count} max={Math.max(...targets.map((d) => d.count))} />
                  <span className="w-7 text-right text-xs font-semibold text-slate-700">{department.count}</span>
                </button>
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
                <Link key={task.id} href={`/requests/${task.id}`} style={toneStyle('overdue')} className="tone-item tone-row flex items-center justify-between gap-3 px-5 py-4">
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
