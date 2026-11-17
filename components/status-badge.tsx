import { cva } from "class-variance-authority";
import type { Status } from "@/data/requests";
import { cn } from "@/utils/cn";

// แบบป้ายสถานะ (ทำแบบเดียวกับ role-badge.tsx)
const statusBadgeStyles = cva(
    "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
    {
        variants: {
            status: {
                pending_approval: "bg-[#EDE9FE] text-[#6D28D9]",
                returned: "bg-[#FEF3C7] text-[#B45309]",
                pending_target: "bg-[#E0F2FE] text-[#0369A1]",
                rejected: "bg-[#FFE4E6] text-[#BE123C]",
                in_progress: "bg-brand-soft text-brand-strong",
                pending_acceptance: "bg-[#FCE7F3] text-[#BE185D]",
                done: "bg-[#D1FAE5] text-[#047857]",
            },
        },
    }
);

export const STATUS_LABEL: Record<Status, string> = {
    pending_approval: "รออนุมัติ",
    returned: "ส่งกลับแก้ไข",
    pending_target: "รอแผนกปลายทาง",
    rejected: "ปฏิเสธ",
    in_progress: "กำลังดำเนินการ",
    pending_acceptance: "รอตรวจรับ",
    done: "เสร็จสิ้น",
};

export const allStatuses = Object.keys(STATUS_LABEL) as Status[];

export default function StatusBadge({ status, className }: { status: Status, className?: string }) {
    return (
        <span className={cn(statusBadgeStyles({ status }), className)}>
            <span className="size-1.5 rounded-full bg-current" />
            {STATUS_LABEL[status]}
        </span>
    )
}
