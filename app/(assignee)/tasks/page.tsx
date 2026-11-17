'use client'

import Link from "next/link";
import { useState } from "react";
import { InfoCircle } from "@tailgrids/icons";
import Banner from "@/components/banner";
import FilterChips from "@/components/filter-chips";
import PageHeader from "@/components/page-header";
import ProgressBar from "@/components/progress-bar";
import SortTable, { type Column } from "@/components/sort-table";
import StatCard from "@/components/stat-card";
import { daysBetween, isLeafTask, thaiDate, todayISO, type Task } from "@/data/requests";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

type TaskState = "done" | "late" | "doing" | "todo"
const STATE_LABEL: Record<TaskState, string> = { done: "เสร็จแล้ว", late: "เกินกำหนด", doing: "กำลังทำ", todo: "ยังไม่เริ่ม" };
const STATE_CLASS: Record<TaskState, string> = {
    done: "bg-[#D1FAE5] text-[#047857]", late: "bg-[#FFE4E6] text-[#BE123C]", doing: "bg-brand-soft text-brand-strong", todo: "bg-[#F1F5F9] text-[#475569]",
};

// งานของฉัน (ผู้รับงาน): งานย่อยที่ได้รับมอบหมาย · กดแถบความคืบหน้าเพื่ออัปเดต
export default function Page() {
    const store = useStore();
    const user = store.user!;
    const today = todayISO();
    const [filter, setFilter] = useState<"open" | "done" | "all">("open");
    const [editing, setEditing] = useState<number | null>(null);

    const mine = store.tasks.filter((t) => t.assigneeId === user.id && isLeafTask(t, store.tasks));
    const req = (t: Task) => store.requests.find((r) => r.id === t.requestId)!;
    const main = (t: Task) => store.tasks.find((x) => x.id === t.parentId);
    const state = (t: Task): TaskState => t.progress === 100 ? "done" : t.dueDate < today ? "late" : t.progress > 0 ? "doing" : "todo";
    const editable = (t: Task) => req(t)?.status === "in_progress" && store.can("progress");

    const late = mine.filter((t) => state(t) === "late");
    const rows = mine.filter((t) => filter === "all" || (filter === "done") === (t.progress === 100));

    const columns: Column<Task>[] = [
        {
            key: "title", label: "งานย่อย", sortValue: (t) => t.title, render: (t) => (
                <div>
                    <p className="font-medium text-ink">{t.title}</p>
                    <Link href={`/requests/${t.requestId}`} onClick={(e) => e.stopPropagation()} className="text-xs font-normal text-ink-3 hover:text-brand hover:underline">
                        {req(t)?.code} · {req(t)?.title}
                    </Link>
                </div>
            ),
        },
        { key: "main", label: "งานหลัก", sortValue: (t) => main(t)?.title ?? "", render: (t) => <span className="text-ink-2">{main(t)?.title ?? "-"}</span> },
        {
            key: "due", label: "กำหนดส่ง", sortValue: (t) => t.dueDate, render: (t) => (
                <span className={cn("text-xs", state(t) === "late" ? "font-semibold text-[#BE123C]" : "text-ink-2")}>
                    {thaiDate(t.dueDate, true)}{state(t) === "late" && ` · เลย ${daysBetween(t.dueDate, today)} วัน`}
                </span>
            ),
        },
        { key: "state", label: "สถานะ", sortValue: (t) => STATE_LABEL[state(t)], render: (t) => <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", STATE_CLASS[state(t)])}>{STATE_LABEL[state(t)]}</span> },
        {
            key: "progress", label: "ความคืบหน้า (กดเพื่ออัปเดต)", sortValue: (t) => t.progress, render: (t) => editing === t.id ? (
                <div className="flex flex-wrap gap-1">
                    {[0, 25, 50, 75, 100].map((v) => (
                        <button key={v} onClick={() => {
                            store.setProgress(t.id, v); setEditing(null);
                            store.showToast(v === 100 ? `“${t.title}” เสร็จแล้ว` : `อัปเดต “${t.title}” เป็น ${v}%`);
                        }}
                            className={cn("rounded-md px-2 py-1 text-xs font-semibold ring-1", v === t.progress ? "bg-brand text-white ring-brand" : "bg-white text-ink-2 ring-line hover:bg-brand-soft")}>{v}%</button>
                    ))}
                    <button onClick={() => setEditing(null)} className="px-1 text-xs text-ink-3 hover:underline">ยกเลิก</button>
                </div>
            ) : (
                <button disabled={!editable(t)} onClick={() => setEditing(t.id)} title={editable(t) ? "กดเพื่ออัปเดตความคืบหน้า" : "คำขอนี้ไม่ได้อยู่ระหว่างดำเนินการ"}
                    className="w-44 rounded-md p-1 enabled:hover:bg-brand-soft disabled:opacity-60" aria-label={`อัปเดตความคืบหน้า ${t.title}`}>
                    <ProgressBar value={t.progress} />
                </button>
            ),
        },
    ];

    return (
        <>
            <PageHeader title="งานของฉัน" />
            {late.length > 0 && (
                <Banner tone="danger" icon={<InfoCircle />} className="mb-4">
                    มี {late.length} งานเกินกำหนด: {late.map((t) => `${t.title} (${req(t)?.code})`).join(", ")}
                </Banner>
            )}
            <div className="mb-4 grid grid-cols-4 gap-4">
                <StatCard label="งานทั้งหมด" value={mine.length} />
                <StatCard label="กำลังทำ" value={mine.filter((t) => t.progress < 100).length} tone="brand" />
                <StatCard label="เกินกำหนด" value={late.length} tone="danger" />
                <StatCard label="เสร็จสัปดาห์นี้" value={mine.filter((t) => t.completedAt && daysBetween(t.completedAt, today) <= 6).length} tone="success" />
            </div>
            <div className="mb-3">
                <FilterChips value={filter} onChange={setFilter} options={[
                    { value: "open", label: "ยังไม่เสร็จ", count: mine.filter((t) => t.progress < 100).length },
                    { value: "done", label: "เสร็จแล้ว", count: mine.filter((t) => t.progress === 100).length },
                    { value: "all", label: "ทั้งหมด", count: mine.length },
                ]} />
            </div>
            <SortTable rows={rows} columns={columns} rowKey={(t) => t.id} initialSort={{ key: "due", dir: "asc" }} empty="ไม่มีงานในหมวดนี้" />
            <p className="mt-3 text-xs text-ink-3">ผู้รับงานหยิบงานไปทำอย่างเดียว · ไม่ต้องรับ/ปฏิเสธงาน · งานย่อยครบ 100% ทุกงาน คำขอจะไปรอผู้ขอตรวจรับเอง</p>
        </>
    )
}
