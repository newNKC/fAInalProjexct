'use client'

import { useRouter } from "next/navigation";
import PageHeader from "@/components/page-header";
import RequestForm from "@/components/request-form";
import { useStore } from "@/data/store";

export default function Page() {
    const store = useStore();
    const router = useRouter();

    return (
        <>
            <PageHeader title="สร้างคำขอ" />
            <RequestForm submitLabel="ส่งคำขอ" onSubmit={(draft) => {
                const created = store.submitRequest(draft);
                if (created) router.push(`/requests/${created.id}`);
            }} />
        </>
    )
}
