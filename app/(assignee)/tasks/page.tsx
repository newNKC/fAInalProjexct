'use client';

// งานของฉัน (งานของพิชญ์ เดิม tasks/page.tsx + Data/taskData.ts)
// ปรับให้ใช้ข้อมูลจริงจาก store: งานย่อยที่หัวหน้ามอบหมายให้ผู้ใช้คนนี้ · อัปเดต % แล้วบันทึกจริง (ครบ 100% ทุกงาน → คำขอไปรอผู้ขอตรวจรับ)
// เติมส่วนที่ขาด: เลือก % ได้ทั้งขึ้นและลง (เดิม +20 อย่างเดียว), สถานะคำนวณจากวันกำหนดส่ง, กดหัวคอลัมน์เพื่อเรียง,
//               กระดิ่งใช้งานได้จริง, เอาปุ่ม "ถัดไป" ของ prototype ออก
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ErrorCircle1, Search1 } from '@tailgrids/icons';
import { NotificationBell } from '@/components/page-header';
import { toneStyle } from '@/components/status-tone';
import { daysBetween, isLeafTask, thaiDate, todayISO, type Task } from '@/data/requests';
import { useStore } from '@/data/store';

type TaskStatus = 'in_progress' | 'overdue' | 'completed';
type TaskItem = {
  id: number; title: string; reqCode: string; requestId: number; subCategory: string; mainTask: string;
  dueDate: string; progress: number; status: TaskStatus; editable: boolean; completedAt: string | null;
};
type SortKey = 'title' | 'mainTask' | 'dueDate' | 'status' | 'progress';

const STEPS = [0, 20, 40, 60, 80, 100];

export default function MyTasksPage() {
  const store = useStore();
  const user = store.user!;
  const today = todayISO();
  useEffect(() => { document.title = 'งานของฉัน · ระบบจัดการคำขอ'; }, []);

  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState(''); // คำค้นหาสำหรับกรองงาน
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'dueDate', dir: 'asc' });
  const [editing, setEditing] = useState<number | null>(null); // งานที่กำลังเลือก %

  // งานย่อยของผู้ใช้คนนี้ แปลงเป็นรูปแบบข้อมูลเดิมของหน้า (TaskItem)
  const tasks: TaskItem[] = store.tasks
    .filter((t) => t.assigneeId === user.id && isLeafTask(t, store.tasks))
    .map((t: Task) => {
      const r = store.requests.find((x) => x.id === t.requestId);
      const status: TaskStatus = t.progress >= 100 ? 'completed' : t.dueDate < today ? 'overdue' : 'in_progress';
      return {
        id: t.id, title: t.title, reqCode: r?.code ?? '-', requestId: t.requestId,
        subCategory: store.categories.find((c) => c.id === r?.categoryId)?.name ?? '-',
        mainTask: store.tasks.find((x) => x.id === t.parentId)?.title ?? '-',
        dueDate: t.dueDate, progress: t.progress, status,
        editable: r?.status === 'in_progress' && store.can('progress'), completedAt: t.completedAt,
      };
    });

  /** กรองรายการงานตามคำค้นหา (ชื่อชิ้นงาน, รหัสคำขอ, หมวด) แล้วเรียงตามหัวคอลัมน์ที่เลือก */
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('th');
    const rank: Record<TaskStatus, number> = { overdue: 0, in_progress: 1, completed: 2 };
    const value = (t: TaskItem) => sort.key === 'status' ? rank[t.status] : sort.key === 'progress' ? t.progress : t[sort.key];
    return tasks
      .filter((task) => `${task.title} ${task.reqCode} ${task.subCategory}`.toLocaleLowerCase('th').includes(query))
      .sort((a, b) => {
        const x = value(a), y = value(b);
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'th');
        return sort.dir === 'asc' ? cmp : -cmp;
      });
  }, [searchQuery, tasks, sort]);

  // --- STATISTICAL CALCULATIONS ---
  const totalCount = tasks.length;
  const inProgressCount = tasks.filter((task) => task.status !== 'completed').length;
  const overdueTasks = tasks.filter((task) => task.status === 'overdue');
  // คำขอที่ผู้ขอกด "ขอให้แก้ไข" และมีงานของผู้ใช้คนนี้อยู่
  const fixRequests = store.requests.filter((r) => r.status === 'in_progress' && r.fixReason && tasks.some((t) => t.requestId === r.id));
  const doneThisWeek = tasks.filter((task) => task.completedAt && daysBetween(task.completedAt, today) <= 6);

  /** บันทึก % ความคืบหน้า (ครบ 100% → งานเสร็จ) */
  const handleUpdateProgress = (task: TaskItem, progress: number) => {
    store.setProgress(task.id, progress);
    setEditing(null);
    store.showToast(progress === 100 ? `“${task.title}” เสร็จแล้ว` : `อัปเดต “${task.title}” เป็น ${progress}%`);
  };

  const th = (key: SortKey, label: string, className = '') => (
    <th className={`px-4 py-3.5 ${className}`} aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" title={`เรียงตาม${label}`} className="inline-flex items-center gap-1 hover:text-slate-700"
        onClick={() => setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })}>
        {label}
        {sort.key === key ? (sort.dir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronDown className="h-3.5 w-3.5 opacity-30" />}
      </button>
    </th>
  );

  return (
    <div className="w-full overflow-x-hidden text-slate-800">
      <div className="min-w-0">
        <div className="w-full">
          {/* --- HEADER SECTION --- */}
          <header className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-bold leading-9 tracking-tight text-slate-900">งานของฉัน</h1>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              {/* ช่องค้นหางานในตาราง */}
              <label className="relative block w-[260px] max-w-[calc(100vw-100px)]">
                <span className="sr-only">ค้นหางานด้วยชื่อหรือรหัสคำขอ</span>
                <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ค้นหารหัสหรือชื่องาน"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white py-3 pl-4 pr-10 text-sm text-slate-700 outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                <Search1 className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-600" />
              </label>
              <NotificationBell />
            </div>
          </header>

          {/* --- OVERDUE ALERT BANNER --- */}
          {overdueTasks.length > 0 && (
            <section aria-label="การแจ้งเตือนงานเกินกำหนด" className="mb-6 flex items-center gap-3 rounded-lg bg-red-100 px-4 py-4 text-sm font-medium text-red-700">
              <ErrorCircle1 className="h-5 w-5 shrink-0" />
              <p>
                มี {overdueTasks.length} งานเกินกำหนด: {overdueTasks.map((t) => `${t.title} (${t.reqCode}) เลยกำหนดวันที่ ${thaiDate(t.dueDate, true)}`).join(', ')}
              </p>
            </section>
          )}

          {/* --- FIX REQUEST BANNER --- (ผู้ขอขอให้แก้ไขหลังงานเสร็จ) */}
          {fixRequests.map((r) => (
            <section key={r.id} aria-label="ผู้ขอขอให้แก้ไข" className="mb-6 flex items-center gap-3 rounded-lg bg-orange-100 px-4 py-4 text-sm font-medium text-orange-800">
              <ErrorCircle1 className="h-5 w-5 shrink-0" />
              <p>ผู้ขอขอให้แก้ไข {r.code} “{r.title}”: {r.fixReason} · งานที่เคยเสร็จกลับมาเป็น 80% ให้อัปเดตใหม่เมื่อแก้เสร็จ</p>
            </section>
          ))}

          {/* --- SUMMARY CARDS SECTION --- */}
          <section aria-label="สรุปงาน" className="mb-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="งานทั้งหมด" value={totalCount} detail="ที่ได้รับมอบหมาย" dotClass="bg-slate-400" />
            <SummaryCard label="กำลังทำ" value={inProgressCount} detail="อัปเดต % ได้" dotClass="bg-indigo-600" />
            <SummaryCard label="เกินกำหนด" value={overdueTasks.length} detail="ควรแจ้งหัวหน้า" dotClass="bg-red-600" />
            <SummaryCard label="เสร็จสัปดาห์นี้" value={doneThisWeek.length} detail={doneThisWeek.map((t) => t.reqCode).filter((c, i, a) => a.indexOf(c) === i).join(', ') || '-'} dotClass="bg-green-600" />
          </section>

          {/* --- TASKS TABLE SECTION --- */}
          <section aria-label="รายการงาน" className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-slate-100/90 text-xs font-semibold text-slate-600">
                  <tr>
                    {th('title', 'งานย่อย', 'w-[40%]')}
                    {th('mainTask', 'งานหลัก')}
                    {th('dueDate', 'กำหนดส่ง')}
                    {th('status', 'สถานะ')}
                    {th('progress', 'ความคืบหน้า (กดเพื่ออัปเดต)', 'w-[24%]')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-sm">
                  {filteredTasks.map((task) => (
                    <TaskRow key={task.id} task={task} editing={editing === task.id}
                      onEdit={() => setEditing(editing === task.id ? null : task.id)} onUpdateProgress={handleUpdateProgress} />
                  ))}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-600">
                        {searchQuery ? `ไม่พบงานที่ตรงกับ “${searchQuery}”` : 'ยังไม่มีงานที่ได้รับมอบหมาย'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* คำแนะนำใต้ตาราง */}
          <p className="mt-6 text-xs leading-6 text-slate-600">
            ผู้รับงานสามารถอัปเดตความคืบหน้าของงานได้ · งานย่อยครบ 100% ทุกงาน คำขอจะไปรอผู้ขอตรวจรับเอง · หากติดปัญหาให้แจ้งหัวหน้าแผนก
          </p>
        </div>
      </div>
    </div>
  );
}

/** คอมโพเนนต์ย่อย: การ์ดแสดงสถิติสรุปงานแต่ละรายการ */
function SummaryCard({ label, value, detail, dotClass }: { label: string; value: number; detail: string; dotClass: string }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        {label}
      </div>
      <p className="mt-2 text-[30px] font-bold leading-9 text-slate-900">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-600">{detail}</p>
    </article>
  );
}

/** คอมโพเนนต์ย่อย: แถวข้อมูลงานแต่ละรายการในตาราง */
function TaskRow({ task, editing, onEdit, onUpdateProgress }: {
  task: TaskItem; editing: boolean; onEdit: () => void; onUpdateProgress: (task: TaskItem, progress: number) => void;
}) {
  const today = todayISO();
  const statusStyles = { in_progress: 'bg-indigo-50 text-indigo-600', overdue: 'bg-red-600 text-white', completed: 'bg-green-100 text-green-700' }[task.status];
  const statusLabels = { in_progress: 'กำลังดำเนินการ', overdue: 'เกินกำหนด', completed: 'เสร็จสิ้น' }[task.status];

  return (
    <tr className="tone-row transition-colors" style={toneStyle(({ in_progress: 'in_progress', overdue: 'overdue', completed: 'done' } as const)[task.status])}>
      <td className="px-4 py-4">
        <p className="font-semibold text-slate-800">{task.title}</p>
        <Link href={`/requests/${task.requestId}`} className="mt-1 block text-xs text-slate-600 hover:text-indigo-600 hover:underline">
          {task.reqCode} · {task.subCategory}
        </Link>
      </td>
      <td className="px-4 py-4 text-slate-700">{task.mainTask}</td>
      <td className="px-4 py-4 text-slate-700">
        {thaiDate(task.dueDate, true)}
        {task.status === 'overdue' && <span className="block text-xs text-red-600">เลย {daysBetween(task.dueDate, today)} วัน</span>}
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap ${statusStyles}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusLabels}
        </span>
      </td>
      <td className="px-4 py-4">
        {editing ? (
          <div className="flex flex-wrap gap-1" role="group" aria-label={`เลือกความคืบหน้า ${task.title}`}>
            {STEPS.map((v) => (
              <button key={v} type="button" onClick={() => onUpdateProgress(task, v)}
                className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${v === task.progress ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-indigo-50'}`}>
                {v}%
              </button>
            ))}
            <button type="button" onClick={onEdit} className="px-1 text-xs text-slate-600 hover:underline">ยกเลิก</button>
          </div>
        ) : (
          <button type="button" onClick={onEdit} disabled={!task.editable}
            title={task.editable ? 'กดเพื่ออัปเดตความคืบหน้า' : 'คำขอนี้ไม่ได้อยู่ระหว่างดำเนินการ'}
            aria-label={`อัปเดตความคืบหน้า ${task.title}`}
            className="group flex w-full items-center gap-2 text-left disabled:cursor-default disabled:opacity-60">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className={`block h-full rounded-full ${task.status === 'completed' ? 'bg-green-600' : 'bg-indigo-600'}`} style={{ width: `${task.progress}%` }} />
            </span>
            <span className="w-9 text-right text-xs font-semibold text-slate-600">{task.progress}%</span>
          </button>
        )}
      </td>
    </tr>
  );
}
