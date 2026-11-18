'use client'

import { useParams, useRouter } from "next/navigation";
import { InfoCircle } from "@tailgrids/icons";
import Banner from "@/components/banner";
import PageHeader from "@/components/page-header";
import RequestForm from "@/components/request-form";
import { NoAccess } from "@/components/role-shell";
import { useStore } from "@/data/store";

// แก้ไขคำขอที่ถูกส่งกลับ แล้วส่งใหม่ (เฉพาะเจ้าของคำขอ)
export default function Page() {
    const { id } = useParams<{ id: string }>();
    const store = useStore();
    const router = useRouter();
    const r = store.requests.find((x) => x.id === Number(id));
    if (!r) return <NoAccess title="ไม่พบคำขอ" text="ไม่มีคำขอนี้ในระบบ หรือลิงก์ไม่ถูกต้อง" />;
    if (r.requesterId !== store.user?.id || r.status !== "returned") {
        return <NoAccess text="แก้ไขได้เฉพาะคำขอของคุณที่ถูกส่งกลับให้แก้ไข" />
    }
    const reason = store.logs.filter((l) => l.requestId === r.id && l.toStatus === "returned").at(-1);
    return (
        <>
            <PageHeader title={`แก้ไขคำขอ ${r.code}`} back={{ href: `/requests/${r.id}`, label: "กลับไปหน้าคำขอ" }} />
            {reason && <Banner tone="warning" icon={<InfoCircle />} className="mb-4">เหตุผลที่ถูกส่งกลับ: {reason.reason}</Banner>}
            <RequestForm submitLabel="ส่งใหม่" cancelHref={`/requests/${r.id}`}
                initial={{ title: r.title, detail: r.detail, categoryId: r.categoryId, targetDept: r.targetDept, dueDate: r.dueDate, attachments: r.attachments }}
                onSubmit={(draft) => {
                    store.resubmitRequest(r.id, draft);
                    store.showToast(`ส่งคำขอ ${r.code} ใหม่แล้ว · รอหัวหน้าต้นสังกัดอนุมัติ`);
                    router.push(`/requests/${r.id}`);
                }} />
        </>
    )
}
