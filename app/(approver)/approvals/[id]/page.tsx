'use client'

import { useParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle1, Reply } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import ReasonDialog from "@/components/reason-dialog";
import RequestDetail, { NotFound } from "@/components/request-detail";
import { useStore } from "@/data/store";

export default function Page() {
    const store = useStore();
    const { id } = useParams<{ id: string }>();
    const [returnOpen, setReturnOpen] = useState(false);

    const r = store.requests.find((x) => x.id === Number(id) && x.approverId === store.user?.id);
    if (!r) return <NotFound backHref="/approvals" />;

    return (
        <>
            <RequestDetail request={r} backHref="/approvals" backLabel="พิจารณาคำขอ" actions={r.status === "pending_approval" && <>
                <Button size="sm" appearance="outline" onPress={() => setReturnOpen(true)}><Reply />ส่งกลับ</Button>
                <Button size="sm" onPress={() => store.approve(r.id)}><CheckCircle1 />อนุมัติ</Button>
            </>} />

            <ReasonDialog open={returnOpen} onClose={() => setReturnOpen(false)} title={`ส่งกลับ ${r.code}`} confirmLabel="ส่งกลับให้ผู้ขอแก้ไข"
                onConfirm={(reason) => { store.returnRequest(r.id, reason); setReturnOpen(false); }} />
        </>
    )
}
