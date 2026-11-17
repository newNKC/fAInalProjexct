'use client'

// หน้าต่างยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้ (ลบ, ส่งต่อ ฯลฯ) · กด Esc หรือคลิกนอกกล่อง = ยกเลิก
import type { ReactNode } from "react";
import { Dialog, DialogBody, DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Backdrop } from "@/components/tailgrids/core/overlay";

type Props = {
    open: boolean
    title: string
    children?: ReactNode
    confirmLabel: string
    danger?: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function ConfirmDialog({ open, title, children, confirmLabel, danger, onClose, onConfirm }: Props) {
    return (
        <Backdrop isOpen={open} onOpenChange={(o) => !o && onClose()} isDismissable>
            <Dialog role="alertdialog">
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                {children && <DialogBody className="text-sm text-ink-2">{children}</DialogBody>}
                <DialogFooter>
                    <DialogClose appearance="outline" autoFocus>ยกเลิก</DialogClose>
                    <DialogClose variant={danger ? "danger" : "primary"} onPress={onConfirm}>{confirmLabel}</DialogClose>
                </DialogFooter>
            </Dialog>
        </Backdrop>
    )
}
