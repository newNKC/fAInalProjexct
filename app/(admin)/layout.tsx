import { Suspense } from "react";
import RoleShell from "@/components/role-shell";

// หน้าในกลุ่มนี้เข้าได้เฉพาะคนที่มีโรล admin · เมนูอยู่ใน data/menus.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="admin">{children}</RoleShell>
        </Suspense>
    )
}
