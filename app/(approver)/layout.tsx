import { Suspense } from "react";
import { CheckCircle1 } from "@tailgrids/icons";
import RoleShell from "@/components/role-shell";
import type { MenuItem } from "@/components/sidebar";

// เมนูของหัวหน้าต้นสังกัด
const menu: MenuItem[] = [
    { href: "/approvals", label: "พิจารณาคำขอ", icon: <CheckCircle1 /> },
];

export default function ApproverLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="approver" menu={menu}>{children}</RoleShell>
        </Suspense>
    )
}
