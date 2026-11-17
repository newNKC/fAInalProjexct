'use client'

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/tailgrids/core/button";
import PageHeader from "@/components/page-header";
import { Card, RequestSummary } from "@/components/request-parts";
import { fieldClass } from "@/components/request-form";
import { NoAccess } from "@/components/role-shell";
import { findHead, nick } from "@/data/requests";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

// ไม่รับงาน: ปฏิเสธพร้อมเหตุผล หรือ ส่งต่อแผนกอื่น (ทุกกรณีต้องมีเหตุผล)
export default function Page() {
    const { id } = useParams<{ id: string }>();
    const search = useSearchParams();
    const store = useStore();
    const router = useRouter();
    const user = store.user!;
    const [mode, setMode] = useState<"reject" | "forward">(search.get("mode") === "forward" ? "forward" : "reject");
    const others = store.depts.filter((d) => d !== user.dept && findHead(store.users, d));
    const [dept, setDept] = useState(others[0] ?? "");
    const [reason, setReason] = useState("");

    const r = store.requests.find((x) => x.id === Number(id));
    if (!r || r.targetDept !== user.dept || r.status !== "pending_target") return <NoAccess text="คำขอนี้ไม่ได้รอแผนกของคุณพิจารณา" />;

    const confirm = () => {
        if (mode === "reject") {
            store.rejectRequest(r.id, reason.trim());
            store.showToast(`ปฏิเสธ ${r.code} แล้ว · ${nick(store.userById(r.requesterId)?.name)} จะเห็นเหตุผล`);
        } else {
            store.forwardRequest(r.id, dept, reason.trim());
            store.showToast(`ส่งต่อ ${r.code} ไป${dept}แล้ว`);
        }
        router.push("/incoming");
    }
    const ok = reason.trim() && (mode === "reject" || dept);

    const option = (value: "reject" | "forward", title: string, desc: string) => (
        <label className={cn("flex cursor-pointer gap-3 rounded-lg p-3 ring-1", mode === value ? "bg-brand-soft ring-brand" : "ring-line hover:bg-page")}>
            <input type="radio" name="mode" className="mt-1 accent-[var(--color-brand)]" checked={mode === value} onChange={() => setMode(value)} />
            <span><span className="block text-sm font-semibold text-ink">{title}</span><span className="text-xs text-ink-2">{desc}</span></span>
        </label>
    );

    return (
        <>
            <PageHeader title={`ไม่รับงาน ${r.code}`} back={{ href: "/incoming", label: "กลับไปคำขอเข้าแผนก" }} />
            <div className="grid grid-cols-[1fr_24rem] items-start gap-6">
                <RequestSummary r={r} />
                <Card title="ไม่รับงานนี้ — เลือกอย่างใดอย่างหนึ่ง" hint="ทุกกรณีต้องมีเหตุผล ผู้ขอจะเห็นเหตุผลนี้">
                    <div className="flex flex-col gap-2">
                        {option("reject", "ปฏิเสธพร้อมเหตุผล", "ปิดคำขอ ผู้ขอเห็นเหตุผลและส่งคำขอใหม่ได้")}
                        {option("forward", "ส่งต่อแผนกอื่น", "คำขอไปรอหัวหน้าแผนกที่เลือกพิจารณาแทน")}
                    </div>
                    {mode === "forward" && (
                        <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-ink">ส่งต่อไปแผนก *
                            <select aria-label="ส่งต่อไปแผนก" className={fieldClass} value={dept} onChange={(e) => setDept(e.target.value)}>
                                {others.length === 0 && <option value="">ไม่มีแผนกอื่นที่มีหัวหน้าในระบบ</option>}
                                {others.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-ink">เหตุผล *
                        <textarea aria-label="เหตุผล" rows={4} className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุเหตุผลให้ผู้ขอเข้าใจ" />
                    </label>
                    <div className="mt-4 flex justify-end gap-2">
                        <Button size="sm" appearance="outline" onPress={() => router.push("/incoming")}>ยกเลิก</Button>
                        <Button size="sm" variant={mode === "reject" ? "danger" : "primary"} disabled={!ok} onPress={confirm}>
                            {mode === "reject" ? "ยืนยันปฏิเสธ" : "ยืนยันส่งต่อ"}
                        </Button>
                    </div>
                </Card>
            </div>
        </>
    )
}
