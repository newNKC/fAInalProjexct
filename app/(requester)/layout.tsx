import { Suspense } from "react";
import RoleShell from "@/components/role-shell";

// หน้าในกลุ่มนี้เข้าได้เฉพาะคนที่มีโรล requester · เมนูอยู่ใน data/menus.tsx
export default function RequesterLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="requester">{children}</RoleShell>
        </Suspense>
    )
}
