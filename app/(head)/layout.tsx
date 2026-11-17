import { Suspense } from "react";
import RoleShell from "@/components/role-shell";

// หน้าในกลุ่มนี้เข้าได้เฉพาะคนที่มีโรล head · เมนูอยู่ใน data/menus.tsx
export default function HeadLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="head">{children}</RoleShell>
        </Suspense>
    )
}
