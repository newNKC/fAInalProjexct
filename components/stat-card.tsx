import { cn } from "@/utils/cn";

// การ์ดตัวเลขสรุป (Stat) · tone = สีของตัวเลข
export default function StatCard({ label, value, hint, tone = "ink" }: { label: string, value: number | string, hint?: string, tone?: "ink" | "brand" | "danger" | "success" | "warning" }) {
    const color = { ink: "text-ink", brand: "text-brand", danger: "text-[#BE123C]", success: "text-[#047857]", warning: "text-[#B45309]" }[tone];
    return (
        <div className="rounded-xl bg-white p-5 ring-1 ring-line">
            <p className="text-sm text-ink-2">{label}</p>
            <p className={cn("mt-1 text-3xl font-bold", color)}>{value}</p>
            {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
        </div>
    )
}
