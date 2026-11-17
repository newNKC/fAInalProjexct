'use client'

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle1, Plus, Trash1 } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import PageHeader from "@/components/page-header";
import { Card, RequestSummary } from "@/components/request-parts";
import { fieldClass } from "@/components/request-form";
import { NoAccess } from "@/components/role-shell";
import { useLeaveGuard } from "@/components/use-leave-guard";
import { isLeafTask, nick, todayISO } from "@/data/requests";
import { useStore, type PlanDraft } from "@/data/store";
import { cn } from "@/utils/cn";

// รับงานและแตกงาน: งานหลัก (ผู้ขอเห็น) → งานย่อย (มอบหมายคน + กำหนดส่ง)
export default function Page() {
    const { id } = useParams<{ id: string }>();
    const store = useStore();
    const router = useRouter();
    const user = store.user!;
    const r = store.requests.find((x) => x.id === Number(id));

    const emptySub = () => ({ title: "", assigneeId: 0, dueDate: r?.dueDate ?? "" });
    const [plan, setPlan] = useState<PlanDraft>([{ title: "", subs: [emptySub()] }]);
    const [teamId, setTeamId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    useLeaveGuard(!done && plan.some((m) => m.title.trim() || m.subs.some((s) => s.title.trim() || s.assigneeId)));

    if (!r || r.targetDept !== user.dept || r.status !== "pending_target") return <NoAccess text="คำขอนี้ไม่ได้รอแผนกของคุณรับงาน" />;

    const team = store.teams.find((t) => t.id === teamId);
    const people = store.users.filter((u) => u.dept === user.dept && (u.roles.includes("assignee") || u.roles.includes("head")))
        .sort((a, b) => Number(team?.memberIds.includes(b.id) ?? 0) - Number(team?.memberIds.includes(a.id) ?? 0));

    // ภาระงานตอนนี้ = งานย่อยที่ยังไม่เสร็จของคำขอที่กำลังทำ + งานที่กำลังจะมอบหมายในหน้านี้
    const load = (uid: number) => store.tasks.filter((t) => t.assigneeId === uid && t.progress < 100 && isLeafTask(t, store.tasks)
        && store.requests.find((x) => x.id === t.requestId)?.status === "in_progress").length;
    const planned = (uid: number) => plan.flatMap((m) => m.subs).filter((s) => s.assigneeId === uid).length;
    const maxLoad = Math.max(1, ...people.map((p) => load(p.id) + planned(p.id)));

    const setMajor = (i: number, title: string) => setPlan((p) => p.map((m, j) => j === i ? { ...m, title } : m));
    const setSub = (i: number, k: number, patch: Partial<PlanDraft[number]["subs"][number]>) =>
        setPlan((p) => p.map((m, j) => j === i ? { ...m, subs: m.subs.map((s, l) => l === k ? { ...s, ...patch } : s) } : m));

    const confirm = () => {
        const clean = plan.filter((m) => m.title.trim() || m.subs.some((s) => s.title.trim()));
        if (clean.length === 0) return setError("ต้องมีงานหลักอย่างน้อย 1 งาน");
        for (const m of clean) {
            if (!m.title.trim()) return setError("ตั้งชื่องานหลักให้ครบทุกงาน");
            if (m.subs.length === 0) return setError(`งานหลัก “${m.title}” ต้องมีงานย่อยอย่างน้อย 1 งาน`);
            if (m.subs.some((s) => !s.title.trim() || !s.assigneeId || !s.dueDate)) return setError(`งานย่อยใน “${m.title}” ต้องมีชื่องาน ผู้รับผิดชอบ และวันที่ให้ครบ`);
        }
        setDone(true);
        store.acceptWithPlan(r.id, clean.map((m) => ({ title: m.title.trim(), subs: m.subs.map((s) => ({ ...s, title: s.title.trim() })) })), teamId);
        store.showToast(`รับงาน ${r.code} แล้ว · มอบหมาย ${clean.flatMap((m) => m.subs).length} งานย่อย`);
        router.push("/incoming");
    }

    return (
        <>
            <PageHeader title={`รับงานและแตกงาน ${r.code}`} back={{ href: "/incoming", label: "กลับไปคำขอเข้าแผนก" }} />
            <div className="grid grid-cols-[1fr_20rem] items-start gap-6">
                <div className="flex flex-col gap-4">
                    <RequestSummary r={r} compact />
                    <Card title="แตกงานเป็นงานหลักและงานย่อย" hint="งานหลักผู้ขอเห็นพร้อม % · งานย่อยเห็นเฉพาะในแผนก">
                        <div className="flex flex-col gap-4">
                            {plan.map((m, i) => (
                                <div key={i} className="rounded-lg ring-1 ring-line">
                                    <div className="flex items-center gap-2 bg-page px-3 py-2">
                                        <span className="shrink-0 text-sm font-semibold text-ink">งานหลัก:</span>
                                        <Input aria-label={`ชื่องานหลัก ${i + 1}`} className="flex-1 py-1.5 text-sm" placeholder="เช่น วิเคราะห์และออกแบบ" value={m.title} onChange={(e) => setMajor(i, e.target.value)} />
                                        <span className="shrink-0 rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-strong">ผู้ขอเห็น</span>
                                        {plan.length > 1 && <button aria-label="ลบงานหลัก" onClick={() => setPlan((p) => p.filter((_, j) => j !== i))}><Trash1 className="size-4 text-ink-3 hover:text-red-600" /></button>}
                                    </div>
                                    <div className="flex flex-col gap-2 p-3">
                                        {m.subs.map((s, k) => (
                                            <div key={k} className="grid grid-cols-[1fr_11rem_10rem_1.5rem] items-center gap-2">
                                                <Input aria-label={`งานย่อย ${i + 1}.${k + 1}`} className="py-1.5 text-sm" placeholder="ชื่องานย่อย" value={s.title} onChange={(e) => setSub(i, k, { title: e.target.value })} />
                                                <select aria-label={`ผู้รับผิดชอบ ${i + 1}.${k + 1}`} className={cn(fieldClass, "py-1.5")} value={s.assigneeId} onChange={(e) => setSub(i, k, { assigneeId: Number(e.target.value) })}>
                                                    <option value={0}>ผู้รับผิดชอบ</option>
                                                    {people.map((p) => <option key={p.id} value={p.id}>{nick(p.name)}{team?.memberIds.includes(p.id) ? " · ในทีม" : ""}</option>)}
                                                </select>
                                                <input aria-label={`กำหนดส่ง ${i + 1}.${k + 1}`} type="date" min={todayISO()} className={cn(fieldClass, "py-1.5")} value={s.dueDate} onChange={(e) => setSub(i, k, { dueDate: e.target.value })} />
                                                <button aria-label="ลบงานย่อย" onClick={() => setPlan((p) => p.map((x, j) => j === i ? { ...x, subs: x.subs.filter((_, l) => l !== k) } : x))}><Trash1 className="size-4 text-ink-3 hover:text-red-600" /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => setPlan((p) => p.map((x, j) => j === i ? { ...x, subs: [...x.subs, emptySub()] } : x))}
                                            className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand hover:underline"><Plus className="size-4" />เพิ่มงานย่อย</button>
                                    </div>
                                </div>
                            ))}
                            <Button size="sm" appearance="outline" className="w-fit" onPress={() => setPlan((p) => [...p, { title: "", subs: [emptySub()] }])}><Plus />เพิ่มงานหลัก</Button>
                        </div>
                        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                        <div className="mt-5 flex justify-end gap-2">
                            <Button size="sm" appearance="outline" onPress={() => router.push("/incoming")}>ยกเลิก</Button>
                            <Button size="sm" onPress={confirm}><CheckCircle1 />ยืนยันรับงานและมอบหมาย</Button>
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col gap-4">
                    <Card title="ภาระงานของทีมตอนนี้" hint="งานย่อยที่ยังไม่เสร็จ · สีเข้ม = กำลังจะมอบหมายในหน้านี้">
                        <ul className="flex flex-col gap-2.5">
                            {people.map((p) => {
                                const now = load(p.id), add = planned(p.id);
                                return (
                                    <li key={p.id} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-sm" title={`${nick(p.name)}: ${now} งาน${add ? ` + ${add} งานใหม่` : ""}`}>
                                        <span className="truncate text-ink-2">{nick(p.name)}</span>
                                        <div className="flex h-3 gap-0.5 rounded-r bg-page">
                                            {now > 0 && <div className="h-full rounded-r bg-brand/40" style={{ width: `${(now / maxLoad) * 100}%` }} />}
                                            {add > 0 && <div className="h-full rounded-r bg-brand" style={{ width: `${(add / maxLoad) * 100}%` }} />}
                                        </div>
                                        <span className="text-right font-semibold text-ink">{now + add}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                    <Card title="ทีมที่รับผิดชอบ" hint="ไม่บังคับ · เลือกแล้วสมาชิกทีมขึ้นก่อนในรายชื่อ">
                        <div className="flex flex-wrap gap-2">
                            {[{ id: null, name: "ไม่ระบุทีม" }, ...store.teams.filter((t) => t.dept === user.dept)].map((t) => (
                                <button key={t.id ?? 0} onClick={() => setTeamId(t.id)}
                                    className={cn("rounded-full border px-3.5 py-1.5 text-xs", teamId === t.id ? "border-brand bg-brand-soft font-semibold text-brand-strong" : "border-line bg-white text-ink-2 hover:bg-page")}>
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    )
}
