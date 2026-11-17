import { Suspense } from "react";
import RoleShell from "@/components/role-shell";

// หน้าในกลุ่มนี้เข้าได้เฉพาะคนที่มีโรล assignee · เมนูอยู่ใน data/menus.tsx
export default function AssigneeLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="assignee">{children}</RoleShell>
        </Suspense>
    )
}
