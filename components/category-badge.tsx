import type { Category } from "@/data/categories";
import { cn } from "@/utils/cn";

// ป้ายหมวดคำขอ สีตามที่ผู้ดูแลระบบตั้ง (พื้นจาง ตัวอักษรสีเข้ม)
export default function CategoryBadge({ category, className }: { category?: Category, className?: string }) {
    if (!category) return <span className="text-xs text-ink-3">-</span>;
    return (
        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap", className)}
            style={{ color: category.color, background: `${category.color}1A` }}>
            {category.name}
        </span>
    )
}
