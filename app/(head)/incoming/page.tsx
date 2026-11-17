'use client'

import { useState } from "react";
import FilterChips from "@/components/filter-chips";
import PageHeader from "@/components/page-header";
import RequestTable from "@/components/request-table";
import type { Request } from "@/data/requests";
import { useStore } from "@/data/store";

type Source = "external" | "internal"
type Stage = "waiting" | "active" | "closed" | "all"

const stages: Record<Stage, (r: Request) => boolean> = {
    waiting: (r) => r.status === "pending_target",
    active: (r) => ["in_progress", "pending_acceptance"].includes(r.status),
    closed: (r) => ["done", "rejected"].includes(r.status),
    all: () => true,
}

export default function Page() {
    const store = useStore();
    const [source, setSource] = useState<Source>("external");
    const [stage, setStage] = useState<Stage>("waiting");
    const me = store.user;

    // คำขอที่ส่งมาแผนกฉัน (ผ่านการอนุมัติต้นสังกัดแล้ว)
    const toMyDept = store.requests.filter((r) => r.targetDept === me?.dept && !["pending_approval", "returned"].includes(r.status));
    // แยก "คำขอเข้าแผนก" (มาจากแผนกอื่น) กับ "คำขอในแผนก" (คนในแผนกเดียวกันขอเอง)
    const bySource = toMyDept.filter((r) => {
        const internal = store.userById(r.requesterId)?.dept === me?.dept;
        return source === "internal" ? internal : !internal;
    });
    const shown = bySource.filter(stages[stage]);

    return (
        <>
            <PageHeader title="คำขอเข้าแผนก" />
            <div className="mb-3 flex gap-1 border-b border-line">
                {([["external", "คำขอจากแผนกอื่น"], ["internal", "คำขอในแผนก"]] as const).map(([v, label]) => (
                    <button key={v} onClick={() => setSource(v)}
                        className={source === v ? "-mb-px border-b-2 border-brand px-4 py-2 text-sm font-semibold text-brand" : "px-4 py-2 text-sm text-ink-2 hover:text-ink"}>
                        {label} ({toMyDept.filter((r) => (store.userById(r.requesterId)?.dept === me?.dept) === (v === "internal")).length})
                    </button>
                ))}
            </div>
            <div className="mb-4">
                <FilterChips value={stage} onChange={setStage} options={[
                    { value: "waiting", label: "รอรับงาน", count: bySource.filter(stages.waiting).length },
                    { value: "active", label: "กำลังทำ", count: bySource.filter(stages.active).length },
                    { value: "closed", label: "ปิดแล้ว", count: bySource.filter(stages.closed).length },
                    { value: "all", label: "ทั้งหมด", count: bySource.length },
                ]} />
            </div>
            <RequestTable showRequester requests={shown} href={(r) => `/incoming/${r.id}`} empty="ไม่มีคำขอในกลุ่มนี้" />
        </>
    )
}
