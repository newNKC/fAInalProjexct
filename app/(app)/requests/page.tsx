'use client'

import Link from "next/link";
import { useState } from "react";
import { CheckCircle1, InfoCircle, Plus, Reply } from "@tailgrids/icons";
import { buttonStyles } from "@/components/tailgrids/core/button";
import Banner from "@/components/banner";
import CategoryBadge from "@/components/category-badge";
import FilterChips from "@/components/filter-chips";
import PageHeader from "@/components/page-header";
import ProgressBar from "@/components/progress-bar";
import SortTable, { type Column } from "@/components/sort-table";
import StatusBadge, { STATUS_LABEL } from "@/components/status-badge";
import { deptKind, displayStatus, lastUpdate, nick, requestProgress, thaiDate, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

// คำขอของฉัน / คำขอในฝ่าย / คำขอในแผนก (ตาม Figma) · แสดงคำขอของทุกคนในฝ่ายเดียวกับผู้ใช้
export default function Page() {
    const store = useStore();
    const user = store.user!;
    const [cat, setCat] = useState("all");
    const [state, setState] = useState<"all" | "open" | "closed">("all");
    const [who, setWho] = useState<"all" | "mine">("all");

    const onlyRequester = user.roles.length === 1 && user.roles[0] === "requester";
    const title = onlyRequester ? "คำขอของฉัน" : `คำขอใน${deptKind(user.dept)}`;

    const deptRows = store.requests.filter((r) => store.userById(r.requesterId)?.dept === user.dept && store.canSee(r));
    const closed = (r: Request) => ["done", "rejected"].includes(r.status);
    const rows = deptRows.filter((r) =>
        (cat === "all" || r.categoryId === Number(cat)) &&
        (state === "all" || (state === "closed") === closed(r)) &&
        (who === "all" || r.requesterId === user.id));

    const returned = store.requests.filter((r) => r.requesterId === user.id && r.status === "returned");
    const toAccept = store.requests.filter((r) => r.requesterId === user.id && r.status === "pending_acceptance");
    const category = (r: Request) => store.categories.find((c) => c.id === r.categoryId);

    const columns: Column<Request>[] = [
        {
            key: "title", label: "คำขอ", sortValue: (r) => r.title, render: (r) => (
                <div><p className="font-medium text-ink">{r.title}</p><p className="text-xs font-normal text-ink-3">{r.code}</p></div>
            ),
        },
        { key: "code", label: "รหัส", sortValue: (r) => r.code, render: (r) => <span className="text-xs text-ink-2">{r.code}</span>, className: "hidden" },
        { key: "cat", label: "หมวด", sortValue: (r) => category(r)?.name ?? "", render: (r) => <CategoryBadge category={category(r)} /> },
        { key: "requester", label: "ผู้ขอ", sortValue: (r) => nick(store.userById(r.requesterId)?.name), render: (r) => <span className="text-ink-2">{nick(store.userById(r.requesterId)?.name)}</span> },
        { key: "target", label: "ส่งถึง", sortValue: (r) => r.targetDept, render: (r) => <span className="text-ink-2">{r.targetDept}</span> },
        { key: "status", label: "สถานะ", sortValue: (r) => STATUS_LABEL[displayStatus(r)], render: (r) => <StatusBadge status={displayStatus(r)} /> },
        { key: "progress", label: "ความคืบหน้า", sortValue: (r) => requestProgress(r, store.tasks), render: (r) => <ProgressBar className="w-36" value={requestProgress(r, store.tasks)} /> },
        { key: "updated", label: "อัปเดต", sortValue: (r) => lastUpdate(r, store.logs), render: (r) => <span className="text-xs text-ink-2">{thaiDate(lastUpdate(r, store.logs))}</span> },
    ];

    return (
        <>
            <PageHeader title={title} actions={store.can("submit") &&
                <Link href="/requests/new" className={buttonStyles({ size: "sm" })}><Plus />ส่งคำขอใหม่</Link>} />

            <div className="mb-4 flex flex-col gap-2">
                {returned.map((r) => (
                    <Banner key={r.id} tone="warning" icon={<Reply />}
                        action={<Link href={`/requests/${r.id}/edit`} className="text-sm font-semibold underline">แก้ไขและส่งใหม่</Link>}>
                        คำขอ {r.code} “{r.title}” ถูกส่งกลับให้แก้ไข
                    </Banner>
                ))}
                {toAccept.map((r) => (
                    <Banner key={r.id} tone="success" icon={<CheckCircle1 />}
                        action={<Link href={`/requests/${r.id}`} className="text-sm font-semibold underline">ไปตรวจรับงาน</Link>}>
                        คำขอ {r.code} “{r.title}” เสร็จครบ 100% แล้ว · รอคุณตรวจรับ
                    </Banner>
                ))}
                <Banner tone="info" icon={<InfoCircle />}>แสดงคำขอของทุกคนใน{user.dept} · คนนอก{deptKind(user.dept)}มองไม่เห็น</Banner>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-white p-4 ring-1 ring-line">
                <div className="flex items-center gap-2"><span className="text-xs font-semibold text-ink-2">หมวด</span>
                    <FilterChips value={cat} onChange={setCat} options={[{ value: "all", label: "ทั้งหมด" }, ...store.categories.map((c) => ({ value: String(c.id), label: c.name }))]} />
                </div>
                <div className="flex items-center gap-2"><span className="text-xs font-semibold text-ink-2">สถานะ</span>
                    <FilterChips value={state} onChange={setState} options={[{ value: "all", label: "ทั้งหมด" }, { value: "open", label: "ยังไม่เสร็จ" }, { value: "closed", label: "เสร็จแล้ว" }]} />
                </div>
                <div className="flex items-center gap-2"><span className="text-xs font-semibold text-ink-2">ผู้ขอ</span>
                    <FilterChips value={who} onChange={setWho} options={[{ value: "all", label: "ทุกคน" }, { value: "mine", label: "ของฉัน" }]} />
                </div>
            </div>

            <SortTable rows={rows} columns={columns.filter((c) => c.key !== "code")} rowKey={(r) => r.id} rowHref={(r) => `/requests/${r.id}`}
                initialSort={{ key: "updated", dir: "desc" }} empty="ไม่มีคำขอที่ตรงกับตัวกรอง" />
            <p className="mt-3 text-xs text-ink-3">กดแถวคำขอเพื่อดูรายละเอียด · {rows.length} รายการ</p>
        </>
    )
}
