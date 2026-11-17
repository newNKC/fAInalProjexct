'use client'

import { useState, type FormEvent } from "react";
import { InfoCircle, Pencil1, Plus, Trash1 } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Input } from "@/components/tailgrids/core/input";
import Banner from "@/components/banner";
import ConfirmDialog from "@/components/confirm-dialog";
import CategoryBadge from "@/components/category-badge";
import PageHeader from "@/components/page-header";
import { Card } from "@/components/request-parts";
import { fieldClass } from "@/components/request-form";
import SortSelect, { sortBy, type SortOption } from "@/components/sort-select";
import type { Category } from "@/data/categories";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

const COLORS = ["#4F46E5", "#0284C7", "#E11D48", "#D97706", "#059669", "#7C3AED", "#DB2777", "#475569"];
type Draft = { id?: number, name: string, description: string, color: string, active: boolean }
const blank: Draft = { name: "", description: "", color: COLORS[0], active: true };

// หมวดคำขอ (ผู้ดูแลระบบ) · ลบได้เฉพาะหมวดที่ยังไม่มีคำขอ · ปิดใช้งานแล้วจะไม่โผล่ในแบบฟอร์มส่งคำขอ
export default function Page() {
    const store = useStore();
    const [draft, setDraft] = useState<Draft>(blank);
    const [sort, setSort] = useState("name");
    const [toDelete, setToDelete] = useState<Category | null>(null);
    const used = (c: Category) => store.requests.filter((r) => r.categoryId === c.id).length;

    const options: SortOption<Category>[] = [
        { key: "name", label: "ชื่อหมวด", value: (c) => c.name },
        { key: "used", label: "ใช้มากสุด", value: (c) => used(c), dir: "desc" },
        { key: "active", label: "เปิดใช้งานก่อน", value: (c) => (c.active ? 0 : 1) },
        { key: "id", label: "สร้างก่อน", value: (c) => c.id },
    ];

    const save = (e?: FormEvent) => {
        e?.preventDefault();
        if (!draft.name.trim()) return;
        const dup = store.categories.some((c) => c.name === draft.name.trim() && c.id !== draft.id);
        if (dup) return store.showToast(`มีหมวด “${draft.name.trim()}” อยู่แล้ว`);
        store.saveCategory({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
        store.showToast(draft.id ? `แก้ไขหมวด “${draft.name.trim()}” แล้ว` : `เพิ่มหมวด “${draft.name.trim()}” แล้ว`);
        setDraft(blank);
    }

    return (
        <>
            <PageHeader title="หมวดคำขอ" />
            <div className="grid grid-cols-[1fr_22rem] items-start gap-6">
                <Card title={`หมวดทั้งหมด (${store.categories.length})`} action={<SortSelect options={options} value={sort} onChange={setSort} />}>
                    <ul className="flex flex-col divide-y divide-line">
                        {sortBy(store.categories, options, sort).map((c) => (
                            <li key={c.id} className={cn("flex items-center gap-4 py-3", !c.active && "opacity-60")}>
                                <CategoryBadge category={c} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-ink-2">{c.description || "-"}</p>
                                    <p className="text-xs text-ink-3">ใช้ {used(c)} คำขอ{!c.active && " · ปิดใช้งาน"}</p>
                                </div>
                                <label className="flex items-center gap-1.5 text-xs text-ink-2">
                                    <Checkbox checked={c.active} onChange={(e) => store.saveCategory({ ...c, active: e.target.checked })} />เปิดใช้
                                </label>
                                <button aria-label={`แก้ไขหมวด ${c.name}`} onClick={() => setDraft({ ...c })}><Pencil1 className="size-4 text-ink-3 hover:text-brand" /></button>
                                <button aria-label={`ลบหมวด ${c.name}`} disabled={used(c) > 0} title={used(c) > 0 ? "มีคำขอใช้หมวดนี้อยู่ ลบไม่ได้ (ปิดใช้งานแทน)" : "ลบหมวด"}
                                    onClick={() => setToDelete(c)}
                                    className="disabled:cursor-not-allowed disabled:opacity-30"><Trash1 className="size-4 text-ink-3 hover:text-red-600" /></button>
                            </li>
                        ))}
                    </ul>
                    <Banner tone="info" icon={<InfoCircle />} className="mt-3">ลบได้เฉพาะหมวดที่ยังไม่มีคำขอ · หมวดที่มีคำขอแล้วให้ปิดใช้งานแทน</Banner>
                </Card>

                <Card title={draft.id ? "แก้ไขหมวด" : "เพิ่มหมวดใหม่"}>
                    <form onSubmit={save} className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">ชื่อหมวด *
                            <Input aria-label="ชื่อหมวด" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="เช่น ขอข้อมูล / รายงาน" />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">คำอธิบาย
                            <textarea aria-label="คำอธิบาย" rows={3} className={fieldClass} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
                        </label>
                        <div className="flex flex-col gap-1.5 text-sm font-medium text-ink">สีป้าย
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button type="button" key={c} aria-label={`สี ${c}`} onClick={() => setDraft((d) => ({ ...d, color: c }))}
                                        className={cn("size-7 rounded-full ring-offset-2", draft.color === c && "ring-2 ring-ink")} style={{ background: c }} />
                                ))}
                            </div>
                            {draft.name && <CategoryBadge category={{ id: 0, ...draft }} className="w-fit" />}
                        </div>
                        <label className="flex items-center gap-2 text-sm text-ink">
                            <Checkbox checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} />เปิดใช้งานทันที
                        </label>
                        <div className="flex gap-2">
                            {draft.id && <Button size="sm" type="button" appearance="outline" onPress={() => setDraft(blank)}>ยกเลิก</Button>}
                            <Button size="sm" type="submit" className="flex-1" disabled={!draft.name.trim()}>{draft.id ? "บันทึก" : <><Plus />เพิ่มหมวด</>}</Button>
                        </div>
                    </form>
                </Card>
            </div>

            <ConfirmDialog open={!!toDelete} title={`ลบหมวด “${toDelete?.name}”?`} confirmLabel="ลบหมวด" danger
                onClose={() => setToDelete(null)}
                onConfirm={() => { if (toDelete) { store.removeCategory(toDelete.id); store.showToast(`ลบหมวด “${toDelete.name}” แล้ว`); } setToDelete(null); }}>
                ลบแล้วกู้คืนไม่ได้ · หมวดนี้ยังไม่มีคำขอใช้งาน
            </ConfirmDialog>
        </>
    )
}
