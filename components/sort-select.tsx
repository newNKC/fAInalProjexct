'use client'

// ตัวเลือกเรียงลำดับสำหรับรายการแบบการ์ด (รออนุมัติ, คำขอเข้าแผนก, ทีม, หมวดคำขอ)
import { ArrowBothDirectionHorizontal2 } from "@tailgrids/icons";

export type SortOption<T> = { key: string, label: string, value: (row: T) => string | number, dir?: "asc" | "desc" }

export function sortBy<T>(rows: T[], options: SortOption<T>[], key: string) {
    const o = options.find((x) => x.key === key);
    if (!o) return rows;
    return [...rows].sort((a, b) => {
        const x = o.value(a), y = o.value(b);
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "th");
        return o.dir === "desc" ? -cmp : cmp;
    });
}

export default function SortSelect<T>({ options, value, onChange }: { options: SortOption<T>[], value: string, onChange: (key: string) => void }) {
    return (
        <label className="inline-flex items-center gap-2 text-xs text-ink-2">
            <ArrowBothDirectionHorizontal2 className="size-4 rotate-90" />
            เรียงตาม
            <select value={value} onChange={(e) => onChange(e.target.value)}
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand">
                {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
        </label>
    )
}
