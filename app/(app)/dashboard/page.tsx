'use client'

import { useState } from "react";
import CategoryBadge from "@/components/category-badge";
import FilterChips from "@/components/filter-chips";
import PageHeader from "@/components/page-header";
import { useQueryState } from "@/components/use-query-state";
import ProgressBar from "@/components/progress-bar";
import { Card } from "@/components/request-parts";
import { fieldClass } from "@/components/request-form";
import { Guard } from "@/components/role-shell";
import SortTable, { type Column } from "@/components/sort-table";
import StatCard from "@/components/stat-card";
import StatusBadge, { STATUS_LABEL } from "@/components/status-badge";
import { daysBetween, displayStatus, isOverdue, nick, requestProgress, thaiDate, thaiMonths, todayISO, type Request } from "@/data/requests";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

// Dashboard · ขอบเขตข้อมูลตามโรล: หัวหน้าต้นสังกัด = คำขอของฝ่ายตัวเอง · หัวหน้าแผนก = คำขอที่เข้าแผนก · ผู้บริหาร/ผู้ดูแลระบบ = ทุกแผนก
export default function Page() {
    return <Guard roles={["approver", "head", "executive", "admin"]} perm="dashboard"><Dashboard /></Guard>
}

type Period = "year" | "month" | "week" | "3days" | "today" | "all" | "custom"
type Scope = "all" | "target" | "source"

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const addDays = (s: string, n: number) => { const d = new Date(`${s}T00:00:00`); d.setDate(d.getDate() + n); return iso(d); }

// ช่วงวันที่ของแต่ละชิป (นับถึงวันนี้)
function rangeOf(p: Period, today: string, custom: { from: string, to: string }): { from: string, to: string } {
    const d = new Date(`${today}T00:00:00`);
    switch (p) {
        case "year": return { from: `${today.slice(0, 4)}-01-01`, to: today };
        case "month": return { from: `${today.slice(0, 7)}-01`, to: today };
        case "week": return { from: addDays(today, -((d.getDay() + 6) % 7)), to: today };   // ตั้งแต่วันจันทร์
        case "3days": return { from: addDays(today, -2), to: today };
        case "today": return { from: today, to: today };
        case "custom": return { from: custom.from || "2000-01-01", to: custom.to || today };
        default: return { from: "2000-01-01", to: today };
    }
}

function Dashboard() {
    const store = useStore();
    const user = store.user!;
    const today = todayISO();

    // ขอบเขตที่ผู้ใช้คนนี้ดูได้ (มีหลายโรลเลือกได้)
    const scopes: { value: Scope, label: string }[] = [];
    if (user.roles.includes("executive") || user.roles.includes("admin")) scopes.push({ value: "all", label: "ทุกแผนก" });
    if (user.roles.includes("head")) scopes.push({ value: "target", label: `คำขอที่เข้า${user.dept}` });
    if (user.roles.includes("approver")) scopes.push({ value: "source", label: `คำขอของ${user.dept}` });

    const [scopeParam, setScope] = useQueryState<Scope>("scope", scopes[0].value);
    const scope = scopes.some((s) => s.value === scopeParam) ? scopeParam : scopes[0].value;
    const [period, setPeriod] = useQueryState<Period>("period", "year");
    const [custom, setCustom] = useState({ from: "", to: "" });

    const inScope = store.requests.filter((r) =>
        scope === "all" ? true : scope === "target" ? r.targetDept === user.dept : store.userById(r.requesterId)?.dept === user.dept);
    const range = rangeOf(period, today, custom);
    const rows = inScope.filter((r) => { const d = r.createdAt.slice(0, 10); return d >= range.from && d <= range.to; });

    const approvedStatuses = ["pending_target", "in_progress", "pending_acceptance", "done"];
    const wasApproved = (r: Request) => approvedStatuses.includes(r.status) || store.logs.some((l) => l.requestId === r.id && l.action === "อนุมัติ");
    const overdue = rows.filter((r) => isOverdue(r));

    // กราฟตามช่วงเวลา: ช่วงยาวกว่า 2 เดือน → รายเดือน, สั้นกว่า → รายวัน
    const span = daysBetween(range.from === "2000-01-01" ? (rows.map((r) => r.createdAt.slice(0, 10)).sort()[0] ?? today) : range.from, range.to);
    const byMonth = span > 62;
    const buckets: { key: string, label: string }[] = [];
    if (byMonth) {
        const start = range.from === "2000-01-01" ? (rows.map((r) => r.createdAt.slice(0, 7)).sort()[0] ?? today.slice(0, 7)) : range.from.slice(0, 7);
        for (let [y, m] = start.split("-").map(Number); `${y}-${String(m).padStart(2, "0")}` <= range.to.slice(0, 7); m === 12 ? (y++, m = 1) : m++) {
            buckets.push({ key: `${y}-${String(m).padStart(2, "0")}`, label: thaiMonths[m - 1] });
        }
    } else {
        for (let d = range.from; d <= range.to; d = addDays(d, 1)) buckets.push({ key: d, label: thaiDate(d) });
    }
    const trend = buckets.map((b) => ({ ...b, value: rows.filter((r) => r.createdAt.slice(0, byMonth ? 7 : 10) === b.key).length }));

    const byCategory = store.categories.map((c) => ({ label: c.name, color: c.color, value: rows.filter((r) => r.categoryId === c.id).length }));
    const byDept = store.depts.map((d) => ({ label: d, value: rows.filter((r) => store.userById(r.requesterId)?.dept === d) .length })).filter((x) => x.value > 0 || scope !== "source");
    const byTarget = store.depts.map((d) => ({ label: d, value: rows.filter((r) => r.targetDept === d).length })).filter((x) => x.value > 0);

    const subtitle = scope === "all" ? "ภาพรวมทุกแผนก · ดูอย่างเดียว" : scope === "target" ? `ภาพรวมคำขอที่เข้า${user.dept}` : `ภาพรวมคำขอของ${user.dept}`;
    const showing = period === "all" ? "ทั้งหมด" : `${thaiDate(range.from === "2000-01-01" ? today : range.from, true)} – ${thaiDate(range.to, true)}`;
    const category = (r: Request) => store.categories.find((c) => c.id === r.categoryId);

    const baseCols: Column<Request>[] = [
        { key: "title", label: "คำขอ", sortValue: (r) => r.title, render: (r) => <div><p className="font-medium text-ink">{r.title}</p><p className="text-xs font-normal text-ink-3">{r.code}</p></div> },
        { key: "cat", label: "หมวด", sortValue: (r) => category(r)?.name ?? "", render: (r) => <CategoryBadge category={category(r)} /> },
        { key: "from", label: "จาก", sortValue: (r) => store.userById(r.requesterId)?.dept ?? "", render: (r) => <span className="text-ink-2">{nick(store.userById(r.requesterId)?.name)} · {store.userById(r.requesterId)?.dept}</span> },
        { key: "target", label: "ส่งถึง", sortValue: (r) => r.targetDept, render: (r) => <span className="text-ink-2">{r.targetDept}</span> },
    ];
    const lateCols: Column<Request>[] = [
        ...baseCols,
        { key: "due", label: "วันที่ต้องการ", sortValue: (r) => r.dueDate, render: (r) => <span className="text-xs text-ink-2">{thaiDate(r.dueDate, true)}</span> },
        { key: "late", label: "เลยกำหนด", sortValue: (r) => daysBetween(r.dueDate, today), render: (r) => <span className="text-xs font-semibold text-[#BE123C]">เลยกำหนด {daysBetween(r.dueDate, today)} วัน</span> },
        { key: "progress", label: "ความคืบหน้า", sortValue: (r) => requestProgress(r, store.tasks), render: (r) => <ProgressBar className="w-32" value={requestProgress(r, store.tasks)} /> },
    ];
    const allCols: Column<Request>[] = [
        ...baseCols,
        { key: "created", label: "ส่งเมื่อ", sortValue: (r) => r.createdAt, render: (r) => <span className="text-xs text-ink-2">{thaiDate(r.createdAt, true)}</span> },
        { key: "status", label: "สถานะ", sortValue: (r) => STATUS_LABEL[displayStatus(r)], render: (r) => <StatusBadge status={displayStatus(r)} /> },
        { key: "progress", label: "ความคืบหน้า", sortValue: (r) => requestProgress(r, store.tasks), render: (r) => <ProgressBar className="w-32" value={requestProgress(r, store.tasks)} /> },
    ];

    return (
        <>
            <PageHeader title="Dashboard" subtitle={subtitle} />

            {/* ตัวกรองช่วงเวลา */}
            <Card className="mb-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    {scopes.length > 1 && (
                        <div className="flex items-center gap-2"><span className="text-xs font-semibold text-ink-2">ขอบเขต</span>
                            <FilterChips value={scope} onChange={setScope} options={scopes} />
                        </div>
                    )}
                    <div className="flex items-center gap-2"><span className="text-xs font-semibold text-ink-2">ช่วงเวลา</span>
                        <FilterChips value={period} onChange={setPeriod} options={[
                            { value: "year", label: "รายปี" }, { value: "month", label: "รายเดือน" }, { value: "week", label: "รายอาทิตย์" },
                            { value: "3days", label: "3 วัน" }, { value: "today", label: "วันนี้" }, { value: "all", label: "ทั้งหมด" }, { value: "custom", label: "กำหนดเอง" },
                        ]} />
                    </div>
                    {period === "custom" && (
                        <div className="flex items-center gap-2 text-sm text-ink-2">
                            <input aria-label="ตั้งแต่วันที่" type="date" className={cn(fieldClass, "w-auto py-1.5")} value={custom.from} max={custom.to || today} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                            ถึง
                            <input aria-label="ถึงวันที่" type="date" className={cn(fieldClass, "w-auto py-1.5")} value={custom.to} min={custom.from} max={today} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
                        </div>
                    )}
                </div>
                <p className="mt-3 text-xs text-ink-3">กำลังแสดง: คำขอที่ส่งในช่วง {showing} · {rows.length} รายการ</p>
            </Card>

            <div className="mb-4 grid grid-cols-6 gap-4">
                <StatCard label="คำขอทั้งหมด" value={rows.length} />
                <StatCard label="อนุมัติแล้ว" value={rows.filter(wasApproved).length} tone="brand" />
                <StatCard label="ปฏิเสธ/ส่งกลับ" value={rows.filter((r) => r.status === "rejected" || r.status === "returned").length} tone="warning" />
                <StatCard label="กำลังดำเนินการ" value={rows.filter((r) => r.status === "in_progress").length} />
                <StatCard label="เสร็จสิ้น" value={rows.filter((r) => r.status === "done").length} tone="success" />
                <StatCard label="เกินกำหนด" value={overdue.length} tone="danger" />
            </div>

            <div className="mb-4 grid grid-cols-[1.6fr_1fr] gap-4">
                <Card title={byMonth ? "คำขอรายเดือน" : "คำขอรายวัน"} hint="นับตามวันที่ส่งคำขอ">
                    <ColumnChart data={trend} />
                </Card>
                <Card title="ตามหมวดคำขอ"><HBars data={byCategory} /></Card>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-4">
                <Card title="ตามแผนกที่ส่งคำขอ"><HBars data={byDept} /></Card>
                <Card title="ตามแผนกปลายทาง"><HBars data={byTarget} /></Card>
            </div>

            <h2 className="mb-2 font-semibold text-ink">งานเกินกำหนด ({overdue.length})</h2>
            <div className="mb-6">
                <SortTable rows={overdue} columns={lateCols} rowKey={(r) => r.id} rowHref={(r) => `/requests/${r.id}`} initialSort={{ key: "late", dir: "desc" }} empty="ไม่มีงานเกินกำหนดในช่วงนี้" />
            </div>

            <h2 className="mb-2 font-semibold text-ink">คำขอในช่วงนี้ ({rows.length})</h2>
            <SortTable rows={rows} columns={allCols} rowKey={(r) => r.id} rowHref={(r) => `/requests/${r.id}`} initialSort={{ key: "created", dir: "desc" }} empty="ไม่มีคำขอในช่วงนี้" />
        </>
    )
}

// กราฟแท่งแนวตั้ง (สีเดียว) · ชี้ที่แท่งเพื่อดูตัวเลข
function ColumnChart({ data }: { data: { key: string, label: string, value: number }[] }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    const step = Math.ceil(data.length / 12);   // ป้ายแกน x ไม่เกิน ~12 ป้าย
    return (
        <div>
            <div className="relative flex h-48 items-end gap-1 border-b border-line">
                {[0.5, 1].map((f) => <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${f * 100}%` }} />)}
                {data.map((d) => (
                    <div key={d.key} className="group relative flex h-full flex-1 flex-col items-center justify-end" title={`${d.label}: ${d.value} คำขอ`}>
                        {d.value > 0 && <span className="mb-1 text-[11px] font-semibold text-ink-2">{d.value}</span>}
                        <div className="w-full max-w-10 rounded-t bg-brand transition group-hover:bg-brand-strong" style={{ height: `${(d.value / max) * 85}%`, minHeight: d.value ? 4 : 0 }} />
                    </div>
                ))}
            </div>
            <div className="mt-1.5 flex gap-1">
                {data.map((d, i) => <span key={d.key} className="flex-1 truncate text-center text-[11px] text-ink-3">{i % step === 0 ? d.label : ""}</span>)}
            </div>
        </div>
    )
}

// กราฟแท่งแนวนอน · color = สีของหมวด (ถ้ามี) ไม่งั้นใช้สีหลัก
function HBars({ data }: { data: { label: string, value: number, color?: string }[] }) {
    const max = Math.max(1, ...data.map((d) => d.value));
    if (data.length === 0) return <p className="text-sm text-ink-3">ไม่มีข้อมูล</p>;
    return (
        <div className="flex flex-col gap-2.5">
            {[...data].sort((a, b) => b.value - a.value).map((d) => (
                <div key={d.label} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm" title={`${d.label}: ${d.value} คำขอ`}>
                    <span className="truncate text-ink-2">{d.label}</span>
                    <div className="h-3 rounded-r bg-page">
                        <div className="h-full rounded-r" style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? "var(--color-brand)" }} />
                    </div>
                    <span className="text-right font-semibold text-ink">{d.value}</span>
                </div>
            ))}
        </div>
    )
}
