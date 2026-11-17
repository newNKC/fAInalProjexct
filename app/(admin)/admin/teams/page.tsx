'use client'

import { useState } from "react";
import { Pencil1, Plus, Trash1 } from "@tailgrids/icons";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Dialog, DialogBody, DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Input } from "@/components/tailgrids/core/input";
import { Backdrop } from "@/components/tailgrids/core/overlay";
import PageHeader from "@/components/page-header";
import type { Team } from "@/data/teams";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

const checkboxClass = "[&>div]:border-2 [&>div]:border-[#64748B]"
const fieldClass = "w-full rounded-lg border border-base-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20"

export default function Page() {
    const store = useStore();
    const [editing, setEditing] = useState<(Omit<Team, "id"> & { id?: number }) | null>(null);

    const deptMembers = store.users.filter((u) => u.dept === editing?.dept);
    const canSave = !!editing?.name.trim();

    const toggleMember = (id: number, checked: boolean) => setEditing((t) => t && ({
        ...t, memberIds: checked ? [...t.memberIds, id] : t.memberIds.filter((m) => m !== id),
    }));

    return (
        <>
            <PageHeader title="ทีม" actions={
                <Button size="sm" onPress={() => setEditing({ name: "", dept: store.depts[0], memberIds: [], restrictVisibility: false })}><Plus />เพิ่มทีม</Button>
            } />

            <div className="grid grid-cols-2 gap-4">
                {store.teams.map((t) => (
                    <section key={t.id} className="rounded-xl bg-white p-5 ring-1 ring-line">
                        <div className="mb-3 flex items-start gap-2">
                            <div className="flex-1">
                                <h2 className="font-semibold text-ink">{t.name}</h2>
                                <p className="text-xs text-ink-3">{t.dept}{t.restrictVisibility && " · เห็นคำขอเฉพาะสมาชิก"}</p>
                            </div>
                            <button aria-label={`แก้ไข ${t.name}`} className={cn(buttonStyles({ variant: "ghost", size: "xs" }), "text-brand [&>svg]:size-4")} onClick={() => setEditing(t)}><Pencil1 /></button>
                            <button aria-label={`ลบ ${t.name}`} className={cn(buttonStyles({ variant: "ghost", size: "xs" }), "text-[#BE123C] [&>svg]:size-4")} onClick={() => store.removeTeam(t.id)}><Trash1 /></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {t.memberIds.length === 0 && <span className="text-xs text-ink-3">ยังไม่มีสมาชิก</span>}
                            {t.memberIds.map((id) => (
                                <span key={id} className="rounded-full bg-page px-3 py-1 text-xs text-ink-2">{store.userById(id)?.name}</span>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <Backdrop isOpen={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
                <Dialog>
                    <DialogHeader><DialogTitle>{editing?.id ? "แก้ไขทีม" : "เพิ่มทีม"}</DialogTitle></DialogHeader>
                    <DialogBody className="flex flex-col gap-3">
                        <label htmlFor="team-name" className="text-sm font-medium text-ink">ชื่อทีม</label>
                        <Input id="team-name" className="w-full text-sm" value={editing?.name ?? ""} onChange={(e) => setEditing((t) => t && ({ ...t, name: e.target.value }))} />
                        <label htmlFor="team-dept" className="text-sm font-medium text-ink">แผนก</label>
                        <select id="team-dept" className={fieldClass} value={editing?.dept} onChange={(e) => setEditing((t) => t && ({ ...t, dept: e.target.value, memberIds: [] }))}>
                            {store.depts.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <span className="text-sm font-medium text-ink">สมาชิก</span>
                        <div className="flex flex-col gap-2">
                            {deptMembers.map((u) => (
                                <div key={u.id} className="flex items-center gap-2.5 text-sm">
                                    <Checkbox id={`m-${u.id}`} className={checkboxClass} checked={editing?.memberIds.includes(u.id)} onChange={(e) => toggleMember(u.id, e.target.checked)} />
                                    <label htmlFor={`m-${u.id}`} className="cursor-pointer text-ink">{u.name} <span className="text-ink-3">· {u.position}</span></label>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2.5 border-t border-line pt-3 text-sm">
                            <Checkbox id="restrict" className={checkboxClass} checked={editing?.restrictVisibility} onChange={(e) => setEditing((t) => t && ({ ...t, restrictVisibility: e.target.checked }))} />
                            <label htmlFor="restrict" className="cursor-pointer text-ink">ให้เห็นคำขอของทีมเฉพาะสมาชิก</label>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <DialogClose appearance="outline">ยกเลิก</DialogClose>
                        <DialogClose disabled={!canSave} onPress={() => editing && store.saveTeam({ ...editing, name: editing.name.trim() })}>บันทึก</DialogClose>
                    </DialogFooter>
                </Dialog>
            </Backdrop>
        </>
    )
}
