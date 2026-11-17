'use client'

// ชิ้นส่วนที่หลายหน้าใช้ร่วมกันเมื่อแสดงคำขอ 1 รายการ
// RequestSummary (การ์ดสรุปคำขอ) · RequestStepper (ขั้นตอนคำขอ) · RequestInfo (ข้อมูลคำขอ) · RequestHistory (ประวัติ) · MainTasks / TaskTree (งาน)
import type { ReactNode } from "react";
import { Eye, FileText, Paperclip2 } from "@tailgrids/icons";
import CategoryBadge from "@/components/category-badge";
import ProgressBar from "@/components/progress-bar";
import StatusBadge, { STATUS_LABEL } from "@/components/status-badge";
import {
    displayStatus, findHead, nick, requestProgress, subtasksOf, taskProgress, thaiDate, thaiDateTime, todayISO,
    type Request, type Status,
} from "@/data/requests";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

export const fmtSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

export function Card({ title, hint, children, className, action }: { title?: string, hint?: string, children: ReactNode, className?: string, action?: ReactNode }) {
    return (
        <section className={cn("rounded-xl bg-white p-5 ring-1 ring-line", className)}>
            {(title || action) && (
                <div className="mb-4 flex items-start gap-3">
                    <div className="flex-1">
                        {title && <h2 className="font-semibold text-ink">{title}</h2>}
                        {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </section>
    )
}

// การ์ดสรุปคำขอ: รหัส สถานะ หมวด หัวข้อ ผู้ขอ ส่งถึง วันที่ รายละเอียด ไฟล์แนบ
export function RequestSummary({ r, compact }: { r: Request, compact?: boolean }) {
    const store = useStore();
    const requester = store.userById(r.requesterId);
    const meta = [
        ["ผู้ขอ", `${nick(requester?.name)} · ${requester?.dept ?? "-"}`],
        ["ส่งถึง", r.targetDept],
        ["วันที่ต้องการ", thaiDate(r.dueDate, true)],
        ["ส่งเมื่อ", thaiDateTime(r.createdAt)],
    ];
    return (
        <Card>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-ink-3">{r.code}</span>
                <StatusBadge status={displayStatus(r)} />
                <CategoryBadge category={store.categories.find((c) => c.id === r.categoryId)} />
            </div>
            <h2 className="mt-2 text-xl font-bold text-ink">{r.title}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-4">
                {meta.map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-ink-3">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
                ))}
            </dl>
            {!compact && (
                <>
                    <h3 className="mt-5 text-sm font-semibold text-ink">รายละเอียด</h3>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-2">{r.detail}</p>
                </>
            )}
            <h3 className="mt-5 text-sm font-semibold text-ink">ไฟล์แนบ ({r.attachments.length})</h3>
            {r.attachments.length === 0 && <p className="mt-1 text-sm text-ink-3">ไม่มีไฟล์แนบ</p>}
            <ul className="mt-2 flex flex-col gap-2">
                {r.attachments.map((f) => (
                    <li key={f.name} className="flex items-center gap-3 rounded-lg bg-page px-3 py-2 text-sm">
                        <Paperclip2 className="size-4 text-ink-3" />
                        <span className="flex-1 truncate text-ink">{f.name}</span>
                        <span className="text-xs text-ink-3">{fmtSize(f.size)}</span>
                        <button onClick={() => store.showToast(`เปิดดู ${f.name} (prototype ไม่ได้เก็บไฟล์จริง)`)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><Eye className="size-4" />เปิดดู</button>
                    </li>
                ))}
            </ul>
        </Card>
    )
}

// ขั้นตอนคำขอ 5 ขั้น + ความคืบหน้ารวม
const STEP_OF: Record<Status, number> = {
    pending_approval: 1, returned: 1, pending_target: 2, rejected: 2, in_progress: 3, pending_acceptance: 4, done: 5,
};

export function RequestStepper({ r }: { r: Request }) {
    const store = useStore();
    const approver = store.userById(r.approverId);
    const head = findHead(store.users, r.targetDept);
    const current = STEP_OF[r.status];
    const failed = r.status === "returned" || r.status === "rejected";
    const steps = [
        { label: "ส่งคำขอ", who: nick(store.userById(r.requesterId)?.name) },
        { label: "หัวหน้าต้นสังกัดอนุมัติ", who: approver ? nick(approver.name) : "รอพิจารณา" },
        { label: `${r.targetDept} รับงาน`, who: head ? nick(head.name) : "-" },
        { label: "ดำเนินการ", who: `${requestProgress(r, store.tasks)}%` },
        { label: "ตรวจรับงาน", who: "ผู้ขอ" },
    ];
    const progress = requestProgress(r, store.tasks);

    return (
        <Card title="ขั้นตอนคำขอ" action={<div className="w-48"><ProgressBar value={progress} /></div>}>
            <ol className="grid grid-cols-5 gap-2">
                {steps.map((s, i) => {
                    const n = i + 1;
                    const done = n < current || r.status === "done";
                    const now = n === current && r.status !== "done";
                    return (
                        <li key={s.label} className="flex flex-col items-center gap-1.5 text-center">
                            <div className="flex w-full items-center">
                                <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done || now ? "bg-brand" : "bg-line")} />
                                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                    done ? "bg-brand text-white" : now && failed ? "bg-[#FFE4E6] text-[#BE123C] ring-2 ring-[#FDA4AF]"
                                        : now ? "bg-brand-soft text-brand-strong ring-2 ring-brand" : "bg-page text-ink-3")}>
                                    {done ? "✓" : n}
                                </span>
                                <span className={cn("h-0.5 flex-1", i === 4 ? "bg-transparent" : done ? "bg-brand" : "bg-line")} />
                            </div>
                            <p className={cn("text-xs font-semibold", now || done ? "text-ink" : "text-ink-3")}>{s.label}</p>
                            <p className="text-[11px] text-ink-3">{now && failed ? STATUS_LABEL[r.status] : s.who}</p>
                        </li>
                    );
                })}
            </ol>
        </Card>
    )
}

// ข้อมูลคำขอ (คอลัมน์ขวา)
export function RequestInfo({ r }: { r: Request }) {
    const store = useStore();
    const head = findHead(store.users, r.targetDept);
    const team = store.teamOf(r);
    const rows: [string, ReactNode][] = [
        ["รหัส", r.code],
        ["ผู้ขอ", store.userById(r.requesterId)?.name],
        ["แผนกปลายทาง", r.targetDept],
        ["ผู้รับผิดชอบหลัก", head?.name ?? "-"],
        ...(team ? [["ทีมที่รับผิดชอบ", team.name] as [string, ReactNode]] : []),
        ["วันที่ต้องการ", thaiDate(r.dueDate, true)],
    ];
    return (
        <Card title="ข้อมูลคำขอ">
            <dl className="flex flex-col gap-2.5 text-sm">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3"><dt className="text-ink-3">{k}</dt><dd className="text-right font-medium text-ink">{v}</dd></div>
                ))}
            </dl>
        </Card>
    )
}

// ประวัติ (ใหม่สุดอยู่บน)
export function RequestHistory({ r }: { r: Request }) {
    const store = useStore();
    const logs = store.logs.filter((l) => l.requestId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return (
        <Card title="ประวัติ">
            <ol className="flex flex-col gap-3">
                {logs.map((l) => (
                    <li key={l.id} className="flex gap-3 text-sm">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                        <div>
                            <p className="text-ink"><span className="font-semibold">{nick(store.userById(l.actorId)?.name)}</span> {l.action}</p>
                            {l.reason && <p className="mt-0.5 rounded-md bg-page px-2 py-1 text-xs text-ink-2">เหตุผล: {l.reason}</p>}
                            <p className="text-xs text-ink-3">{thaiDateTime(l.createdAt)}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </Card>
    )
}

// งานหลัก + % (มุมมองผู้ขอ: ไม่เห็นงานย่อย)
export function MainTasks({ r }: { r: Request }) {
    const store = useStore();
    const mains = store.tasks.filter((t) => t.requestId === r.id && t.parentId === null);
    if (mains.length === 0) return null;
    return (
        <Card title="งานหลัก" hint={`${r.targetDept} แบ่งงานย่อยภายในทีม ผู้ขอไม่เห็น`}>
            <ul className="flex flex-col gap-3">
                {mains.map((t) => (
                    <li key={t.id} className="grid grid-cols-[1fr_6rem_12rem] items-center gap-3 text-sm">
                        <span className="font-medium text-ink">{t.title}</span>
                        <span className="text-xs text-ink-3">ถึง {thaiDate(t.dueDate)}</span>
                        <ProgressBar value={taskProgress(t, store.tasks)} />
                    </li>
                ))}
            </ul>
        </Card>
    )
}

// งานหลัก + งานย่อยทั้งหมด (มุมมองแผนกปลายทาง)
export function TaskTree({ r }: { r: Request }) {
    const store = useStore();
    const mains = store.tasks.filter((t) => t.requestId === r.id && t.parentId === null);
    if (mains.length === 0) return null;
    const today = todayISO();
    return (
        <Card title="งานหลักและงานย่อย" hint="มุมมองของแผนกปลายทาง · ผู้ขอเห็นเฉพาะงานหลัก">
            <div className="flex flex-col gap-4">
                {mains.map((m) => (
                    <div key={m.id} className="rounded-lg ring-1 ring-line">
                        <div className="grid grid-cols-[1fr_12rem] items-center gap-3 bg-page px-3 py-2 text-sm">
                            <span className="flex items-center gap-2 font-semibold text-ink"><FileText className="size-4 text-ink-3" />งานหลัก: {m.title}</span>
                            <ProgressBar value={taskProgress(m, store.tasks)} />
                        </div>
                        <ul>
                            {subtasksOf(m, store.tasks).map((s) => (
                                <li key={s.id} className="grid grid-cols-[1fr_7rem_6rem_12rem] items-center gap-3 border-t border-line px-3 py-2 text-sm">
                                    <span className="text-ink">{s.title}</span>
                                    <span className="text-xs text-ink-2">{nick(store.userById(s.assigneeId)?.name)}</span>
                                    <span className={cn("text-xs", s.progress < 100 && s.dueDate < today ? "font-semibold text-[#BE123C]" : "text-ink-3")}>ถึง {thaiDate(s.dueDate)}</span>
                                    <ProgressBar value={s.progress} />
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </Card>
    )
}
