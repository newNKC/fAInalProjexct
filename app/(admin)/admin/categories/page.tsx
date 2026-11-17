'use client'

import { useState } from "react";
import { Pencil1, Plus, Trash1 } from "@tailgrids/icons";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { Dialog, DialogBody, DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Input } from "@/components/tailgrids/core/input";
import { Backdrop } from "@/components/tailgrids/core/overlay";
import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/tailgrids/core/table";
import PageHeader from "@/components/page-header";
import type { Category } from "@/data/categories";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

// สีให้เลือก (ชุดเดียวกับสีโรล)
const colors = ["#4F46E5", "#2563EB", "#7C3AED", "#D97706", "#059669", "#E11D48", "#475569"];

export default function Page() {
    const store = useStore();

    // states
    const [editing, setEditing] = useState<Partial<Category> | null>(null);   // null = ปิด dialog, ไม่มี id = เพิ่มใหม่
    const [deleting, setDeleting] = useState<Category | null>(null);

    const used = (id: number) => store.requests.filter((r) => r.categoryId === id).length;
    const nameTaken = !!editing?.name?.trim() && store.categories.some((c) => c.name === editing.name?.trim() && c.id !== editing.id);
    const canSave = !!editing?.name?.trim() && !nameTaken;

    return (
        <>
            <PageHeader title="หมวดคำขอ" actions={
                <Button size="sm" onPress={() => setEditing({ name: "", color: colors[0] })}><Plus />เพิ่มหมวด</Button>
            } />

            <TableRoot className="w-full bg-white text-sm">
                <TableHeader>
                    <TableRow className="bg-page">
                        <TableHead>หมวด</TableHead>
                        <TableHead>จำนวนคำขอ</TableHead>
                        <TableHead />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {store.categories.map((c) => (
                        <TableRow key={c.id}>
                            <TableCell>
                                <span className="inline-flex items-center gap-2 font-medium text-ink">
                                    <span className="size-3 rounded-full" style={{ background: c.color }} />{c.name}
                                </span>
                            </TableCell>
                            <TableCell className="font-normal text-ink-2">{used(c.id)}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <button className={cn(buttonStyles({ variant: "ghost", size: "xs" }), "text-brand hover:bg-brand-soft [&>svg]:size-4")} onClick={() => setEditing(c)}>
                                        <Pencil1 />แก้ไข
                                    </button>
                                    <button className={cn(buttonStyles({ variant: "ghost", size: "xs" }), "text-[#BE123C] hover:bg-[#FFE4E6] [&>svg]:size-4")} onClick={() => setDeleting(c)}>
                                        <Trash1 />ลบ
                                    </button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </TableRoot>

            {/* add / edit dialog */}
            <Backdrop isOpen={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
                <Dialog>
                    <DialogHeader><DialogTitle>{editing?.id ? "แก้ไขหมวด" : "เพิ่มหมวด"}</DialogTitle></DialogHeader>
                    <DialogBody className="flex flex-col gap-3">
                        <label htmlFor="cat-name" className="text-sm font-medium text-ink">ชื่อหมวด</label>
                        <Input id="cat-name" className="w-full text-sm" value={editing?.name ?? ""} onChange={(e) => setEditing((c) => ({ ...c, name: e.target.value }))} />
                        {nameTaken && <p className="text-sm text-red-600">มีหมวดชื่อนี้แล้ว</p>}
                        <span className="text-sm font-medium text-ink">สี</span>
                        <div className="flex gap-2">
                            {colors.map((col) => (
                                <button key={col} aria-label={`สี ${col}`} onClick={() => setEditing((c) => ({ ...c, color: col }))}
                                    className={cn("size-8 rounded-full ring-offset-2", editing?.color === col && "ring-2 ring-ink")} style={{ background: col }} />
                            ))}
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <DialogClose appearance="outline">ยกเลิก</DialogClose>
                        <DialogClose disabled={!canSave} onPress={() => editing && store.saveCategory({ id: editing.id, name: editing.name!.trim(), color: editing.color ?? colors[0] })}>บันทึก</DialogClose>
                    </DialogFooter>
                </Dialog>
            </Backdrop>

            {/* delete confirm */}
            <Backdrop isOpen={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
                <Dialog>
                    <DialogHeader><DialogTitle>ลบหมวด “{deleting?.name}”?</DialogTitle></DialogHeader>
                    <DialogBody className="text-sm text-ink-2">
                        {deleting && used(deleting.id) > 0
                            ? `หมวดนี้มีคำขอ ${used(deleting.id)} รายการ จึงลบไม่ได้ ให้แก้ชื่อหมวดแทน`
                            : "ลบแล้วกู้คืนไม่ได้"}
                    </DialogBody>
                    <DialogFooter>
                        <DialogClose appearance="outline">ยกเลิก</DialogClose>
                        <DialogClose variant="danger" disabled={!deleting || used(deleting.id) > 0} onPress={() => deleting && store.removeCategory(deleting.id)}>ลบ</DialogClose>
                    </DialogFooter>
                </Dialog>
            </Backdrop>
        </>
    )
}
