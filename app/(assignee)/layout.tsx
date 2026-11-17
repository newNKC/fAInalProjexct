import { Suspense } from "react";
import { DoubleCheckMark } from "@tailgrids/icons";
import RoleShell from "@/components/role-shell";
import type { MenuItem } from "@/components/sidebar";

// เมนูของผู้รับงาน
const menu: MenuItem[] = [
    { href: "/tasks", label: "งานของฉัน", icon: <DoubleCheckMark /> },
];

export default function AssigneeLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="assignee" menu={menu}>{children}</RoleShell>
        </Suspense>
    )
}
