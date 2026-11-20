'use client'

// แบบฟอร์มคำขอ (ตาม Figma "ส่งคำขอใหม่") · ใช้ทั้งสร้างใหม่และแก้ไขคำขอที่ถูกส่งกลับ
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useLeaveGuard } from "@/components/use-leave-guard";
import { InfoCircle, Paperclip2, Send1, UploadCloud, Xmark } from "@tailgrids/icons";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Input } from "@/components/tailgrids/core/input";
import Banner from "@/components/banner";
import { Card, fmtSize } from "@/components/request-parts";
import { saveFile } from "@/data/files";
import { findHead, nick, todayISO, type Attachment } from "@/data/requests";
import { useStore, type RequestDraft } from "@/data/store";
import { useAttachmentViewer } from "@/components/attachment-viewer";
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
    const viewer = useAttachmentViewer();
    const user = store.user!;
    const today = todayISO();
    const fileInput = useRef<HTMLInputElement>(null);

    const active = store.categories.filter((c) => c.active);
    // แผนกที่ส่งคำขอถึงได้ = แผนกที่มีหัวหน้าแผนกในระบบ (ค่าเริ่มต้น แผนก IT ถ้ามี)
    const targets = store.depts.filter((d) => findHead(store.users, d));
    const defaultTarget = targets.includes("แผนก IT") ? "แผนก IT" : targets[0] ?? "";
    const [draft, setDraft] = useState<RequestDraft>(initial ?? {
        title: "", detail: "", categoryId: active[0]?.id ?? 0, targetDept: defaultTarget, dueDate: "", attachments: [],
    });
    const [talked, setTalked] = useState(!!initial);
    const [dragging, setDragging] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [fileError, setFileError] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const sending = useRef(false);   // กันกดส่งซ้ำเร็ว ๆ แล้วได้คำขอซ้ำ

    // กรอกค้างไว้แล้วจะปิดแท็บ/รีเฟรช → เบราว์เซอร์ถามก่อน
    const dirty = !submitted && JSON.stringify(draft) !== JSON.stringify(initial ?? { title: "", detail: "", categoryId: active[0]?.id ?? 0, targetDept: defaultTarget, dueDate: "", attachments: [] });
    useLeaveGuard(dirty);

    const set = <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

    // เพิ่มไฟล์: ตรวจชนิดและขนาด แล้วเก็บไฟล์จริงไว้ในเบราว์เซอร์ (IndexedDB)
    const addFiles = async (files: FileList | null) => {
        if (!files) return;
        const bad: string[] = [];
        const ok: Attachment[] = [];
        for (const f of Array.from(files)) {
            const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
            if (!ALLOWED.includes(ext)) { bad.push(`${f.name} (ชนิดไฟล์ไม่รองรับ)`); continue; }
            if (f.size > MAX_SIZE) { bad.push(`${f.name} (เกิน 10 MB)`); continue; }
            if (draft.attachments.some((x) => x.name === f.name)) continue;
            const id = crypto.randomUUID();
            try {
                await saveFile(id, f);
                ok.push({ id, name: f.name, size: f.size, type: f.type });
            } catch {
                bad.push(`${f.name} (บันทึกไฟล์ไม่สำเร็จ)`);
            }
        }
        setFileError(bad.length ? `แนบไม่ได้: ${bad.join(", ")}` : "");
        setDraft((d) => ({ ...d, attachments: [...d.attachments, ...ok] }));
    }

    // ตรวจทุกช่องพร้อมกัน แสดงข้อความใต้ช่องที่ผิด แล้วเลื่อนไปช่องแรกที่ผิด
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (sending.current) return;
        const err: Record<string, string> = {};
        if (!draft.title.trim()) err.title = "กรุณากรอกหัวข้อ";
        if (!active.some((c) => c.id === draft.categoryId)) err.categoryId = "หมวดนี้ถูกปิดใช้งานแล้ว กรุณาเลือกหมวดใหม่";
        if (!draft.dueDate) err.dueDate = "กรุณาเลือกวันที่ต้องการ";
        else if (draft.dueDate < today) err.dueDate = "วันที่ต้องการต้องไม่ใช่วันที่ผ่านมาแล้ว";
        if (!draft.detail.trim()) err.detail = "กรุณากรอกรายละเอียด";
        if (!talked) err.talked = "กรุณายืนยันว่าได้คุยรายละเอียดกับหัวหน้าต้นสังกัดแล้ว";
        setErrors(err);
        const first = Object.keys(err)[0];
        if (first) {
            document.getElementById(`f-${first}`)?.focus();
            return;
        }
        sending.current = true;
        setSubmitted(true);
        onSubmit({ ...draft, title: draft.title.trim(), detail: draft.detail.trim() });
    }
    const errText = (k: string) => errors[k] && <span id={`e-${k}`} className="text-xs font-normal text-red-600">{errors[k]}</span>
    const bad = (k: string) => errors[k] ? { "aria-invalid": true, "aria-describedby": `e-${k}` } : {}

    const approver = store.approverOf(user.dept);
    const head = findHead(store.users, draft.targetDept);
    const selfApprove = approver?.id === user.id;
    const steps = [
        selfApprove
            ? { t: "คุณเป็นหัวหน้า: อนุมัติคำขอของตัวเอง", d: "ส่งแล้วไปกดอนุมัติในเมนู รออนุมัติ" }
            : approver
                ? { t: "หัวหน้าต้นสังกัดอนุมัติ", d: `${nick(approver.name)} ตรวจว่าคำขอครบและจำเป็นจริง` }
                : { t: "ข้ามขั้นอนุมัติ", d: `${user.dept}ไม่มีหัวหน้าต้นสังกัดที่อนุมัติได้ คำขอไปที่แผนกปลายทางทันที` },
        { t: `หัวหน้า${draft.targetDept}พิจารณา`, d: `${head ? nick(head.name) : "หัวหน้าแผนก"} รับงาน ปฏิเสธ หรือส่งต่อแผนกอื่น` },
        { t: "แผนกปลายทางดำเนินการ", d: "คุณเห็นงานหลักและความคืบหน้าเป็น %" },
        { t: "ตรวจรับงาน", d: "งานครบ 100% แล้วคุณกดตรวจรับเพื่อปิดคำขอ" },
    ];

    return (
        <div className="grid grid-cols-[1fr_20rem] items-start gap-6">
            <form onSubmit={submit} noValidate>
            <Card title="รายละเอียดคำขอ" hint="ช่องที่มี * ต้องกรอก">
                <div className="grid grid-cols-2 gap-4">
                    <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium text-ink">หัวข้อ *
                        <Input id="f-title" {...bad("title")} required maxLength={150} aria-label="หัวข้อ" placeholder="เช่น เพิ่มตัวกรองลูกค้าในระบบ CRM" value={draft.title} onChange={(e) => set("title", e.target.value)} />
                        {errText("title")}
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">หมวด
                        <select id="f-categoryId" {...bad("categoryId")} aria-label="หมวด" className={cn(fieldClass, errors.categoryId && "border-red-500")} value={draft.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>
                            {active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            {/* หมวดเดิมของคำขอที่ถูกปิดใช้งานไปแล้ว: ยังแสดงให้เห็นว่าเลือกอะไรอยู่ */}
                            {!active.some((c) => c.id === draft.categoryId) && store.categories.find((c) => c.id === draft.categoryId) && (
                                <option value={draft.categoryId}>{store.categories.find((c) => c.id === draft.categoryId)!.name} (ปิดใช้งาน · ควรเลือกหมวดใหม่)</option>
                            )}
                        </select>
                        {errText("categoryId")}
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">แผนก (ส่งถึง)
                        <select aria-label="แผนก" className={fieldClass} value={draft.targetDept} onChange={(e) => set("targetDept", e.target.value)}>
                            {targets.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">วันที่ต้องการ *
                        <input id="f-dueDate" {...bad("dueDate")} required aria-label="วันที่ต้องการ" type="date" min={today} className={cn(fieldClass, errors.dueDate && "border-red-500")} value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
                        {errText("dueDate")}
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">ผู้ขอ
                        <input aria-label="ผู้ขอ" readOnly className={cn(fieldClass, "bg-page text-ink-2")} value={`${user.name} · ${user.dept}`} />
                    </label>
                    <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium text-ink">รายละเอียด *
                        <textarea id="f-detail" {...bad("detail")} required aria-label="รายละเอียด" rows={5} className={cn(fieldClass, errors.detail && "border-red-500")} placeholder="อธิบายปัญหาหรือสิ่งที่ต้องการ ใครใช้ ใช้ทำอะไร"
                            value={draft.detail} onChange={(e) => set("detail", e.target.value)} />
                        {errText("detail")}
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
                            <li key={a.id} className="flex items-center gap-2 rounded-lg bg-page px-3 py-1.5 text-sm ring-1 ring-line">
                                <Paperclip2 className="size-4 text-ink-3" />
                                <button type="button" onClick={() => viewer.view(a)} title="เปิดดู" className="hover:text-brand hover:underline">{a.name}</button>
                                <span className="text-xs text-ink-3">{fmtSize(a.size)}</span>
                                <button type="button" aria-label={`ลบ ${a.name}`} onClick={() => set("attachments", draft.attachments.filter((x) => x.id !== a.id))}><Xmark className="size-4 text-ink-3 hover:text-red-600" /></button>
                            </li>
                        ))}
                    </ul>
                )}
                {viewer.dialog}

                <div className="mt-5 flex items-center gap-2.5 text-sm text-ink">
                    <Checkbox id="talked" checked={talked} onChange={(e) => setTalked(e.target.checked)} />
                    <label htmlFor="talked" className="cursor-pointer">ได้คุยรายละเอียดคำขอนี้กับหัวหน้าต้นสังกัดแล้ว *</label>
                </div>
                <span id="f-talked" tabIndex={-1}>{errText("talked")}</span>
                {Object.keys(errors).length > 0 && <p role="alert" className="mt-3 text-sm text-red-600">ข้อมูลยังไม่ถูกต้อง {Object.keys(errors).length} ช่อง · ดูข้อความสีแดงใต้ช่อง</p>}

                <div className="mt-5 flex justify-end gap-3">
                    <Link href={cancelHref} className={cn(buttonStyles({ appearance: "outline", size: "sm" }), "whitespace-nowrap")}>ยกเลิก</Link>
                    <Button size="sm" type="submit" disabled={submitted}><Send1 />{submitLabel}</Button>
                </div>
            </Card>
            </form>

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
