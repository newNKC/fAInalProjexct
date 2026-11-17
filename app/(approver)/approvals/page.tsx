'use client'

import { useState } from "react";
import FilterChips from "@/components/filter-chips";
import PageHeader from "@/components/page-header";
import RequestTable from "@/components/request-table";
import { canApprove } from "@/data/requests";
import { useStore } from "@/data/store";

type Tab = "waiting" | "decided"

export default function Page() {
    const store = useStore();
    const [tab, setTab] = useState<Tab>("waiting");

    // รออนุมัติ = คำขอของคนในแผนกฉันที่ยังไม่มีใครพิจารณา · พิจารณาแล้ว = คำขอที่ฉันเป็นคนอนุมัติ/ส่งกลับ
    const me = store.user;
    const waiting = me ? store.requests.filter((r) => canApprove(store.users, me, r)) : [];
    const decided = store.requests.filter((r) => r.approverId === me?.id && r.status !== "pending_approval");

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
