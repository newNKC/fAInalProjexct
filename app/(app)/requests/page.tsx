'use client'

// คำขอของฉัน / คำขอในฝ่าย · ใช้หน้าตารางของนพรัตน์ (RequestListPage แบบ unit)
// "คำขอของฉัน" เริ่มที่คำขอของผู้ใช้เอง กด "ทั้งฝ่าย" เพื่อดูของทุกคนในฝ่าย (?who=all) · หัวหน้าต้นสังกัดเห็นทั้งฝ่ายเป็นค่าเริ่มต้น
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
    const isApprover = user.roles.includes("approver");
    const who = useSearchParams().get("who") ?? (isApprover ? "all" : "mine");
    const deptRows = store.requests.filter((r) => store.userById(r.requesterId)?.dept === user.dept && store.canSee(r));
    const rows = who === "all" ? deptRows : deptRows.filter((r) => r.requesterId === user.id);
    const hrefBase = isApprover ? (who === "mine" ? "/requests?who=mine" : "/requests") : (who === "all" ? "/requests?who=all" : "/requests");
    const chip = (value: string, label: string) => {
        const href = isApprover ? (value === "all" ? "/requests" : "/requests?who=mine") : (value === "mine" ? "/requests" : "/requests?who=all");
        const on = who === value;
        return <Link key={value} href={href} aria-current={on ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${on ? "border-[#4338CA] bg-[#EEF2FF] font-semibold text-[#3730A3]" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>{label}</Link>;
    };
    const returned = store.requests.filter((r) => r.requesterId === user.id && r.status === "returned");
    const toAccept = store.requests.filter((r) => r.requesterId === user.id && r.status === "pending_acceptance");

    return (
        <RequestListPage title={title}
            sub={who === "all" ? `คำขอทั้งหมดของคนใน${user.dept} · คนนอก${deptKind(user.dept)}มองไม่เห็น` : "คำขอที่คุณส่ง"}
            hrefBase={hrefBase} requests={rows} mode="unit"
            actions={store.can("submit") && <LinkButton href="/requests/new" className="inline-flex items-center gap-1 px-3 py-2 text-sm"><Plus size={18} />ส่งคำขอใหม่</LinkButton>}
            banners={<>
                <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
                    ผู้ขอ: {chip("mine", "ของฉัน")}{chip("all", `ทั้ง${deptKind(user.dept)}`)}
                </div>
                {(returned.length > 0 || toAccept.length > 0) && (
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
                )}
            </>} />
    )
}
