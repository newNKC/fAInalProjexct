import { Suspense, type ReactNode } from "react";
import RoleShell from "@/components/role-shell";

// กลุ่มหน้า (admin) · แต่ละหน้าตรวจสิทธิ์เอง (จัดการผู้ใช้/หมวด = ตามที่ติ๊กในหน้าสิทธิ์โรล · หน้าสิทธิ์โรล = ผู้ดูแลระบบเท่านั้น)
export default function Layout({ children }: { children: ReactNode }) {
    return (
        <Suspense>
            <RoleShell>{children}</RoleShell>
        </Suspense>
    )
}
