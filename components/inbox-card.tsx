import type { ReactNode } from "react";
import CategoryBadge from "@/components/category-badge";
import StatusBadge from "@/components/status-badge";
import type { Category } from "@/data/categories";
import { displayStatus, type Request } from "@/data/requests";

// การ์ดคำขอ 1 ใบในกล่องงานเข้า (รออนุมัติ / คำขอเข้าแผนก)
export default function InboxCard({ r, category, meta, sub, actions }: { r: Request, category?: Category, meta: string, sub?: string, actions: ReactNode }) {
    return (
        <article className="flex items-center gap-4 rounded-xl bg-white p-5 ring-1 ring-line">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-ink-3">{r.code}</span>
                    <CategoryBadge category={category} />
                    {displayStatus(r) === "overdue" && <StatusBadge status="overdue" />}
                </div>
                <p className="mt-1 text-xs text-ink-2">{meta}</p>
                <h3 className="mt-1 truncate text-base font-semibold text-ink">{r.title}</h3>
                {sub && <p className="mt-1 text-xs text-ink-3">{sub}</p>}
            </div>
            <div className="flex shrink-0 gap-2">{actions}</div>
        </article>
    )
}
