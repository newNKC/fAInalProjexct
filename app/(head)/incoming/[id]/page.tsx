'use client'

import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle1, Plus, Trash1, XmarkCircle } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import ReasonDialog from "@/components/reason-dialog";
import RequestDetail, { NotFound } from "@/components/request-detail";
import RoleBadge from "@/components/role-badge";
import { findHead, thaiDate } from "@/data/requests";
import { useStore } from "@/data/store";

const fieldClass = "rounded-lg border border-base-300 bg-white px-3 py-2 text-sm outline-none focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20"

export default function Page() {
    const store = useStore();
    const { id } = useParams<{ id: string }>();
    const me = store.user;

    // dialogs
    const [rejectOpen, setRejectOpen] = useState(false);
    const [forwardOpen, setForwardOpen] = useState(false);
    const [forwardDept, setForwardDept] = useState("");

    // ฟอร์มเพิ่มงาน
    const [title, setTitle] = useState("");
    const [assigneeId, setAssigneeId] = useState(0);
    const [dueDate, setDueDate] = useState("");
    const [parentId, setParentId] = useState(0);     // 0 = งานหลัก
    const [error, setError] = useState("");

    const r = store.requests.find((x) => x.id === Number(id) && x.targetDept === me?.dept);
    if (!r || !me) return <NotFound backHref="/incoming" />;

    const canPlan = ["pending_target", "in_progress"].includes(r.status);
    const mains = store.tasks.filter((t) => t.requestId === r.id && t.parentId === null);

    // คนในแผนกที่รับงานได้ + จำนวนงานที่ยังไม่เสร็จ (ภาระงาน)
    const members = store.users.filter((u) => u.dept === me.dept && (u.roles.includes("assignee") || u.roles.includes("head")));
    const openTasks = (userId: number) => store.tasks.filter((t) => t.assigneeId === userId && t.progress < 100
        && !store.tasks.some((s) => s.parentId === t.id)
        && ["pending_target", "in_progress"].includes(store.requests.find((x) => x.id === t.requestId)?.status ?? "")).length;

    const addTask = () => {
        if (!title.trim() || !assigneeId || !dueDate) {
            setError("กรอกชื่องาน เลือกผู้รับผิดชอบ และกำหนดส่งให้ครบ");
            return;
        }
        store.addTask({ requestId: r.id, parentId: parentId || null, title: title.trim(), assigneeId, dueDate });
        setTitle(""); setError("");
    }

    const otherDepts = store.depts.filter((d) => d !== me.dept);

    return (
        <>
            <RequestDetail request={r} backHref="/incoming" backLabel="คำขอเข้าแผนก" actions={r.status === "pending_target" && <>
                <Button size="sm" variant="danger" appearance="outline" onPress={() => setRejectOpen(true)}><XmarkCircle />ปฏิเสธ</Button>
                <Button size="sm" appearance="outline" onPress={() => { setForwardDept(otherDepts[0] ?? ""); setForwardOpen(true); }}><ArrowRight />ส่งต่อแผนกอื่น</Button>
                <Button size="sm" disabled={mains.length === 0} onPress={() => store.acceptRequest(r.id)}><CheckCircle1 />รับงานและเริ่มดำเนินการ</Button>
            </>}>
                {/* วางแผนงาน */}
                {canPlan && (
                    <section className="rounded-xl bg-white p-5 ring-1 ring-line">
                        <h2 className="mb-1 font-semibold text-ink">วางแผนงาน</h2>
                        <p className="mb-4 text-xs text-ink-3">
                            {r.status === "pending_target" ? "เพิ่มงานอย่างน้อย 1 งาน แล้วกด “รับงานและเริ่มดำเนินการ”" : "เพิ่มหรือลบงานได้ระหว่างดำเนินการ"}
                        </p>

                        {/* รายการงานที่ลบได้ */}
                        <div className="mb-4 flex flex-col gap-1.5">
                            {mains.map((m) => (
                                <div key={m.id}>
                                    <TaskRow title={m.title} who={store.userById(m.assigneeId)?.name} due={m.dueDate} onRemove={() => store.removeTask(m.id)} />
                                    {store.tasks.filter((t) => t.parentId === m.id).map((s) => (
                                        <div key={s.id} className="ml-6">
                                            <TaskRow title={s.title} who={store.userById(s.assigneeId)?.name} due={s.dueDate} onRemove={() => store.removeTask(s.id)} />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* ฟอร์มเพิ่มงาน */}
                        <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-end gap-2 rounded-lg bg-page p-3">
                            <div className="col-span-4 flex items-center gap-2 text-sm">
                                <span className="text-ink-2">เพิ่มเป็น</span>
                                <select aria-label="ระดับงาน" className={fieldClass} value={parentId} onChange={(e) => setParentId(Number(e.target.value))}>
                                    <option value={0}>งานหลัก</option>
                                    {mains.map((m) => <option key={m.id} value={m.id}>งานย่อยของ “{m.title}”</option>)}
                                </select>
                            </div>
                            <Input aria-label="ชื่องาน" className="w-full py-2 text-sm" placeholder="ชื่องาน" value={title} onChange={(e) => setTitle(e.target.value)} />
                            <select aria-label="ผู้รับผิดชอบ" className={fieldClass} value={assigneeId} onChange={(e) => setAssigneeId(Number(e.target.value))}>
                                <option value={0}>เลือกผู้รับผิดชอบ</option>
                                {members.map((u) => <option key={u.id} value={u.id}>{u.name} · ค้าง {openTasks(u.id)} งาน</option>)}
                            </select>
                            <input aria-label="กำหนดส่ง" type="date" className={fieldClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                            <Button size="sm" onPress={addTask}><Plus />เพิ่ม</Button>
                        </div>
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                        {/* ภาระงานทีม */}
                        <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold text-ink-2">ภาระงานทีมตอนนี้</p>
                            <div className="flex flex-wrap gap-2">
                                {members.map((u) => (
                                    <span key={u.id} className="inline-flex items-center gap-2 rounded-lg bg-page px-3 py-1.5 text-xs text-ink-2">
                                        {u.name} <RoleBadge role={u.roles.includes("assignee") ? "assignee" : "head"} /> <b className="text-ink">{openTasks(u.id)}</b> งานค้าง
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </RequestDetail>

            <ReasonDialog open={rejectOpen} onClose={() => setRejectOpen(false)} title={`ปฏิเสธ ${r.code}`} confirmLabel="ปฏิเสธคำขอ" danger
                onConfirm={(reason) => { store.rejectRequest(r.id, reason); setRejectOpen(false); }} />

            <ReasonDialog open={forwardOpen} onClose={() => setForwardOpen(false)} title={`ส่งต่อ ${r.code}`} confirmLabel="ส่งต่อ"
                canConfirm={!!forwardDept}
                onConfirm={(reason) => { store.forwardRequest(r.id, forwardDept, reason); setForwardOpen(false); }}>
                <label htmlFor="forward-dept" className="text-sm font-medium text-ink">ส่งต่อไปแผนก</label>
                <select id="forward-dept" className={fieldClass} value={forwardDept} onChange={(e) => setForwardDept(e.target.value)}>
                    {otherDepts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {forwardDept && !findHead(store.users, forwardDept) && (
                    <p className="text-xs text-[#B45309]">แผนกนี้ยังไม่มีหัวหน้าแผนกในระบบ คำขอจะรออยู่จนกว่าผู้ดูแลระบบจะกำหนดโรลให้</p>
                )}
            </ReasonDialog>
        </>
    )
}

function TaskRow({ title, who, due, onRemove }: { title: string, who?: string, due: string, onRemove: () => void }) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
            <span className="flex-1 text-ink">{title}</span>
            <span className="text-xs text-ink-3">{who} · ส่ง {thaiDate(due)}</span>
            <button aria-label={`ลบงาน ${title}`} onClick={onRemove} className="text-ink-3 hover:text-red-600"><Trash1 className="size-4" /></button>
        </div>
    )
}
