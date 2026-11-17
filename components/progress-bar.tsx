import { cn } from "@/utils/cn";

// แถบความคืบหน้า 0-100 พร้อมตัวเลข
export default function ProgressBar({ value, className }: { value: number, className?: string }) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <div className={cn("h-full rounded-full", value === 100 ? "bg-[#059669]" : "bg-brand")} style={{ width: `${value}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-semibold text-ink-2">{value}%</span>
        </div>
    )
}
