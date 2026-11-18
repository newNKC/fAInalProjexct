import { Suspense, type ReactNode } from "react";
import RoleShell from "@/components/role-shell";

// กลุ่มหน้า (approver) · เข้าได้เฉพาะผู้ที่มีโรลนี้
export default function Layout({ children }: { children: ReactNode }) {
    return (
        <Suspense>
            <RoleShell roles={["approver"]} perm="approve">{children}</RoleShell>
        </Suspense>
    )
}
