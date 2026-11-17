'use client'

import Link from "next/link";
import { useState } from "react";
import { buttonStyles } from "@/components/tailgrids/core/button";
import CategoryBadge from "@/components/category-badge";
import InboxCard from "@/components/inbox-card";
import PageHeader from "@/components/page-header";
import ProgressBar from "@/components/progress-bar";
import SortSelect, { sortBy, type SortOption } from "@/components/sort-select";
import SortTable, { type Column } from "@/components/sort-table";
import StatCard from "@/components/stat-card";
import StatusBadge, { STATUS_LABEL } from "@/components/status-badge";
import { displayStatus, isOverdue, nick, requestProgress, thaiDate, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

// คำขอเข้าแผนก (หัวหน้าแผนกปลายทาง)
export default function Page() {
    const store = useStore();
    const user = store.user!;
    const [sort, setSort] = useState("due");

    const mineDept = store.requests.filter((r) => r.targetDept === user.dept);
    const pending = mineDept.filter((r) => r.status === "pending_target");
    const working = mineDept.filter((r) => r.status === "in_progress" || r.status === "pending_acceptance");
    const category = (r: Request) => store.categories.find((c) => c.id === r.categoryId);
    const approvedLog = (r: Request) => store.logs.filter((l) => l.requestId === r.id && l.action === "อนุมัติ").at(-1);

    const options: SortOption<Request>[] = [
        { key: "due", label: "วันที่ต้องการใกล้สุด", value: (r) => r.dueDate },
        { key: "oldest", label: "ส่งก่อน (รอนานสุด)", value: (r) => r.createdAt },
        { key: "newest", label: "ส่งล่าสุด", value: (r) => r.createdAt, dir: "desc" },
        { key: "code", label: "รหัสคำขอ", value: (r) => r.code },
        { key: "title", label: "ชื่อคำขอ", value: (r) => r.title },
        { key: "dept", label: "ฝ่ายที่ส่ง", value: (r) => store.userById(r.requesterId)?.dept ?? "" },
    ];

    const columns: Column<Request>[] = [
        { key: "title", label: "คำขอ", sortValue: (r) => r.title, render: (r) => <div><p className="font-medium text-ink">{r.title}</p><p className="text-xs font-normal text-ink-3">{r.code}</p></div> },
        { key: "cat", label: "หมวด", sortValue: (r) => category(r)?.name ?? "", render: (r) => <CategoryBadge category={category(r)} /> },
        { key: "from", label: "จาก", sortValue: (r) => store.userById(r.requesterId)?.dept ?? "", render: (r) => <span className="text-ink-2">{store.userById(r.requesterId)?.dept}</span> },
        { key: "team", label: "ทีม", sortValue: (r) => store.teamOf(r)?.name ?? "", render: (r) => <span className="text-ink-2">{store.teamOf(r)?.name ?? "-"}</span> },
        { key: "due", label: "ต้องการภายใน", sortValue: (r) => r.dueDate, render: (r) => <span className="text-xs text-ink-2">{thaiDate(r.dueDate, true)}</span> },
        { key: "status", label: "สถานะ", sortValue: (r) => STATUS_LABEL[displayStatus(r)], render: (r) => <StatusBadge status={displayStatus(r)} /> },
        { key: "progress", label: "ความคืบหน้า", sortValue: (r) => requestProgress(r, store.tasks), render: (r) => <ProgressBar className="w-36" value={requestProgress(r, store.tasks)} /> },
    ];

    return (
        <>
            <PageHeader title="คำขอเข้าแผนก" />
            <div className="mb-6 grid grid-cols-3 gap-4">
                <StatCard label="รอพิจารณา" value={pending.length} tone="brand" />
                <StatCard label="กำลังดำเนินการ" value={mineDept.filter((r) => r.status === "in_progress").length} />
                <StatCard label="เกินกำหนด" value={mineDept.filter((r) => isOverdue(r)).length} tone="danger" />
            </div>

            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">รอพิจารณา ({pending.length})</p>
                <SortSelect options={options} value={sort} onChange={setSort} />
            </div>
            <div className="mb-8 flex flex-col gap-3">
                {pending.length === 0 && <p className="rounded-xl bg-white p-10 text-center text-sm text-ink-3 ring-1 ring-line">ไม่มีคำขอรอพิจารณา</p>}
                {sortBy(pending, options, sort).map((r) => {
                    const ap = approvedLog(r);
                    const approver = store.userById(ap?.actorId ?? r.approverId);
                    return (
                        <InboxCard key={r.id} r={r} category={category(r)}
                            meta={`${store.userById(r.requesterId)?.dept} → ${r.targetDept} · ต้องการภายใน ${thaiDate(r.dueDate, true)}`}
                            sub={approver ? `อนุมัติโดย ${nick(approver.name)} (${approver.position})${ap ? ` · ${thaiDate(ap.createdAt)}` : ""}` : "ไม่ต้องผ่านหัวหน้าต้นสังกัด"}
                            actions={<>
                                <Link href={`/requests/${r.id}`} className={buttonStyles({ size: "sm", variant: "ghost" })}>ดูรายละเอียด</Link>
                                <Link href={`/incoming/${r.id}/decline?mode=forward`} className={buttonStyles({ size: "sm", appearance: "outline" })}>ส่งต่อแผนกอื่น</Link>
                                <Link href={`/incoming/${r.id}/decline?mode=reject`} className={buttonStyles({ size: "sm", variant: "danger", appearance: "outline" })}>ปฏิเสธ</Link>
                                <Link href={`/incoming/${r.id}/plan`} className={buttonStyles({ size: "sm" })}>รับงานและแบ่งงาน</Link>
                            </>} />
                    );
                })}
            </div>

            <p className="mb-3 text-sm font-semibold text-ink">งานที่แผนกกำลังทำ ({working.length})</p>
            <SortTable rows={working} columns={columns} rowKey={(r) => r.id} rowHref={(r) => `/requests/${r.id}`} initialSort={{ key: "due", dir: "asc" }} empty="ยังไม่มีงานที่กำลังทำ" />
        </>
    )
}
