import { Suspense } from "react";
import RoleShell from "@/components/role-shell";

// หน้าในกลุ่มนี้เข้าได้เฉพาะคนที่มีโรล executive · เมนูอยู่ใน data/menus.tsx
export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="executive">{children}</RoleShell>
        </Suspense>
    )
}
