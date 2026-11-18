'use client'

// รับงานและแบ่งงาน (งานของนพรัตน์ เดิม incoming/incomingView/page.tsx)
// ปรับให้ใช้ข้อมูลจริง + เติมส่วนที่ขาด:
//  - งานหลัก/งานย่อยแก้ชื่อได้ (ค่าเริ่มต้นเป็นแม่แบบ วางแผน → พัฒนา → ทดสอบ ของเดิม) เพิ่ม/ลบได้
//  - ผู้รับผิดชอบเลือกจากคนในแผนก · ภาระงานคำนวณจากงานจริง · ทีมจาก store
//  - กดยืนยันแล้วบันทึกแผนงานจริง (คำขอเปลี่ยนเป็นกำลังดำเนินการ ผู้รับงานเห็นงานในหน้า "งานของฉัน")
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, Check, CheckCircle1, Eye, Layers2, Plus, Trash1 } from "@tailgrids/icons";
import { Button, Card, Field, PageHeader, Progress } from "@/components/request-ui/RequestUI";
import RequestSummaryCard from "@/components/request-ui/RequestSummaryCard";
import {
  Combobox, ComboboxContent, ComboboxInput, ComboboxInputWrapper, ComboboxItem, ComboboxList, ComboboxTrigger,
} from "@/components/tailgrids/core/combobox";
import { NoAccess } from "@/components/role-shell";
import { useLeaveGuard } from "@/components/use-leave-guard";
import { isLeafTask, nick, taskProgress, thaiDate, todayISO } from "@/data/requests";
import { useStore, type PlanDraft } from "@/data/store";

// แม่แบบงานหลักและงานย่อย (ของเดิม) · หัวหน้าแก้ไข/เพิ่ม/ลบได้
const TASK_GROUPS = [
  { title: "วางแผน", subtasks: ["รวบรวมความต้องการและกำหนดขอบเขตงาน", "จัดทำแผนการดำเนินงานและกำหนดระยะเวลา"] },
  { title: "พัฒนา", subtasks: ["พัฒนางานตามแผนที่กำหนด", "ตรวจสอบและปรับปรุงผลงาน"] },
  { title: "ทดสอบ", subtasks: ["ทดสอบการทำงานและตรวจสอบผลลัพธ์"] },
];

export default function IncomingViewPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const user = store.user!;
  const request = store.requests.find((r) => r.id === Number(id));

  const [plan, setPlan] = useState<PlanDraft>(() =>
    TASK_GROUPS.map((g) => ({ title: g.title, subs: g.subtasks.map((t) => ({ title: t, assigneeId: 0, dueDate: request?.dueDate ?? "" })) })));
  const [teamId, setTeamId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useLeaveGuard(!saved && plan.some((m) => m.subs.some((s) => s.assigneeId)));

  if (!request || request.targetDept !== user.dept || (request.status !== "pending_target" && !saved)) {
    return <NoAccess text="คำขอนี้ไม่ได้รอแผนกของคุณรับงาน" />;
  }

  const team = store.teams.find((t) => t.id === teamId);
  // คนที่มอบหมายงานได้ = คนในแผนกที่เป็นผู้รับงานหรือหัวหน้า (สมาชิกทีมที่เลือกขึ้นก่อน)
  const people = store.users
    .filter((u) => u.dept === user.dept && (u.roles.includes("assignee") || u.roles.includes("head")))
    .sort((a, b) => Number(team?.memberIds.includes(b.id) ?? 0) - Number(team?.memberIds.includes(a.id) ?? 0));
  const openTasks = (uid: number) => store.tasks.filter((t) => t.assigneeId === uid && t.progress < 100 && isLeafTask(t, store.tasks)
    && store.requests.find((r) => r.id === t.requestId)?.status === "in_progress");
  const workload = people.map((p) => {
    const tasks = openTasks(p.id);
    const planned = plan.flatMap((m) => m.subs).filter((s) => s.assigneeId === p.id).length;
    const avg = tasks.length ? Math.round(tasks.reduce((s, t) => s + taskProgress(t, store.tasks), 0) / tasks.length) : 0;
    return { id: p.id, name: p.name, tasks: tasks.length, planned, progress: avg };
  });

  const setMain = (i: number, title: string) => setPlan((p) => p.map((m, j) => j === i ? { ...m, title } : m));
  const setSub = (i: number, k: number, patch: Partial<PlanDraft[number]["subs"][number]>) =>
    setPlan((p) => p.map((m, j) => j === i ? { ...m, subs: m.subs.map((s, l) => l === k ? { ...s, ...patch } : s) } : m));

  const confirm = () => {
    const clean = plan.filter((m) => m.title.trim() || m.subs.some((s) => s.title.trim()));
    if (clean.length === 0) return setError("ต้องมีงานหลักอย่างน้อย 1 งาน");
    for (const m of clean) {
      if (!m.title.trim()) return setError("ตั้งชื่องานหลักให้ครบทุกงาน");
      if (m.subs.length === 0) return setError(`งานหลัก “${m.title}” ต้องมีงานย่อยอย่างน้อย 1 งาน`);
      if (m.subs.some((s) => !s.title.trim() || !s.assigneeId || !s.dueDate)) return setError(`งานย่อยใน “${m.title}” ต้องมีชื่องาน ผู้รับผิดชอบ และวันกำหนดเสร็จให้ครบ`);
    }
    setSaved(true);
    store.acceptWithPlan(request.id, clean.map((m) => ({ title: m.title.trim(), subs: m.subs.map((s) => ({ ...s, title: s.title.trim() })) })), teamId);
    store.showToast(`รับงาน ${request.code} แล้ว · มอบหมาย ${clean.flatMap((m) => m.subs).length} งานย่อย`);
    router.push("/incoming");
  };

  const approvedLog = store.logs.filter((l) => l.requestId === request.id && l.action === "อนุมัติ").at(-1);
  const approver = store.userById(approvedLog?.actorId ?? request.approverId);

  return (
    <>
      <PageHeader title="รายละเอียดคำขอ" sub={`รับงานและแตกงาน ${request.code}`} back="กลับไปคำขอเข้าแผนก" backHref="/incoming" />
      <RequestSummaryCard r={request} className="h-fit" showDetail footer={
        <p className="mt-4 flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle1 size={14} className="shrink-0" aria-hidden="true" />
          <span>{approver ? <>อนุมัติโดย {nick(approver.name)} ({approver.position}){approvedLog && <> · {thaiDate(approvedLog.createdAt, true)}</>}</> : "ฝ่ายนี้ไม่มีหัวหน้าต้นสังกัด · ส่งตรงถึงแผนก"}</span>
        </p>
      } />

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card className="min-w-0">
          <h2 className="mb-1 font-semibold">แตกงานเป็นงานหลักและงานย่อย</h2>
          <p className="mb-3 text-xs text-slate-500">งานหลักผู้ขอเห็นพร้อม % · งานย่อยเห็นเฉพาะในแผนก</p>
          <div className="space-y-4">
            {plan.map((task, i) => (
              <Card key={i} className="border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex flex-1 items-center gap-2 font-semibold text-slate-800">
                    <Layers2 size={18} className="shrink-0 text-[#4338CA]" aria-hidden="true" />
                    <span className="shrink-0">งานหลัก:</span>
                    <input className="input !py-1.5" aria-label={`ชื่องานหลัก ${i + 1}`} value={task.title} placeholder="ชื่องานหลัก" onChange={(e) => setMain(i, e.target.value)} />
                  </h3>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#4338CA]">
                    <Eye size={16} aria-hidden="true" />
                    ผู้ขอเห็น
                  </span>
                  {plan.length > 1 && (
                    <button type="button" aria-label={`ลบงานหลัก ${task.title}`} onClick={() => setPlan((p) => p.filter((_, j) => j !== i))}>
                      <Trash1 size={16} className="text-slate-400 hover:text-red-600" />
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  {task.subs.map((subtask, k) => (
                    <div key={k} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                      <Field label={`งานย่อย ${k + 1}`}>
                        <input className="input" aria-label={`งานย่อย ${i + 1}.${k + 1}`} value={subtask.title} placeholder="ชื่องานย่อย" onChange={(e) => setSub(i, k, { title: e.target.value })} />
                      </Field>
                      <Field label="ผู้รับผิดชอบงาน">
                        <Combobox aria-label={`ผู้รับผิดชอบ ${i + 1}.${k + 1}`} selectedKey={subtask.assigneeId ? String(subtask.assigneeId) : null}
                          onSelectionChange={(key) => setSub(i, k, { assigneeId: key === null ? 0 : Number(key) })}>
                          <ComboboxInputWrapper>
                            <ComboboxInput placeholder="เลือกผู้รับผิดชอบงาน" />
                            <ComboboxTrigger />
                          </ComboboxInputWrapper>
                          <ComboboxContent>
                            <ComboboxList emptyMessage="ไม่พบสมาชิกในทีม">
                              {people.map((member) => (
                                <ComboboxItem key={member.id} id={String(member.id)} textValue={member.name}>
                                  {member.name}{team?.memberIds.includes(member.id) ? " · ในทีม" : ""}
                                </ComboboxItem>
                              ))}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      </Field>
                      <Field label="กำหนดเสร็จ">
                        <div className="relative">
                          <Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                          <input type="date" className="input pl-10" min={todayISO()} aria-label={`กำหนดเสร็จ งานย่อย ${i + 1}.${k + 1}`}
                            value={subtask.dueDate} onChange={(e) => setSub(i, k, { dueDate: e.target.value })} />
                        </div>
                      </Field>
                      <button type="button" className="self-end pb-3" aria-label={`ลบงานย่อย ${i + 1}.${k + 1}`}
                        onClick={() => setPlan((p) => p.map((m, j) => j === i ? { ...m, subs: m.subs.filter((_, l) => l !== k) } : m))}>
                        <Trash1 size={16} className="text-slate-400 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="mt-2 self-start text-sm"
                  onPress={() => setPlan((p) => p.map((m, j) => j === i ? { ...m, subs: [...m.subs, { title: "", assigneeId: 0, dueDate: request.dueDate }] } : m))}>
                  <Plus size={16} aria-hidden="true" />
                  เพิ่มงานย่อย
                </Button>
              </Card>
            ))}
          </div>
          <Button variant="outline" className="mt-4 self-start gap-4 border border-black text-black"
            onPress={() => setPlan((p) => [...p, { title: "", subs: [{ title: "", assigneeId: 0, dueDate: request.dueDate }] }])}>
            <Plus size={16} aria-hidden="true" />
            เพิ่มงานหลัก
          </Button>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </Card>

        <aside className="space-y-4">
          <Card>
            <h2 className="font-semibold">ภาระงานของทีมตอนนี้</h2>
            <p className="mb-3 text-xs text-slate-500">งานย่อยที่ยังไม่เสร็จ · ความคืบหน้าเฉลี่ย</p>
            <div className="space-y-4">
              {workload.map((member) => (
                <div key={member.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="avatar shrink-0" aria-hidden="true">{member.name.slice(0, 1)}</span>
                      <span className="truncate text-sm font-medium text-slate-800">{member.name}</span>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{member.tasks} งาน{member.planned > 0 && ` (+${member.planned} ใหม่)`}</span>
                  </div>
                  <Progress value={member.progress} />
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold">ทีมที่รับผิดชอบ</h2>
            <p className="mb-2 text-xs text-slate-500">ไม่บังคับ · เลือกแล้วสมาชิกทีมขึ้นก่อนในรายชื่อ</p>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {store.teams.filter((t) => t.dept === user.dept).map((t) => {
                const isSelected = teamId === t.id;
                return (
                  <button type="button" key={t.id} onClick={() => setTeamId(isSelected ? null : t.id)} aria-pressed={isSelected}
                    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${isSelected
                      ? "border-[#4338CA] bg-[#4338CA] text-white hover:bg-[#3730A3]"
                      : "border-[#4338CA] bg-white text-[#4338CA] hover:bg-[#EEF2FF]"}`}>
                    {t.name}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={confirm}
                className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-[#4338CA] px-4 py-2.5 font-medium text-white transition hover:bg-[#3730A3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]">
                <Check size={18} aria-hidden="true" />
                ยืนยันรับงานและมอบหมาย
              </button>
              <Link href="/incoming"
                className="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-black bg-white px-4 py-2.5 font-medium text-black transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
                ยกเลิก
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
