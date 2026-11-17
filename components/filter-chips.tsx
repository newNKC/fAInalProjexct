'use client'

import { cn } from "@/utils/cn";

// ปุ่มกรองแบบชิป (หน้าตาเดียวกับตัวกรองแผนกในหน้า จัดการผู้ใช้)
export default function FilterChips<T extends string>({ options, value, onChange }: {
    options: { value: T, label: string, count?: number }[]
    value: T
    onChange: (v: T) => void
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((o) => (
                <button key={o.value} onClick={() => onChange(o.value)}
                    className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs",
                        value === o.value ? "border-brand bg-brand-soft font-semibold text-brand-strong" : "border-line bg-white text-ink-2 hover:bg-page"
                    )}>
                    {o.label}{o.count !== undefined && ` (${o.count})`}
                </button>
            ))}
        </div>
    )
}
