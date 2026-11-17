import { Suspense } from "react";
import RoleShell from "@/components/role-shell";

// หน้าในกลุ่มนี้เข้าได้เฉพาะคนที่มีโรล approver · เมนูอยู่ใน data/menus.tsx
export default function ApproverLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="approver">{children}</RoleShell>
        </Suspense>
    )
}
