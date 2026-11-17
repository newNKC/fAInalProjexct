'use client'

// หน้าสรุปภาพรวม (ผู้บริหารและผู้ดูแลระบบใช้ร่วมกัน)
import { useState } from "react";
import PageHeader from "@/components/page-header";
import RequestTable from "@/components/request-table";
import { allStatuses, STATUS_LABEL } from "@/components/status-badge";
import { isOverdue, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

const fieldClass = "rounded-lg border border-base-300 bg-white px-3 py-2 text-sm outline-none focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20"

// แผนภูมิแท่งแนวนอนแบบง่าย (สีเดียว ยิ่งยาวยิ่งมาก) · ชี้แล้วมีตัวเลขบอก
function BarList({ title, rows }: { title: string, rows: { label: string, value: number }[] }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <section className="rounded-xl bg-white p-5 ring-1 ring-line">
            <h2 className="mb-4 font-semibold text-ink">{title}</h2>
            <div className="flex flex-col gap-2.5">
                {rows.map((r) => (
                    <div key={r.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3 text-sm" title={`${r.label}: ${r.value} คำขอ`}>
                        <span className="truncate text-ink-2">{r.label}</span>
                        <div className="h-3 rounded-r bg-page">
                            <div className="h-full rounded-r bg-brand" style={{ width: `${(r.value / max) * 100}%` }} />
                        </div>
                        <span className="text-right font-semibold text-ink">{r.value}</span>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default function DashboardView({ detailHref }: { detailHref: (r: Request) => string }) {
    const store = useStore();
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    // กรองตามวันที่ส่งคำขอ
    const inRange = store.requests.filter((r) => {
        const day = r.createdAt.slice(0, 10);
        return (!from || day >= from) && (!to || day <= to);
    });
    const overdue = inRange.filter((r) => isOverdue(r));
    const count = (fn: (r: Request) => boolean) => inRange.filter(fn).length;

    const tiles = [
        { label: "คำขอทั้งหมด", value: inRange.length },
        { label: "ยังไม่ปิดงาน", value: count((r) => ["pending_approval", "pending_target", "in_progress", "pending_acceptance", "returned"].includes(r.status)) },
        { label: "เสร็จสิ้น", value: count((r) => r.status === "done") },
        { label: "เกินกำหนด", value: overdue.length, alert: overdue.length > 0 },
    ];

    return (
        <>
            <PageHeader title="Dashboard" actions={
                <div className="flex items-center gap-2 text-sm text-ink-2">
                    <span>ส่งคำขอตั้งแต่</span>
                    <input aria-label="ตั้งแต่วันที่" type="date" className={fieldClass} value={from} onChange={(e) => setFrom(e.target.value)} />
                    <span>ถึง</span>
                    <input aria-label="ถึงวันที่" type="date" className={fieldClass} value={to} onChange={(e) => setTo(e.target.value)} />
                    {(from || to) && <button className="text-xs text-brand hover:underline" onClick={() => { setFrom(""); setTo(""); }}>ล้าง</button>}
                </div>
            } />

            {/* ตัวเลขหลัก */}
            <div className="mb-4 grid grid-cols-4 gap-4">
                {tiles.map((t) => (
                    <div key={t.label} className="rounded-xl bg-white p-5 ring-1 ring-line">
                        <p className="text-sm text-ink-2">{t.label}</p>
                        <p className={t.alert ? "text-3xl font-bold text-[#BE123C]" : "text-3xl font-bold text-ink"}>{t.value}</p>
                    </div>
                ))}
            </div>

            <div className="mb-4 grid grid-cols-3 gap-4">
                <BarList title="แยกตามสถานะ" rows={allStatuses.map((s) => ({ label: STATUS_LABEL[s], value: count((r) => r.status === s) }))} />
                <BarList title="แยกตามแผนกผู้ขอ" rows={store.depts.map((d) => ({ label: d, value: count((r) => store.userById(r.requesterId)?.dept === d) }))} />
                <BarList title="แยกตามหมวดคำขอ" rows={store.categories.map((c) => ({ label: c.name, value: count((r) => r.categoryId === c.id) }))} />
            </div>

            <h2 className="mb-2 font-semibold text-ink">คำขอที่เกินกำหนด</h2>
            <div className="mb-6">
                <RequestTable showRequester requests={overdue} href={detailHref} empty="ไม่มีคำขอที่เกินกำหนด" />
            </div>

            <h2 className="mb-2 font-semibold text-ink">คำขอทั้งหมด</h2>
            <RequestTable showRequester requests={inRange} href={detailHref} />
        </>
    )
}
