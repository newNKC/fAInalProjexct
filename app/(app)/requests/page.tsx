'use client'

// คำขอของฉัน / คำขอในฝ่าย · ใช้หน้าตารางของนพรัตน์ (RequestListPage แบบ unit) แสดงคำขอของทุกคนในฝ่ายเดียวกับผู้ใช้
import Link from "next/link";
import { CheckCircle1, Plus, Reply } from "@tailgrids/icons";
import Banner from "@/components/banner";
import LinkButton from "@/components/request-ui/LinkButton";
import RequestListPage from "@/components/request-ui/RequestListPage";
import { deptKind } from "@/data/requests";
import { useStore } from "@/data/store";

export default function Page() {
    const store = useStore();
    const user = store.user!;
    const title = !user.roles.includes("approver") ? "คำขอของฉัน" : user.roles.includes("head") ? `คำขอที่${deptKind(user.dept)}ส่ง` : `คำขอใน${deptKind(user.dept)}`;
    const rows = store.requests.filter((r) => store.userById(r.requesterId)?.dept === user.dept && store.canSee(r));
    const returned = store.requests.filter((r) => r.requesterId === user.id && r.status === "returned");
    const toAccept = store.requests.filter((r) => r.requesterId === user.id && r.status === "pending_acceptance");

    return (
        <RequestListPage title={title} sub={`คำขอทั้งหมดของคนใน${user.dept} · คนนอก${deptKind(user.dept)}มองไม่เห็น`}
            hrefBase="/requests" requests={rows} mode="unit"
            actions={store.can("submit") && <LinkButton href="/requests/new" className="inline-flex items-center gap-1 px-3 py-2 text-sm"><Plus size={18} />ส่งคำขอใหม่</LinkButton>}
            banners={(returned.length > 0 || toAccept.length > 0) && (
                <div className="mb-4 flex flex-col gap-2">
                    {returned.map((r) => (
                        <Banner key={r.id} tone="warning" icon={<Reply />}
                            action={<Link href={`/requests/${r.id}/edit`} className="text-sm font-semibold underline">แก้ไขและส่งใหม่</Link>}>
                            คำขอ {r.code} “{r.title}” ถูกส่งกลับให้แก้ไข
                        </Banner>
                    ))}
                    {toAccept.map((r) => (
                        <Banner key={r.id} tone="success" icon={<CheckCircle1 />}
                            action={<Link href={`/requests/${r.id}`} className="text-sm font-semibold underline">ไปตรวจรับงาน</Link>}>
                            คำขอ {r.code} “{r.title}” เสร็จครบ 100% แล้ว · รอคุณตรวจรับ
                        </Banner>
                    ))}
                </div>
            )} />
    )
}
