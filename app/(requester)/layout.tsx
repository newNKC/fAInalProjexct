import { Suspense } from "react";
import { FileTextMultiple, Plus } from "@tailgrids/icons";
import RoleShell from "@/components/role-shell";
import type { MenuItem } from "@/components/sidebar";

// เมนูของผู้ขอ
const menu: MenuItem[] = [
    { href: "/requests", label: "คำขอของฉัน", icon: <FileTextMultiple /> },
    { href: "/requests/new", label: "สร้างคำขอ", icon: <Plus /> },
];

export default function RequesterLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="requester" menu={menu}>{children}</RoleShell>
        </Suspense>
    )
}
