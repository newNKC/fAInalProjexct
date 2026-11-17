'use client'

import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/page-header";
import RequestForm from "@/components/request-form";
import { NotFound } from "@/components/request-detail";
import { useStore } from "@/data/store";

export default function Page() {
    const store = useStore();
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    // แก้ได้เฉพาะคำขอของตัวเองที่ถูกส่งกลับ
    const r = store.requests.find((x) => x.id === Number(id) && x.requesterId === store.user?.id && x.status === "returned");
    if (!r) return <NotFound backHref="/requests" />;

    const reason = [...store.logs].reverse().find((l) => l.requestId === r.id && l.toStatus === "returned");

    return (
        <>
            <PageHeader title={`แก้ไขคำขอ ${r.code}`} />
            {reason && (
                <div className="mb-4 max-w-3xl rounded-xl bg-[#FEF3C7] px-4 py-3 text-sm text-[#92400E]">
                    <p className="font-semibold">เหตุผลที่ถูกส่งกลับ ({store.userById(reason.actorId)?.name})</p>
                    <p>{reason.reason}</p>
                </div>
            )}
            <RequestForm submitLabel="ส่งใหม่" initial={{
                title: r.title, detail: r.detail, categoryId: r.categoryId, targetDept: r.targetDept, dueDate: r.dueDate, attachments: r.attachments,
            }} onSubmit={(draft) => {
                store.resubmitRequest(r.id, draft);
                router.push(`/requests/${r.id}`);
            }} />
        </>
    )
}
