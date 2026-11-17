import { Suspense } from "react";
import { Bookmark1, DashboardSquare1, Shield1Check, UserMultiple1, UserMultiple4 } from "@tailgrids/icons";
import RoleShell from "@/components/role-shell";
import type { MenuItem } from "@/components/sidebar";

// เมนูของผู้ดูแลระบบ
const menu: MenuItem[] = [
    { href: "/admin/dashboard", label: "Dashboard", icon: <DashboardSquare1 /> },
    { href: "/admin/users", label: "จัดการผู้ใช้", icon: <UserMultiple1 /> },
    { href: "/admin/categories", label: "หมวดคำขอ", icon: <Bookmark1 /> },
    { href: "/admin/permissions", label: "สิทธิ์โรล", icon: <Shield1Check /> },
    { href: "/admin/teams", label: "ทีม", icon: <UserMultiple4 /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="admin" menu={menu}>{children}</RoleShell>
        </Suspense>
    )
}
