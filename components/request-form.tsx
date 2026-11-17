'use client'

// แบบฟอร์มคำขอ (ตาม Figma "ส่งคำขอใหม่") · ใช้ทั้งสร้างใหม่และแก้ไขคำขอที่ถูกส่งกลับ
import Link from "next/link";
import { useRef, useState } from "react";
import { InfoCircle, Paperclip2, Send1, UploadCloud, Xmark } from "@tailgrids/icons";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Input } from "@/components/tailgrids/core/input";
import Banner from "@/components/banner";
import { Card, fmtSize } from "@/components/request-parts";
import { findApprover, findHead, nick, todayISO } from "@/data/requests";
import { useStore, type RequestDraft } from "@/data/store";
import { cn } from "@/utils/cn";

export const fieldClass = "w-full rounded-lg border border-base-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20"

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["pdf", "xlsx", "xls", "png", "jpg", "jpeg", "docx"];

type Props = {
    initial?: RequestDraft
    submitLabel: string
    cancelHref: string
    onSubmit: (draft: RequestDraft) => void
}

export default function RequestForm({ initial, submitLabel, cancelHref, onSubmit }: Props) {
    const store = useStore();
    const user = store.user!;
    const today = todayISO();
    const fileInput = useRef<HTMLInputElement>(null);

    const active = store.categories.filter((c) => c.active);
    const [draft, setDraft] = useState<RequestDraft>(initial ?? {
        title: "", detail: "", categoryId: active[0]?.id ?? 0, targetDept: "แผนก IT", dueDate: "", attachments: [],
    });
    const [talked, setTalked] = useState(!!initial);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState("");
    const [fileError, setFileError] = useState("");

    const set = <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

    // เพิ่มไฟล์ (ตรวจชนิดและขนาด · prototype เก็บแค่ชื่อและขนาด)
    const addFiles = (files: FileList | null) => {
        if (!files) return;
        const bad: string[] = [];
        const ok = Array.from(files).filter((f) => {
            const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
            if (!ALLOWED.includes(ext)) { bad.push(`${f.name} (ชนิดไฟล์ไม่รองรับ)`); return false; }
            if (f.size > MAX_SIZE) { bad.push(`${f.name} (เกิน 10 MB)`); return false; }
            return true;
        }).map((f) => ({ name: f.name, size: f.size }));
        setFileError(bad.length ? `แนบไม่ได้: ${bad.join(", ")}` : "");
        setDraft((d) => ({ ...d, attachments: [...d.attachments, ...ok.filter((a) => !d.attachments.some((x) => x.name === a.name))] }));
    }

    const submit = () => {
        if (!draft.title.trim() || !draft.detail.trim() || !draft.dueDate) return setError("กรุณากรอกช่องที่มี * ให้ครบ");
        if (draft.dueDate < today) return setError("วันที่ต้องการต้องไม่ใช่วันที่ผ่านมาแล้ว");
        if (!talked) return setError("กรุณายืนยันว่าได้คุยรายละเอียดกับหัวหน้าต้นสังกัดแล้ว");
        setError("");
        onSubmit({ ...draft, title: draft.title.trim(), detail: draft.detail.trim() });
    }

    const approver = findApprover(store.users, user.dept);
    const head = findHead(store.users, draft.targetDept);
    const selfApprove = approver?.id === user.id;
    const steps = [
        selfApprove
            ? { t: "คุณเป็นหัวหน้า: อนุมัติคำขอของตัวเอง", d: "ส่งแล้วไปกดอนุมัติในเมนู รออนุมัติ" }
            : approver
                ? { t: "หัวหน้าต้นสังกัดอนุมัติ", d: `${nick(approver.name)} ตรวจว่าคำขอครบและจำเป็นจริง` }
                : { t: "ข้ามขั้นอนุมัติ", d: `${user.dept}ยังไม่มีหัวหน้าต้นสังกัดในระบบ คำขอไปที่แผนกปลายทางทันที` },
        { t: `หัวหน้า${draft.targetDept}พิจารณา`, d: `${head ? nick(head.name) : "หัวหน้าแผนก"} รับงาน ปฏิเสธ หรือส่งต่อแผนกอื่น` },
        { t: "แผนกปลายทางดำเนินการ", d: "คุณเห็นงานหลักและความคืบหน้าเป็น %" },
        { t: "ตรวจรับงาน", d: "งานครบ 100% แล้วคุณกดตรวจรับเพื่อปิดคำขอ" },
    ];

    return (
        <div className="grid grid-cols-[1fr_20rem] items-start gap-6">
            <Card title="รายละเอียดคำขอ" hint="ช่องที่มี * ต้องกรอก">
                <div className="grid grid-cols-2 gap-4">
                    <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium text-ink">หัวข้อ *
                        <Input aria-label="หัวข้อ" placeholder="เช่น เพิ่มตัวกรองลูกค้าในระบบ CRM" value={draft.title} onChange={(e) => set("title", e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">หมวด
                        <select aria-label="หมวด" className={fieldClass} value={draft.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>
                            {active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">แผนก (ส่งถึง)
                        <select aria-label="แผนก" className={fieldClass} value={draft.targetDept} onChange={(e) => set("targetDept", e.target.value)}>
                            {store.depts.filter((d) => findHead(store.users, d)).map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">วันที่ต้องการ *
                        <input aria-label="วันที่ต้องการ" type="date" min={today} className={fieldClass} value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">ผู้ขอ
                        <input aria-label="ผู้ขอ" readOnly className={cn(fieldClass, "bg-page text-ink-2")} value={`${user.name} · ${user.dept}`} />
                    </label>
                    <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium text-ink">รายละเอียด *
                        <textarea aria-label="รายละเอียด" rows={5} className={fieldClass} placeholder="อธิบายปัญหาหรือสิ่งที่ต้องการ ใครใช้ ใช้ทำอะไร"
                            value={draft.detail} onChange={(e) => set("detail", e.target.value)} />
                    </label>
                </div>

                {/* ไฟล์แนบ */}
                <p className="mt-4 mb-1.5 text-sm font-medium text-ink">ไฟล์แนบ</p>
                <button type="button" onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                    className={cn("flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-sm",
                        dragging ? "border-brand bg-brand-soft" : "border-line bg-page hover:border-brand")}>
                    <UploadCloud className="size-7 text-brand" />
                    <span className="text-ink">ลากไฟล์มาวาง หรือ <span className="font-semibold text-brand">กดเพื่อเลือกไฟล์</span></span>
                    <span className="text-xs text-ink-3">PDF, XLSX, PNG · ไม่เกิน 10 MB ต่อไฟล์</span>
                </button>
                <input ref={fileInput} aria-label="เลือกไฟล์แนบ" type="file" multiple hidden accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.docx"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                {fileError && <p className="mt-1.5 text-xs text-red-600">{fileError}</p>}
                {draft.attachments.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                        {draft.attachments.map((a) => (
                            <li key={a.name} className="flex items-center gap-2 rounded-lg bg-page px-3 py-1.5 text-sm ring-1 ring-line">
                                <Paperclip2 className="size-4 text-ink-3" />{a.name}<span className="text-xs text-ink-3">{fmtSize(a.size)}</span>
                                <button aria-label={`ลบ ${a.name}`} onClick={() => set("attachments", draft.attachments.filter((x) => x.name !== a.name))}><Xmark className="size-4 text-ink-3 hover:text-red-600" /></button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-5 flex items-center gap-2.5 text-sm text-ink">
                    <Checkbox id="talked" checked={talked} onChange={(e) => setTalked(e.target.checked)} />
                    <label htmlFor="talked" className="cursor-pointer">ได้คุยรายละเอียดคำขอนี้กับหัวหน้าต้นสังกัดแล้ว</label>
                </div>

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                <div className="mt-5 flex justify-end gap-3">
                    <Link href={cancelHref} className={buttonStyles({ appearance: "outline", size: "sm" })}>ยกเลิก</Link>
                    <Button size="sm" onPress={submit}><Send1 />{submitLabel}</Button>
                </div>
            </Card>

            <div className="flex flex-col gap-4">
                <Card title="หลังส่งคำขอจะเกิดอะไรขึ้น">
                    <ol className="flex flex-col gap-3">
                        {steps.map((s, i) => (
                            <li key={i} className="flex gap-3 text-sm">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">{i + 1}</span>
                                <div><p className="font-semibold text-ink">{s.t}</p><p className="text-xs text-ink-2">{s.d}</p></div>
                            </li>
                        ))}
                    </ol>
                </Card>
                <Banner tone="info" icon={<InfoCircle />}>ถ้าถูกส่งกลับ คุณจะเห็นเหตุผล แก้ไข แล้วส่งใหม่</Banner>
            </div>
        </div>
    )
}
