'use client'

// หน้ารายละเอียดคำขอแบบดูอย่างเดียว (ผู้บริหารและผู้ดูแลระบบ)
import { useParams } from "next/navigation";
import RequestDetail, { NotFound } from "@/components/request-detail";
import { useStore } from "@/data/store";

export default function ReadonlyRequestPage({ backHref }: { backHref: string }) {
    const store = useStore();
    const { id } = useParams<{ id: string }>();
    const r = store.requests.find((x) => x.id === Number(id));
    if (!r) return <NotFound backHref={backHref} />;
    return <RequestDetail request={r} backHref={backHref} backLabel="Dashboard" />
}
