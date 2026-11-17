import { Suspense } from "react";
import { DashboardSquare1 } from "@tailgrids/icons";
import RoleShell from "@/components/role-shell";
import type { MenuItem } from "@/components/sidebar";

// เมนูของผู้บริหาร
const menu: MenuItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <DashboardSquare1 /> },
];

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="executive" menu={menu}>{children}</RoleShell>
        </Suspense>
    )
}
