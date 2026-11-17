'use client'

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle1, InfoCircle, Reply } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import Banner from "@/components/banner";
import PageHeader from "@/components/page-header";
import { Card, RequestHistory, RequestSummary } from "@/components/request-parts";
import { fieldClass } from "@/components/request-form";
import { NoAccess } from "@/components/role-shell";
import { canApprove, findHead, nick } from "@/data/requests";
import { useStore } from "@/data/store";

// พิจารณาคำขอ (หัวหน้าต้นสังกัด · ด่านที่ 1 จาก 2)
export default function Page() {
    const { id } = useParams<{ id: string }>();
    const store = useStore();
    const router = useRouter();
    const user = store.user!;
    const [checks, setChecks] = useState([false, false, false]);
    const [mode, setMode] = useState<"review" | "return">("review");
    const [reason, setReason] = useState("");

    const r = store.requests.find((x) => x.id === Number(id));
    if (!r || !canApprove(store.users, user, r)) return <NoAccess text="คำขอนี้ไม่ได้รอคุณอนุมัติ (อาจถูกพิจารณาไปแล้ว)" />;

    const head = findHead(store.users, r.targetDept);
    const items = ["รายละเอียดตรงกับที่คุยกันไว้", `ส่งถึงแผนกที่ถูกต้อง (${r.targetDept})`, "แนบไฟล์ที่จำเป็นครบ"];

    const approve = () => {
        store.approve(r.id);
        store.showToast(`อนุมัติ ${r.code} แล้ว · ส่งต่อให้หัวหน้า${r.targetDept}`);
        router.push("/approvals");
    }
    const sendBack = () => {
        store.returnRequest(r.id, reason.trim());
        store.showToast(`ส่ง ${r.code} กลับให้ ${nick(store.userById(r.requesterId)?.name)} แก้ไขแล้ว`);
        router.push("/approvals");
    }

    return (
        <>
            <PageHeader title={`พิจารณาคำขอ ${r.code}`} back={{ href: "/approvals", label: "กลับไปรออนุมัติ" }} />
            <div className="grid grid-cols-[1fr_22rem] items-start gap-6">
                <div className="flex flex-col gap-4">
                    <RequestSummary r={r} />
                    <RequestHistory r={r} />
                </div>
                <div className="flex flex-col gap-4">
                    <Card title="การพิจารณาของหัวหน้าต้นสังกัด" hint="ด่านที่ 1 จาก 2">
                        {mode === "review" ? (
                            <>
                                <p className="mb-2 text-sm font-semibold text-ink">ตรวจก่อนอนุมัติ</p>
                                <div className="flex flex-col gap-2.5">
                                    {items.map((t, i) => (
                                        <div key={t} className="flex items-center gap-2.5 text-sm text-ink">
                                            <Checkbox id={`chk-${i}`} checked={checks[i]} onChange={(e) => setChecks((c) => c.map((x, j) => j === i ? e.target.checked : x))} />
                                            <label htmlFor={`chk-${i}`} className="cursor-pointer">{t}</label>
                                        </div>
                                    ))}
                                </div>
                                {!checks.every(Boolean) && <p className="mt-2 text-xs text-ink-3">ติ๊กให้ครบทุกข้อก่อนอนุมัติ</p>}
                                <div className="mt-4 flex flex-col gap-2">
                                    <Button size="sm" variant="success" disabled={!checks.every(Boolean)} onPress={approve}><CheckCircle1 />อนุมัติและส่งต่อ{r.targetDept}</Button>
                                    <Button size="sm" appearance="outline" onPress={() => setMode("return")}><Reply />ส่งกลับให้แก้ไข</Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setMode("review")} className="mb-3 inline-flex items-center gap-1 text-xs text-ink-2 hover:text-brand"><ArrowLeft className="size-4" />กลับไปพิจารณา</button>
                                <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">เหตุผลที่ส่งกลับ *
                                    <textarea aria-label="เหตุผลที่ส่งกลับ" rows={4} className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)}
                                        placeholder="บอกผู้ขอว่าต้องแก้หรือเพิ่มอะไร" />
                                </label>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button size="sm" appearance="outline" onPress={() => { setMode("review"); setReason(""); }}>ยกเลิก</Button>
                                    <Button size="sm" variant="danger" disabled={!reason.trim()} onPress={sendBack}>ยืนยันส่งกลับ</Button>
                                </div>
                            </>
                        )}
                    </Card>
                    <Banner tone="info" icon={<InfoCircle />}>อนุมัติแล้วคำขอไปที่หัวหน้า{r.targetDept} ({head ? nick(head.name) : "-"})</Banner>
                </div>
            </div>
        </>
    )
}
