'use client'

import Link from "next/link";
import { useState } from "react";
import { InfoCircle } from "@tailgrids/icons";
import { buttonStyles } from "@/components/tailgrids/core/button";
import Banner from "@/components/banner";
import InboxCard from "@/components/inbox-card";
import PageHeader from "@/components/page-header";
import SortSelect, { sortBy, type SortOption } from "@/components/sort-select";
import StatCard from "@/components/stat-card";
import { canApprove, nick, thaiDate, todayISO, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

// รออนุมัติ (หัวหน้าต้นสังกัด)
export default function Page() {
    const store = useStore();
    const user = store.user!;
    const [sort, setSort] = useState("oldest");

    const pending = store.requests.filter((r) => canApprove(store.users, user, r));
    const month = todayISO().slice(0, 7);
    const decided = (action: string) => store.logs.filter((l) => l.actorId === user.id && l.action === action && l.createdAt.slice(0, 7) === month).length;

    const options: SortOption<Request>[] = [
        { key: "oldest", label: "ส่งก่อน (รอนานสุด)", value: (r) => r.createdAt },
        { key: "newest", label: "ส่งล่าสุด", value: (r) => r.createdAt, dir: "desc" },
        { key: "due", label: "วันที่ต้องการใกล้สุด", value: (r) => r.dueDate },
        { key: "code", label: "รหัสคำขอ", value: (r) => r.code },
        { key: "title", label: "ชื่อคำขอ", value: (r) => r.title },
        { key: "requester", label: "ผู้ขอ", value: (r) => nick(store.userById(r.requesterId)?.name) },
    ];

    return (
        <>
            <PageHeader title="รออนุมัติ" />
            <div className="mb-4 grid grid-cols-3 gap-4">
                <StatCard label="รออนุมัติ" value={pending.length} tone="brand" />
                <StatCard label="อนุมัติเดือนนี้" value={decided("อนุมัติ")} tone="success" />
                <StatCard label="ส่งกลับเดือนนี้" value={decided("ส่งกลับ")} tone="warning" />
            </div>
            <Banner tone="info" icon={<InfoCircle />} className="mb-4">อนุมัติเฉพาะคำขอของคนใน{user.dept} · อนุมัติแล้วคำขอจะไปที่หัวหน้าแผนกปลายทาง</Banner>

            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">คำขอที่รอคุณ ({pending.length})</p>
                <SortSelect options={options} value={sort} onChange={setSort} />
            </div>
            <div className="flex flex-col gap-3">
                {pending.length === 0 && <p className="rounded-xl bg-white p-10 text-center text-sm text-ink-3 ring-1 ring-line">ไม่มีคำขอรออนุมัติ</p>}
                {sortBy(pending, options, sort).map((r) => {
                    const by = store.userById(r.requesterId);
                    return (
                        <InboxCard key={r.id} r={r} category={store.categories.find((c) => c.id === r.categoryId)}
                            meta={`ส่งโดย ${nick(by?.name)}${by?.id === user.id ? " (คุณ)" : ""} · ${thaiDate(r.createdAt)} · ${by?.dept} → ${r.targetDept}`}
                            sub={`ต้องการภายใน ${thaiDate(r.dueDate, true)}`}
                            actions={<Link href={`/approvals/${r.id}`} className={buttonStyles({ size: "sm" })}>พิจารณา</Link>} />
                    );
                })}
            </div>
        </>
    )
}
