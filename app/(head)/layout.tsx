import { Suspense } from "react";
import { LetterBox, UserMultiple4 } from "@tailgrids/icons";
import RoleShell from "@/components/role-shell";
import type { MenuItem } from "@/components/sidebar";

// เมนูของหัวหน้าแผนกปลายทาง
const menu: MenuItem[] = [
    { href: "/incoming", label: "คำขอเข้าแผนก", icon: <LetterBox /> },
    { href: "/workload", label: "ภาระงานทีม", icon: <UserMultiple4 /> },
];

export default function HeadLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            <RoleShell role="head" menu={menu}>{children}</RoleShell>
        </Suspense>
    )
}
