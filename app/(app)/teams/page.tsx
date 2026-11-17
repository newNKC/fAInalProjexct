'use client'

import { useState } from "react";
import { InfoCircle, Plus, Trash1, Xmark } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Input } from "@/components/tailgrids/core/input";
import Banner from "@/components/banner";
import PageHeader from "@/components/page-header";
import { Card } from "@/components/request-parts";
import { fieldClass } from "@/components/request-form";
import { Guard } from "@/components/role-shell";
import SortSelect, { sortBy, type SortOption } from "@/components/sort-select";
import { nick } from "@/data/requests";
import { useStore } from "@/data/store";
import type { Team } from "@/data/teams";
import { cn } from "@/utils/cn";

// ทีม (ฟีเจอร์เสริม) · หัวหน้าแผนกจัดการทีมในแผนกตัวเอง · ผู้ดูแลระบบจัดการได้ทุกแผนก
export default function Page() {
    return <Guard roles={["head", "admin"]} perm="teams"><Teams /></Guard>
}

function Teams() {
    const store = useStore();
    const user = store.user!;
    const isAdmin = user.roles.includes("admin");
    const [sort, setSort] = useState("name");
    const [name, setName] = useState("");
    const [dept, setDept] = useState(user.dept);
    const [leadId, setLeadId] = useState(0);
    const [adding, setAdding] = useState<Record<number, number>>({});

    const teams = store.teams.filter((t) => isAdmin || t.dept === user.dept);
    const staff = (d: string) => store.users.filter((u) => u.dept === d);
    const teamCount = (uid: number) => store.teams.filter((t) => t.memberIds.includes(uid)).length;
    const usedBy = (t: Team) => store.requests.filter((r) => r.teamId === t.id).length;

    const options: SortOption<Team>[] = [
        { key: "name", label: "ชื่อทีม", value: (t) => t.name },
        { key: "dept", label: "แผนก", value: (t) => t.dept },
        { key: "size", label: "สมาชิกมากสุด", value: (t) => t.memberIds.length, dir: "desc" },
        { key: "lead", label: "หัวหน้าทีม", value: (t) => nick(store.userById(t.leadId)?.name) },
    ];

    const create = () => {
        if (!name.trim() || !leadId) return;
        store.saveTeam({ name: name.trim(), dept, leadId, memberIds: [leadId] });
        store.showToast(`สร้างทีม “${name.trim()}” แล้ว`);
        setName(""); setLeadId(0);
    }

    return (
        <>
            <PageHeader title="ทีม" />
            <Banner tone="info" icon={<InfoCircle />} className="mb-4" action={
                <label className="flex items-center gap-2 text-sm font-semibold">
                    <Checkbox checked={store.restrictByTeam} onChange={(e) => { store.setRestrictByTeam(e.target.checked); store.showToast(e.target.checked ? "เปิดจำกัดการมองเห็นตามทีมแล้ว" : "ปิดจำกัดการมองเห็นตามทีมแล้ว"); }} />
                    จำกัดการมองเห็นตามทีม
                </label>
            }>
                ทีมย่อยเป็นฟีเจอร์เสริม · คนหนึ่งอยู่ได้หลายทีม · เปิดจำกัดการมองเห็นแล้ว ผู้รับงานจะเห็นเฉพาะคำขอของทีมตัวเอง
            </Banner>

            <div className="grid grid-cols-[1fr_20rem] items-start gap-6">
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink">ทีมทั้งหมด ({teams.length})</p>
                        <SortSelect options={options} value={sort} onChange={setSort} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {teams.length === 0 && <p className="col-span-2 rounded-xl bg-white p-10 text-center text-sm text-ink-3 ring-1 ring-line">ยังไม่มีทีม</p>}
                        {sortBy(teams, options, sort).map((t) => {
                            const candidates = staff(t.dept).filter((u) => !t.memberIds.includes(u.id));
                            return (
                                <Card key={t.id} title={t.name} hint={`${t.dept} · หัวหน้าทีม: ${nick(store.userById(t.leadId)?.name)} · ใช้กับ ${usedBy(t)} คำขอ`}
                                    action={<button aria-label={`ลบทีม ${t.name}`} onClick={() => { store.removeTeam(t.id); store.showToast(`ลบทีม “${t.name}” แล้ว`); }}><Trash1 className="size-4 text-ink-3 hover:text-red-600" /></button>}>
                                    <ul className="flex flex-col gap-2">
                                        {t.memberIds.map((uid) => {
                                            const u = store.userById(uid);
                                            return (
                                                <li key={uid} className="flex items-center gap-2.5 text-sm">
                                                    <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">{u?.name.slice(0, 1)}</span>
                                                    <span className="flex-1 text-ink">{nick(u?.name)} <span className="text-xs text-ink-3">· {u?.position}</span></span>
                                                    {uid === t.leadId && <span className="rounded-md bg-[#FEF3C7] px-1.5 text-[11px] font-semibold text-[#92400E]">หัวหน้าทีม</span>}
                                                    {teamCount(uid) > 1 && <span className="rounded-md bg-page px-1.5 text-[11px] text-ink-2">อยู่ {teamCount(uid)} ทีม</span>}
                                                    {uid !== t.leadId && (
                                                        <button aria-label={`เอา ${nick(u?.name)} ออกจากทีม`} onClick={() => store.saveTeam({ ...t, memberIds: t.memberIds.filter((x) => x !== uid) })}>
                                                            <Xmark className="size-4 text-ink-3 hover:text-red-600" />
                                                        </button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {candidates.length > 0 && (
                                        <div className="mt-3 flex gap-2">
                                            <select aria-label={`เพิ่มสมาชิก ${t.name}`} className={cn(fieldClass, "py-1.5")} value={adding[t.id] ?? 0} onChange={(e) => setAdding((a) => ({ ...a, [t.id]: Number(e.target.value) }))}>
                                                <option value={0}>เลือกคนในแผนก</option>
                                                {candidates.map((u) => <option key={u.id} value={u.id}>{nick(u.name)} · {u.position}</option>)}
                                            </select>
                                            <Button size="sm" appearance="outline" disabled={!adding[t.id]} onPress={() => {
                                                store.saveTeam({ ...t, memberIds: [...t.memberIds, adding[t.id]] });
                                                setAdding((a) => ({ ...a, [t.id]: 0 }));
                                            }}><Plus />เพิ่มสมาชิก</Button>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>

                <Card title="สร้างทีมใหม่">
                    <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">ชื่อทีม *
                            <Input aria-label="ชื่อทีม" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ทีมรายงาน" />
                        </label>
                        {isAdmin && (
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">แผนก
                                <select aria-label="แผนกของทีม" className={fieldClass} value={dept} onChange={(e) => { setDept(e.target.value); setLeadId(0); }}>
                                    {store.depts.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </label>
                        )}
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">หัวหน้าทีม *
                            <select aria-label="หัวหน้าทีม" className={fieldClass} value={leadId} onChange={(e) => setLeadId(Number(e.target.value))}>
                                <option value={0}>เลือกหัวหน้าทีม</option>
                                {staff(dept).map((u) => <option key={u.id} value={u.id}>{nick(u.name)} · {u.position}</option>)}
                            </select>
                        </label>
                        <Button size="sm" disabled={!name.trim() || !leadId} onPress={create}><Plus />สร้างทีมใหม่</Button>
                    </div>
                </Card>
            </div>
        </>
    )
}
