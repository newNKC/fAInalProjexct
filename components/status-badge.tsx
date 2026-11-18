import { cva } from "class-variance-authority";
import type { DisplayStatus } from "@/data/requests";
import { cn } from "@/utils/cn";

// ป้ายสถานะ (ทำแบบเดียวกับ role-badge.tsx) · "เกินกำหนด" คำนวณจากวันที่ต้องการ
const statusBadgeStyles = cva(
    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
    {
        variants: {
            status: {
                pending_approval: "bg-[#EDE9FE] text-[#6D28D9]",
                returned: "bg-[#FEF3C7] text-[#B45309]",
                pending_target: "bg-[#E0F2FE] text-[#0369A1]",
                rejected: "bg-[#F1F5F9] text-[#475569]",
                in_progress: "bg-brand-soft text-brand-strong",
                pending_acceptance: "bg-[#FCE7F3] text-[#BE185D]",
                done: "bg-[#D1FAE5] text-[#047857]",
                overdue: "bg-[#FFE4E6] text-[#BE123C]",
                fix: "bg-[#FFEDD5] text-[#C2410C]",
            },
        },
    }
);

export const STATUS_LABEL: Record<DisplayStatus, string> = {
    pending_approval: "รออนุมัติ",
    returned: "ส่งกลับแก้ไข",
    pending_target: "รอแผนกปลายทาง",
    rejected: "ปฏิเสธ",
    in_progress: "กำลังดำเนินการ",
    pending_acceptance: "รอตรวจรับ",
    done: "เสร็จสิ้น",
    overdue: "เกินกำหนด",
    fix: "ขอให้แก้ไข",
};

export default function StatusBadge({ status, className }: { status: DisplayStatus, className?: string }) {
    return (
        <span className={cn(statusBadgeStyles({ status }), className)}>
            <span className="size-1.5 rounded-full bg-current" />
            {STATUS_LABEL[status]}
        </span>
    )
}
