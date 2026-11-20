'use client'

// เปิดดูไฟล์แนบ (ใช้ร่วมกันทุกหน้า: รายละเอียดคำขอ, หน้าพิจารณา, หน้ารับงาน/ไม่รับงาน, ฟอร์มส่งคำขอ)
// รูป/PDF แสดงในกล่องในหน้าเดิม (ไม่เปิดแท็บใหม่ จึงไม่โดนบล็อกป๊อปอัป) · ไฟล์ชนิดอื่นดาวน์โหลด
// วิธีใช้: const viewer = useAttachmentViewer(); ... onClick={() => viewer.view(file)} ... {viewer.dialog}
import { useState } from "react";
import { Dialog, DialogBody, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Backdrop } from "@/components/tailgrids/core/overlay";
import { fileUrl, openFile } from "@/data/files";
import type { Attachment } from "@/data/requests";
import { useStore } from "@/data/store";

const isPdf = (f: Pick<Attachment, "name" | "type">) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImage = (f: Pick<Attachment, "name" | "type">) => f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(f.name);

export function useAttachmentViewer() {
    const store = useStore();
    const [preview, setPreview] = useState<{ name: string, pdf: boolean, url: string } | null>(null);
    const missing = (name: string) => store.showToast(`ไม่พบไฟล์ ${name} ในเบราว์เซอร์นี้ (ไฟล์แนบเก็บไว้ในเบราว์เซอร์ที่แนบเท่านั้น)`);

    const view = async (f: Attachment) => {
        if (!isPdf(f) && !isImage(f)) return download(f);
        const url = await fileUrl(f.id);
        if (!url) return missing(f.name);
        setPreview({ name: f.name, pdf: isPdf(f), url });
    };
    const download = async (f: Attachment) => { if (!await openFile(f.id, f.name, true)) missing(f.name); };
    const close = () => { if (preview) URL.revokeObjectURL(preview.url); setPreview(null); };

    const dialog = (
        <Backdrop isOpen={!!preview} onOpenChange={(open) => !open && close()}>
            <Dialog aria-label={`ไฟล์แนบ ${preview?.name ?? ""}`} className="max-w-4xl">
                <DialogHeader><DialogTitle className="truncate pr-8">{preview?.name}</DialogTitle></DialogHeader>
                <DialogBody className="flex flex-col gap-3">
                    {preview && (preview.pdf
                        ? <iframe src={preview.url} title={preview.name} className="h-[70vh] w-full rounded-lg ring-1 ring-line" />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain ring-1 ring-line" />)}
                    <div className="flex justify-end gap-4 text-xs font-semibold">
                        <a href={preview?.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">เปิดในแท็บใหม่</a>
                        <a href={preview?.url} download={preview?.name} className="text-brand hover:underline">ดาวน์โหลด</a>
                    </div>
                </DialogBody>
            </Dialog>
        </Backdrop>
    );
    return { view, download, dialog };
}
