'use client'

import Link from "next/link";
import { useState } from "react";
import { Plus, Search1 } from "@tailgrids/icons";
import { buttonStyles } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import FilterChips from "@/components/filter-chips";
import PageHeader from "@/components/page-header";
import RequestTable from "@/components/request-table";
import type { Request } from "@/data/requests";
import { useStore } from "@/data/store";

type Filter = "all" | "action" | "active" | "closed"

// กลุ่มของตัวกรอง
const groups: Record<Filter, (r: Request) => boolean> = {
    all: () => true,
    action: (r) => ["returned", "pending_acceptance"].includes(r.status),          // รอฉันทำ
    active: (r) => ["pending_approval", "pending_target", "in_progress"].includes(r.status),
    closed: (r) => ["done", "rejected"].includes(r.status),
}

export default function Page() {
    const store = useStore();
    const [filter, setFilter] = useState<Filter>("all");
    const [search, setSearch] = useState("");

    const mine = store.requests.filter((r) => r.requesterId === store.user?.id);
    const shown = mine.filter((r) => groups[filter](r) && (r.title.includes(search) || r.code.includes(search.toUpperCase())));

    return (
        <>
            <PageHeader title="คำขอของฉัน" actions={
                <Link href="/requests/new" className={buttonStyles({ size: "sm" })}><Plus />สร้างคำขอ</Link>
            } />

            <div className="mb-4 flex items-center gap-3">
                <div className="relative w-80">
                    <Search1 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
                    <Input className="w-full py-2 pl-9 text-sm" placeholder="ค้นหาหัวข้อหรือเลขที่คำขอ" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <FilterChips value={filter} onChange={setFilter} options={[
                    { value: "all", label: "ทั้งหมด", count: mine.length },
                    { value: "action", label: "รอฉันดำเนินการ", count: mine.filter(groups.action).length },
                    { value: "active", label: "กำลังดำเนินการ", count: mine.filter(groups.active).length },
                    { value: "closed", label: "ปิดแล้ว", count: mine.filter(groups.closed).length },
                ]} />
            </div>

            <RequestTable requests={shown} href={(r) => `/requests/${r.id}`} empty="ยังไม่มีคำขอในกลุ่มนี้" />
        </>
    )
}
