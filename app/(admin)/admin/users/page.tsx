'use client'

import { useState } from "react";
import { Locked3, Pencil1, Reload, Search1 } from "@tailgrids/icons";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Dialog, DialogBody, DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Input } from "@/components/tailgrids/core/input";
import { Backdrop } from "@/components/tailgrids/core/overlay";
import PageHeader from "@/components/page-header";
import RoleBadge from "@/components/role-badge";
import SortTable from "@/components/sort-table";
import { useStore } from "@/data/store";
import { allRoles, type Role, type User } from "@/data/users";
import { cn } from "@/utils/cn";


export default function Page() {
    // ข้อมูลกลาง (โรลที่แก้จะมีผลกับการเข้าสู่ระบบและเมนูของคนนั้นทันที)
    const store = useStore();
    const users = store.users;
    const depts = ["ทุกแผนก", ...store.depts];

    // states
    const [search, setSearch] = useState("");
    const [dept, setDept] = useState("ทุกแผนก");
    const [editing, setEditing] = useState<User | null>(null);   // คนที่กำลังแก้โรล (null = ปิด dialog)
    const [draftRoles, setDraftRoles] = useState<Role[]>([]);    // โรลที่ติ๊กอยู่ใน dialog

    // กรองตามแผนก + คำค้นหา
    const shown = users.filter((u) =>
        (dept === "ทุกแผนก" || u.dept === dept) &&
        (u.name.includes(search) || u.email.includes(search.toLowerCase()))
    );

    // เปิด dialog
    const openEdit = (user: User) => {
        setEditing(user);
        setDraftRoles(user.roles);
    }

    // ติ๊ก / เอาติ๊กออก 1 โรล
    const toggleRole = (role: Role, checked: boolean) => {
        setDraftRoles((current) => checked ? [...current, role] : current.filter((r) => r !== role));
    }

    // บันทึก: แทนโรลของคนนั้นด้วยโรลที่ติ๊ก
    const saveRoles = () => {
        if (!editing) return;
        store.setUserRoles(editing.id, allRoles.filter((r) => draftRoles.includes(r)));
        store.showToast(`บันทึกโรลของ ${editing.name} แล้ว`);
    }

    return (
        <>
            <PageHeader title="จัดการผู้ใช้" />

            {/* toolbar */}
            <div className="mb-4 flex items-center gap-3">
                <div className="relative w-80">
                    <Search1 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
                    <Input className="w-full py-2 pl-9 text-sm" placeholder="ค้นหาชื่อหรืออีเมล" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                {depts.map((d) => (
                    <button key={d} onClick={() => setDept(d)}
                        className={cn(
                            "rounded-full border px-3.5 py-1.5 text-xs",
                            dept === d ? "border-brand bg-brand-soft font-semibold text-brand-strong" : "border-line bg-white text-ink-2 hover:bg-page"
                        )}>
                        {d}
                    </button>
                ))}
                <div className="flex-1" />
                <Button size="sm" appearance="outline" onPress={() => { store.syncHR(); store.showToast("ซิงก์ข้อมูล HR แล้ว · โรลที่ตั้งไว้ยังอยู่ครบ"); }}><Reload />ซิงก์ข้อมูล HR</Button>
            </div>

            {/* warning banner */}
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#FEF3C7] px-4 py-3 text-sm font-medium text-[#B45309]">
                <Locked3 className="size-5 shrink-0" />
                ชื่อ แผนก และตำแหน่งดึงจากฐานข้อมูล HR (จำลอง) แก้ในระบบนี้ไม่ได้ · ผู้ดูแลระบบแก้ได้เฉพาะโรลในระบบ
            </div>

            {/* table (กดหัวคอลัมน์เพื่อเรียง) */}
            <SortTable rows={shown} rowKey={(u) => u.id} initialSort={{ key: "name", dir: "asc" }} empty="ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข" columns={[
                {
                    key: "name", label: "ผู้ใช้", sortValue: (u) => u.name, render: (u) => (
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">{u.name.slice(0, 1)}</span>
                            <div>
                                <p className="font-medium text-ink">{u.name}</p>
                                <p className="text-xs font-normal text-ink-3">{u.email}</p>
                            </div>
                        </div>
                    ),
                },
                { key: "dept", label: "แผนก (HR)", sortValue: (u) => u.dept, render: (u) => <span className="font-normal text-ink-2">{u.dept}</span> },
                {
                    key: "position", label: "ตำแหน่ง (HR)", sortValue: (u) => u.position, render: (u) => (
                        <span className="flex items-center gap-1.5 font-normal text-ink-2"><Locked3 className="size-3.5 text-ink-3" />{u.position}</span>
                    ),
                },
                {
                    key: "roles", label: "โรลในระบบ", sortValue: (u) => allRoles.findIndex((r) => u.roles.includes(r)), render: (u) => (
                        <div className="flex flex-wrap gap-1">{u.roles.map((r) => <RoleBadge key={r} role={r} />)}</div>
                    ),
                },
                {
                    key: "edit", label: "", className: "text-right", render: (u) => (
                        <button className={cn(buttonStyles({ variant: "ghost", size: "xs" }), "ml-auto text-brand hover:bg-brand-soft hover:text-brand-strong [&>svg]:size-4")}
                            onClick={() => openEdit(u)}>
                            <Pencil1 />แก้โรล
                        </button>
                    ),
                },
            ]} />

            {/* edit roles dialog */}
            <Backdrop isOpen={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
                <Dialog>
                    <DialogHeader>
                        <DialogTitle>แก้ไขโรล: {editing?.name}</DialogTitle>
                    </DialogHeader>
                    <DialogBody className="flex flex-col gap-4">
                        {/* HR info (read only) */}
                        <div className="flex gap-6 rounded-lg bg-page p-3 text-sm">
                            <div><p className="text-xs text-ink-3">แผนก (HR)</p><p className="font-medium text-ink">{editing?.dept}</p></div>
                            <div><p className="text-xs text-ink-3">ตำแหน่ง (HR)</p><p className="font-medium text-ink">{editing?.position}</p></div>
                        </div>

                        {/* role checkboxes */}
                        <div className="flex flex-col gap-2.5">
                            {allRoles.map((r) => (
                                <div key={r} className="flex items-center gap-2.5">
                                    <Checkbox id={`role-${r}`} checked={draftRoles.includes(r)} onChange={(e) => toggleRole(r, e.target.checked)} />
                                    <label htmlFor={`role-${r}`} className="cursor-pointer"><RoleBadge role={r} /></label>
                                </div>
                            ))}
                        </div>

                        {draftRoles.length === 0 && <p className="text-sm text-red-600">ต้องมีอย่างน้อย 1 โรล</p>}
                    </DialogBody>
                    <DialogFooter>
                        <DialogClose appearance="outline">ยกเลิก</DialogClose>
                        <DialogClose disabled={draftRoles.length === 0} onClick={saveRoles}>บันทึก</DialogClose>
                    </DialogFooter>
                </Dialog>
            </Backdrop>
        </>
    )
}