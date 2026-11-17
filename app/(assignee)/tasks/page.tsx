'use client'

import { useState } from "react";
import FilterChips from "@/components/filter-chips";
import PageHeader from "@/components/page-header";
import ProgressBar from "@/components/progress-bar";
import StatusBadge from "@/components/status-badge";
import { isLeafTask, thaiDate, type Task } from "@/data/requests";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

type Tab = "doing" | "finished"
const steps = [0, 25, 50, 75, 100];

export default function Page() {
    const store = useStore();
    const [tab, setTab] = useState<Tab>("doing");
    const today = new Date().toISOString().slice(0, 10);

    // งานของฉันที่ต้องรายงานเอง (งานย่อย หรืองานหลักที่ไม่มีงานย่อย)
    const mine = store.tasks.filter((t) => t.assigneeId === store.user?.id && isLeafTask(t, store.tasks));
    const requestOf = (t: Task) => store.requests.find((r) => r.id === t.requestId);
    // ทำได้เฉพาะตอนคำขอ "กำลังดำเนินการ"
    const editable = (t: Task) => requestOf(t)?.status === "in_progress";
    const doing = mine.filter((t) => editable(t) && t.progress < 100);
    const finished = mine.filter((t) => !doing.includes(t));
    const shown = (tab === "doing" ? doing : finished).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return (
        <>
            <PageHeader title="งานของฉัน" />
            <div className="mb-4">
                <FilterChips value={tab} onChange={setTab} options={[
                    { value: "doing", label: "กำลังทำ", count: doing.length },
                    { value: "finished", label: "เสร็จแล้ว / ปิดแล้ว", count: finished.length },
                ]} />
            </div>

            <div className="flex flex-col gap-3">
                {shown.length === 0 && <p className="rounded-xl bg-white py-10 text-center text-sm text-ink-3 ring-1 ring-line">ไม่มีงานในกลุ่มนี้</p>}
                {shown.map((t) => {
                    const r = requestOf(t);
                    const parent = store.tasks.find((p) => p.id === t.parentId);
                    const late = t.progress < 100 && t.dueDate < today;
                    return (
                        <section key={t.id} className="rounded-xl bg-white p-5 ring-1 ring-line">
                            <div className="mb-3 flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-xs text-ink-3">{r?.code} · {r?.title}{parent && ` › ${parent.title}`}</p>
                                    <p className="font-semibold text-ink">{t.title}</p>
                                </div>
                                {r && <StatusBadge status={r.status} />}
                                <span className={cn("text-xs", late ? "font-semibold text-[#BE123C]" : "text-ink-3")}>
                                    ส่ง {thaiDate(t.dueDate)}{late && " · เกินกำหนด"}
                                </span>
                            </div>
                            <ProgressBar value={t.progress} />
                            {editable(t) && (
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-xs text-ink-2">อัปเดตความคืบหน้า:</span>
                                    {steps.map((p) => (
                                        <button key={p} onClick={() => store.setProgress(t.id, p)}
                                            className={cn("rounded-full border px-3 py-1 text-xs",
                                                t.progress === p ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-2 hover:bg-page")}>
                                            {p}%
                                        </button>
                                    ))}
                                    <input type="range" min={0} max={100} step={5} value={t.progress} aria-label={`ความคืบหน้า ${t.title}`}
                                        onChange={(e) => store.setProgress(t.id, Number(e.target.value))} className="ml-2 flex-1 accent-brand" />
                                </div>
                            )}
                        </section>
                    )
                })}
            </div>
        </>
    )
}
