'use client'

import { useState } from "react";
import FilterChips from "@/components/filter-chips";
import PageHeader from "@/components/page-header";
import RequestTable from "@/components/request-table";
import { useStore } from "@/data/store";

type Tab = "waiting" | "decided"

export default function Page() {
    const store = useStore();
    const [tab, setTab] = useState<Tab>("waiting");

    // คำขอที่ฉันเป็นผู้อนุมัติ
    const mine = store.requests.filter((r) => r.approverId === store.user?.id);
    const waiting = mine.filter((r) => r.status === "pending_approval");
    const decided = mine.filter((r) => r.status !== "pending_approval");

    return (
        <>
            <PageHeader title="พิจารณาคำขอ" />
            <div className="mb-4">
                <FilterChips value={tab} onChange={setTab} options={[
                    { value: "waiting", label: "รออนุมัติ", count: waiting.length },
                    { value: "decided", label: "พิจารณาแล้ว", count: decided.length },
                ]} />
            </div>
            <RequestTable showRequester requests={tab === "waiting" ? waiting : decided} href={(r) => `/approvals/${r.id}`}
                empty={tab === "waiting" ? "ไม่มีคำขอที่รอการอนุมัติ" : "ยังไม่มีคำขอที่พิจารณาแล้ว"} />
        </>
    )
}
