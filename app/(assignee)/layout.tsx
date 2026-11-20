import { Suspense, type ReactNode } from "react";
import RoleShell from "@/components/role-shell";

// กลุ่มหน้า (assignee) · ผู้รับงาน และหัวหน้าแผนกที่มอบงานย่อยให้ตัวเอง (ต้องมีสิทธิ์ "อัปเดตความคืบหน้างาน")
export default function Layout({ children }: { children: ReactNode }) {
    return (
        <Suspense>
            <RoleShell roles={["assignee", "head"]} perm="progress">{children}</RoleShell>
        </Suspense>
    )
}
