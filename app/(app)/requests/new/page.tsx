'use client'

import { useRouter } from "next/navigation";
import PageHeader from "@/components/page-header";
import RequestForm from "@/components/request-form";
import { Guard } from "@/components/role-shell";
import { useStore } from "@/data/store";
import { allRoles } from "@/data/users";

// ส่งคำขอใหม่ (ทุกโรลที่มีสิทธิ์ "ส่งคำขอ")
export default function Page() {
    const store = useStore();
    const router = useRouter();
    return (
        <Guard roles={allRoles} perm="submit">
            <PageHeader title="ส่งคำขอใหม่" back={{ href: "/requests", label: "กลับไปรายการคำขอ" }} />
            <RequestForm submitLabel="ส่งคำขอ" cancelHref="/requests" onSubmit={(draft) => {
                const r = store.submitRequest(draft);
                if (!r) return;
                store.showToast(r.status === "pending_approval" ? `ส่งคำขอ ${r.code} แล้ว · รอหัวหน้าต้นสังกัดอนุมัติ` : `ส่งคำขอ ${r.code} ถึง${r.targetDept}แล้ว`);
                router.push("/requests");
            }} />
        </Guard>
    )
}
