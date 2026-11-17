'use client'

import type { ReactNode } from "react";
import { useStore } from "@/data/store";

// หัวหน้าเพจ: ชื่อหน้า + ชื่อผู้ใช้ที่ล็อกอิน (เหมือนหน้า จัดการผู้ใช้ เดิม)
export default function PageHeader({ title, actions }: { title: string, actions?: ReactNode }) {
    const { user } = useStore();
    return (
        <div className="mb-6 flex items-end gap-4">
            <div className="flex-1">
                <h1 className="text-2xl font-bold text-ink">{title}</h1>
                <p className="text-xs text-ink-2">{user?.name} · {user?.position}</p>
            </div>
            {actions}
        </div>
    )
}
