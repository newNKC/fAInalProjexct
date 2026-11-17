'use client'

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle1, Pencil1, Reply } from "@tailgrids/icons";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import ReasonDialog from "@/components/reason-dialog";
import RequestDetail, { NotFound } from "@/components/request-detail";
import { useStore } from "@/data/store";

export default function Page() {
    const store = useStore();
    const { id } = useParams<{ id: string }>();
    const [fixOpen, setFixOpen] = useState(false);

    const r = store.requests.find((x) => x.id === Number(id) && x.requesterId === store.user?.id);
    if (!r) return <NotFound backHref="/requests" />;

    return (
        <>
            <RequestDetail request={r} backHref="/requests" backLabel="คำขอของฉัน" actions={<>
                {/* ถูกส่งกลับ → แก้ไขแล้วส่งใหม่ */}
                {r.status === "returned" && (
                    <Link href={`/requests/${r.id}/edit`} className={buttonStyles({ size: "sm" })}><Pencil1 />แก้ไขและส่งใหม่</Link>
                )}
                {/* รอตรวจรับ → ยืนยัน หรือ ขอแก้ */}
                {r.status === "pending_acceptance" && <>
                    <Button size="sm" appearance="outline" onPress={() => setFixOpen(true)}><Reply />ขอให้แก้ไข</Button>
                    <Button size="sm" variant="success" onPress={() => store.confirmDone(r.id)}><CheckCircle1 />ยืนยันรับงาน</Button>
                </>}
            </>}>
                {r.status === "pending_acceptance" && (
                    <div className="rounded-xl bg-[#FCE7F3] px-4 py-3 text-sm text-[#9D174D]">
                        งานทุกส่วนเสร็จแล้ว กรุณาตรวจว่าตรงตามคำขอ แล้วกด “ยืนยันรับงาน” หรือ “ขอให้แก้ไข”
                    </div>
                )}
            </RequestDetail>

            <ReasonDialog open={fixOpen} onClose={() => setFixOpen(false)} title="ขอให้แก้ไขงาน" confirmLabel="ส่งกลับให้แก้ไข"
                onConfirm={(reason) => { store.requestFix(r.id, reason); setFixOpen(false); }} />
        </>
    )
}
