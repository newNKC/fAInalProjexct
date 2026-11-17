'use client'

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle1, InfoCircle, Reply, Shield1Check } from "@tailgrids/icons";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import Banner from "@/components/banner";
import PageHeader from "@/components/page-header";
import ReasonDialog from "@/components/reason-dialog";
import { MainTasks, RequestHistory, RequestInfo, RequestStepper, RequestSummary, TaskTree } from "@/components/request-parts";
import { NoAccess } from "@/components/role-shell";
import { canApprove, roleHome, primaryRole } from "@/data/requests";
import { useStore } from "@/data/store";

// รายละเอียดคำขอ (ทุกคนที่มีสิทธิ์ดูใช้หน้าเดียวกัน · ปุ่มที่เห็นขึ้นกับว่าเป็นใครกับคำขอนี้)
export default function Page() {
    const { id } = useParams<{ id: string }>();
    const store = useStore();
    const router = useRouter();
    const user = store.user!;
    const [fixOpen, setFixOpen] = useState(false);

    const r = store.requests.find((x) => x.id === Number(id));
    if (!r) return <NoAccess text="ไม่พบคำขอนี้" />;
    if (!store.canSee(r)) return <NoAccess text="คำขอนี้อยู่นอกฝ่าย/แผนกของคุณ จึงมองไม่เห็น" />;

    const mine = r.requesterId === user.id;
    const isTargetSide = r.targetDept === user.dept && (user.roles.includes("head") || user.roles.includes("assignee"));
    const isHead = r.targetDept === user.dept && user.roles.includes("head");
    const seesAllTasks = isTargetSide || user.roles.includes("executive") || user.roles.includes("admin");
    const lastReason = store.logs.filter((l) => l.requestId === r.id && l.reason).at(-1);

    return (
        <>
            <PageHeader title={`คำขอ ${r.code}`} back={{ href: mine || !isTargetSide ? "/requests" : roleHome[primaryRole(user)], label: "กลับ" }} />

            {/* แถบแจ้งตามสถานะ + ปุ่มที่ผู้ใช้คนนี้ทำได้ */}
            <div className="mb-4 flex flex-col gap-2">
                {r.status === "returned" && (
                    <Banner tone="warning" icon={<Reply />}
                        action={mine && <Link href={`/requests/${r.id}/edit`} className={buttonStyles({ size: "sm" })}>แก้ไขและส่งใหม่</Link>}>
                        ถูกส่งกลับให้แก้ไข{lastReason ? ` · เหตุผล: ${lastReason.reason}` : ""}
                    </Banner>
                )}
                {r.status === "rejected" && (
                    <Banner tone="danger" icon={<InfoCircle />}>{r.targetDept}ปฏิเสธคำขอนี้{lastReason ? ` · เหตุผล: ${lastReason.reason}` : ""}</Banner>
                )}
                {r.status === "pending_acceptance" && mine && (
                    <Banner tone="success" icon={<CheckCircle1 />} action={
                        <div className="flex gap-2">
                            <Button size="sm" appearance="outline" onPress={() => setFixOpen(true)}>ขอให้แก้ไข</Button>
                            <Button size="sm" variant="success" onPress={() => { store.confirmDone(r.id); store.showToast(`ตรวจรับงาน ${r.code} แล้ว · ปิดคำขอเรียบร้อย`); }}>
                                <CheckCircle1 />ตรวจรับงาน
                            </Button>
                        </div>
                    }>
                        งานเสร็จครบ 100% แล้ว · รอคุณตรวจรับ ถ้ายังไม่ตรงที่ต้องการ กด “ขอให้แก้ไข” พร้อมเหตุผล
                    </Banner>
                )}
                {r.status === "pending_acceptance" && !mine && <Banner tone="info" icon={<InfoCircle />}>งานเสร็จครบ 100% แล้ว · รอผู้ขอตรวจรับ</Banner>}
                {canApprove(store.users, user, r) && (
                    <Banner tone="info" icon={<Shield1Check />} action={<Link href={`/approvals/${r.id}`} className={buttonStyles({ size: "sm" })}>พิจารณา</Link>}>
                        คำขอนี้รอคุณอนุมัติในฐานะหัวหน้าต้นสังกัด
                    </Banner>
                )}
                {isHead && r.status === "pending_target" && (
                    <Banner tone="info" icon={<InfoCircle />} action={
                        <div className="flex gap-2">
                            <Link href={`/incoming/${r.id}/decline`} className={buttonStyles({ size: "sm", appearance: "outline" })}>ไม่รับงาน</Link>
                            <Link href={`/incoming/${r.id}/plan`} className={buttonStyles({ size: "sm" })}>รับงานและแบ่งงาน</Link>
                        </div>
                    }>คำขอนี้รอคุณพิจารณาในฐานะหัวหน้า{r.targetDept}</Banner>
                )}
            </div>

            <div className="grid grid-cols-[1fr_20rem] items-start gap-6">
                <div className="flex flex-col gap-4">
                    <RequestStepper r={r} />
                    {seesAllTasks ? <TaskTree r={r} /> : <MainTasks r={r} />}
                    <RequestSummary r={r} />
                </div>
                <div className="flex flex-col gap-4">
                    <RequestInfo r={r} />
                    <RequestHistory r={r} />
                </div>
            </div>

            <ReasonDialog open={fixOpen} onClose={() => setFixOpen(false)} title={`ขอให้แก้ไขงาน ${r.code}`} confirmLabel="ส่งกลับให้แผนกปลายทางแก้"
                onConfirm={(reason) => { store.requestFix(r.id, reason); setFixOpen(false); store.showToast(`ส่ง ${r.code} กลับให้${r.targetDept}แก้ไขแล้ว`); router.refresh(); }} />
        </>
    )
}
