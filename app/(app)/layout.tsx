import { Suspense, type ReactNode } from "react";
import RoleShell from "@/components/role-shell";

// กลุ่มหน้า (app) · ใช้ร่วมกันทุกโรล (แต่ละหน้าตรวจสิทธิ์เองด้วย <Guard>)
export default function Layout({ children }: { children: ReactNode }) {
    return (
        <Suspense>
            <RoleShell>{children}</RoleShell>
        </Suspense>
    )
}
