'use client'

import { useState, type ReactNode } from "react";
import { Dialog, DialogBody, DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Backdrop } from "@/components/tailgrids/core/overlay";

// หน้าต่างยืนยันที่บังคับกรอกเหตุผล (ใช้กับ ส่งกลับ / ปฏิเสธ / ส่งต่อ / ขอแก้งาน)
type Props = {
    open: boolean
    onClose: () => void
    title: string
    confirmLabel: string
    danger?: boolean
    children?: ReactNode          // ช่องเพิ่มเติม เช่น เลือกแผนกที่จะส่งต่อ
    canConfirm?: boolean          // เงื่อนไขเพิ่มจากช่องเพิ่มเติม
    onConfirm: (reason: string) => void
}

export default function ReasonDialog({ open, onClose, title, confirmLabel, danger, children, canConfirm = true, onConfirm }: Props) {
    const [reason, setReason] = useState("");
    const ok = reason.trim().length > 0 && canConfirm;

    return (
        <Backdrop isOpen={open} onOpenChange={(o) => { if (!o) { onClose(); setReason(""); } }}>
            <Dialog aria-label={title} showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogBody className="flex flex-col gap-3">
                    {children}
                    <label htmlFor="reason" className="text-sm font-medium text-ink">เหตุผล <span className="text-red-600">*</span></label>
                    <textarea id="reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="ระบุเหตุผลให้ผู้เกี่ยวข้องเข้าใจ"
                        className="rounded-lg border border-base-300 px-4 py-2.5 text-sm outline-none focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20" />
                    {!reason.trim() && <p className="text-xs text-ink-3">ต้องกรอกเหตุผลก่อนยืนยัน</p>}
                </DialogBody>
                <DialogFooter>
                    <DialogClose appearance="outline">ยกเลิก</DialogClose>
                    <DialogClose variant={danger ? "danger" : "primary"} disabled={!ok}
                        onPress={() => { onConfirm(reason.trim()); setReason(""); }}>
                        {confirmLabel}
                    </DialogClose>
                </DialogFooter>
            </Dialog>
        </Backdrop>
    )
}
