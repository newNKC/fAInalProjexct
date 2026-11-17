import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

// แถบข้อความแจ้ง (เหมือน Banner ใน Figma) · info = ม่วงจาง, warning = เหลือง, success = เขียว, danger = แดง
const tones = {
    info: "bg-brand-soft text-brand-strong",
    warning: "bg-[#FEF3C7] text-[#92400E]",
    success: "bg-[#D1FAE5] text-[#065F46]",
    danger: "bg-[#FFE4E6] text-[#9F1239]",
};

export default function Banner({ icon, tone = "info", children, action, className }: { icon?: ReactNode, tone?: keyof typeof tones, children: ReactNode, action?: ReactNode, className?: string }) {
    return (
        <div className={cn("flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium [&>svg]:size-5 [&>svg]:shrink-0", tones[tone], className)}>
            {icon}
            <div className="flex-1">{children}</div>
            {action}
        </div>
    )
}
