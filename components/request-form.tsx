'use client'

// แบบฟอร์มคำขอ (ใช้ทั้งสร้างใหม่และแก้ไขคำขอที่ถูกส่งกลับ)
import { useState } from "react";
import { Paperclip2, Send1, Xmark } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { useStore, type RequestDraft } from "@/data/store";

const fieldClass = "w-full rounded-lg border border-base-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20"

type Props = {
    initial?: RequestDraft
    submitLabel: string
    onSubmit: (draft: RequestDraft) => void
}

export default function RequestForm({ initial, submitLabel, onSubmit }: Props) {
    const store = useStore();
    const today = new Date().toISOString().slice(0, 10);

    // states
    const [draft, setDraft] = useState<RequestDraft>(initial ?? {
        title: "", detail: "", categoryId: store.categories[0]?.id ?? 0, targetDept: "แผนก IT", dueDate: "", attachments: [],
    });
    const [error, setError] = useState("");

    // เปลี่ยนค่า 1 ช่อง
    const set = <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

    // เลือกไฟล์ (เก็บแค่ชื่อและขนาด)
    const addFiles = (files: FileList | null) => {
        if (!files) return;
        const added = Array.from(files).map((f) => ({ name: f.name, size: f.size }));
        set("attachments", [...draft.attachments, ...added.filter((a) => !draft.attachments.some((x) => x.name === a.name))]);
    }

    const submit = () => {
        if (!draft.title.trim() || !draft.detail.trim() || !draft.dueDate) {
            setError("กรุณากรอกหัวข้อ รายละเอียด และวันที่ต้องการให้ครบ");
            return;
        }
        if (draft.dueDate < today) {
            setError("วันที่ต้องการต้องไม่ใช่วันที่ผ่านมาแล้ว");
            return;
        }
        setError("");
        onSubmit({ ...draft, title: draft.title.trim(), detail: draft.detail.trim() });
    }

    return (
        <section className="flex max-w-3xl flex-col gap-4 rounded-xl bg-white p-6 ring-1 ring-line">
            <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="text-sm font-medium text-ink">หัวข้อคำขอ <span className="text-red-600">*</span></label>
                <Input id="title" className="w-full text-sm" placeholder="เช่น เพิ่มรายงานยอดขายรายเดือน" value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="detail" className="text-sm font-medium text-ink">รายละเอียด <span className="text-red-600">*</span></label>
                <textarea id="detail" rows={5} className={fieldClass} placeholder="อธิบายปัญหา สิ่งที่ต้องการ และผลที่คาดหวัง"
                    value={draft.detail} onChange={(e) => set("detail", e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="category" className="text-sm font-medium text-ink">หมวดคำขอ</label>
                    <select id="category" className={fieldClass} value={draft.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>
                        {store.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="dept" className="text-sm font-medium text-ink">แผนกปลายทาง</label>
                    <select id="dept" className={fieldClass} value={draft.targetDept} onChange={(e) => set("targetDept", e.target.value)}>
                        {store.depts.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="due" className="text-sm font-medium text-ink">วันที่ต้องการ <span className="text-red-600">*</span></label>
                    <input id="due" type="date" min={today} className={fieldClass} value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
                </div>
            </div>

            {/* attachments */}
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-ink">ไฟล์แนบ</span>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-base-300 px-4 py-5 text-sm text-ink-2 hover:bg-page [&>svg]:size-5">
                    <Paperclip2 />เลือกไฟล์ (เลือกได้หลายไฟล์)
                    <input type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                </label>
                {draft.attachments.map((a) => (
                    <div key={a.name} className="flex items-center gap-2 rounded-lg bg-page px-3 py-2 text-sm text-ink-2">
                        <Paperclip2 className="size-4" />
                        <span className="flex-1">{a.name}</span>
                        <span className="text-xs text-ink-3">{Math.max(1, Math.round(a.size / 1024))} KB</span>
                        <button aria-label={`ลบ ${a.name}`} className="text-ink-3 hover:text-red-600"
                            onClick={() => set("attachments", draft.attachments.filter((x) => x.name !== a.name))}>
                            <Xmark className="size-4" />
                        </button>
                    </div>
                ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end">
                <Button onPress={submit}><Send1 />{submitLabel}</Button>
            </div>
        </section>
    )
}
