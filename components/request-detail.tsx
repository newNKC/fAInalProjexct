'use client'

// รายละเอียดคำขอ 1 รายการ (ทุกโรลใช้ร่วมกัน) · ปุ่มของแต่ละโรลส่งเข้ามาทาง actions
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Paperclip2 } from "@tailgrids/icons";
import ProgressBar from "@/components/progress-bar";
import StatusBadge, { STATUS_LABEL } from "@/components/status-badge";
import { isOverdue, requestProgress, taskProgress, thaiDate, thaiDateTime, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

type Props = {
    request: Request
    backHref: string
    backLabel: string
    actions?: ReactNode     // ปุ่มด้านขวาบน
    children?: ReactNode    // ส่วนเพิ่มของโรลนั้น เช่น วางแผนงาน
}

export default function RequestDetail({ request: r, backHref, backLabel, actions, children }: Props) {
    const store = useStore();
    const requester = store.userById(r.requesterId);
    const approver = store.userById(r.approverId);
    const category = store.categories.find((c) => c.id === r.categoryId);
    const mains = store.tasks.filter((t) => t.requestId === r.id && t.parentId === null);
    const logs = store.logs.filter((l) => l.requestId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastReason = logs.find((l) => l.reason);

    return (
        <>
            <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-brand [&>svg]:size-4">
                <ArrowLeft />{backLabel}
            </Link>

            {/* header */}
            <div className="mb-6 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink-3">{r.code}</p>
                    <h1 className="text-2xl font-bold text-ink">{r.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={r.status} />
                        {category && (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-xs text-ink-2 ring-1 ring-line">
                                <span className="size-2 rounded-full" style={{ background: category.color }} />{category.name}
                            </span>
                        )}
                        {isOverdue(r) && <span className="rounded-md bg-[#FFE4E6] px-2 py-0.5 text-xs font-semibold text-[#BE123C]">เกินกำหนด</span>}
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>
            </div>

            {/* เหตุผลล่าสุด (ส่งกลับ / ปฏิเสธ / ขอแก้) */}
            {lastReason && ["returned", "rejected", "in_progress", "pending_target"].includes(r.status) && (
                <div className="mb-4 rounded-xl bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
                    <p className="font-semibold">{lastReason.action} โดย {store.userById(lastReason.actorId)?.name}</p>
                    <p>{lastReason.reason}</p>
                </div>
            )}

            <div className="grid grid-cols-3 gap-4">
                {/* left: detail */}
                <div className="col-span-2 flex flex-col gap-4">
                    <section className="rounded-xl bg-white p-5 ring-1 ring-line">
                        <h2 className="mb-2 font-semibold text-ink">รายละเอียด</h2>
                        <p className="text-sm whitespace-pre-line text-ink-2">{r.detail}</p>
                        {r.attachments.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {r.attachments.map((a) => (
                                    <span key={a.name} className="inline-flex items-center gap-1.5 rounded-lg bg-page px-3 py-1.5 text-xs text-ink-2 [&>svg]:size-4">
                                        <Paperclip2 />{a.name} · {Math.max(1, Math.round(a.size / 1024))} KB
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* tasks */}
                    <section className="rounded-xl bg-white p-5 ring-1 ring-line">
                        <div className="mb-3 flex items-center gap-3">
                            <h2 className="font-semibold text-ink">งาน</h2>
                            <ProgressBar value={requestProgress(r.id, store.tasks)} className="max-w-60 flex-1" />
                        </div>
                        {mains.length === 0 && <p className="text-sm text-ink-3">ยังไม่มีการแบ่งงาน</p>}
                        <div className="flex flex-col gap-3">
                            {mains.map((m) => (
                                <div key={m.id} className="rounded-lg border border-line p-3">
                                    <div className="flex items-center gap-3">
                                        <p className="flex-1 text-sm font-semibold text-ink">{m.title}</p>
                                        <span className="text-xs text-ink-3">{store.userById(m.assigneeId)?.name} · ส่ง {thaiDate(m.dueDate)}</span>
                                        <ProgressBar value={taskProgress(m, store.tasks)} className="w-40" />
                                    </div>
                                    {store.tasks.filter((t) => t.parentId === m.id).map((s) => (
                                        <div key={s.id} className="mt-2 flex items-center gap-3 border-l-2 border-line pl-3">
                                            <p className="flex-1 text-sm text-ink-2">{s.title}</p>
                                            <span className="text-xs text-ink-3">{store.userById(s.assigneeId)?.name} · ส่ง {thaiDate(s.dueDate)}</span>
                                            <ProgressBar value={s.progress} className="w-40" />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </section>

                    {children}
                </div>

                {/* right: info + history */}
                <div className="flex flex-col gap-4">
                    <section className="rounded-xl bg-white p-5 text-sm ring-1 ring-line">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                            <dt className="text-ink-3">ผู้ขอ</dt><dd className="font-medium text-ink">{requester?.name}</dd>
                            <dt className="text-ink-3">แผนกผู้ขอ</dt><dd className="text-ink">{requester?.dept}</dd>
                            <dt className="text-ink-3">ผู้อนุมัติ</dt><dd className="text-ink">{approver?.name ?? "-"}</dd>
                            <dt className="text-ink-3">แผนกปลายทาง</dt><dd className="text-ink">{r.targetDept}</dd>
                            <dt className="text-ink-3">วันที่ต้องการ</dt><dd className="text-ink">{thaiDate(r.dueDate)}</dd>
                            <dt className="text-ink-3">วันที่ส่ง</dt><dd className="text-ink">{thaiDate(r.createdAt)}</dd>
                        </dl>
                    </section>

                    <section className="rounded-xl bg-white p-5 ring-1 ring-line">
                        <h2 className="mb-3 font-semibold text-ink">ประวัติคำขอ</h2>
                        <ol className="flex flex-col gap-3">
                            {logs.map((l) => (
                                <li key={l.id} className="border-l-2 border-brand-soft pl-3 text-sm">
                                    <p className="font-medium text-ink">{l.action}</p>
                                    <p className="text-xs text-ink-3">{store.userById(l.actorId)?.name} · {thaiDateTime(l.createdAt)}</p>
                                    <p className="text-xs text-ink-2">{l.fromStatus ? `${STATUS_LABEL[l.fromStatus]} → ` : ""}{STATUS_LABEL[l.toStatus]}</p>
                                    {l.reason && <p className="mt-1 rounded bg-page px-2 py-1 text-xs text-ink-2">“{l.reason}”</p>}
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>
            </div>
        </>
    )
}

// ข้อความเมื่อหาคำขอไม่เจอ
export function NotFound({ backHref }: { backHref: string }) {
    return (
        <div className="py-20 text-center">
            <p className="mb-2 font-semibold text-ink">ไม่พบคำขอนี้ หรือคุณไม่มีสิทธิ์ดู</p>
            <Link href={backHref} className="text-sm text-brand hover:underline">กลับไปหน้ารายการ</Link>
        </div>
    )
}
