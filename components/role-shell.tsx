'use client'

// โครงหน้าของทุกหน้าหลังเข้าสู่ระบบ: ตรวจว่าเข้าสู่ระบบแล้ว (และมีโรลที่กลุ่มหน้านี้ต้องการ) แล้วแสดง Sidebar + เนื้อหา + ข้อความแจ้งผล
// เมนูใน sidebar รวมเมนูของทุกโรลที่ผู้ใช้มี (ไม่ต้องสลับโรล)

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { CheckCircle1, Xmark } from "@tailgrids/icons";
import Sidebar from "@/components/sidebar";
import RoleBadge from "@/components/role-badge";
import { menuCounts } from "@/components/action-items";
import { menuFor } from "@/data/menus";
import { primaryRole, roleHome } from "@/data/requests";
import { useStore } from "@/data/store";
import type { Role } from "@/data/users";

export default function RoleShell({ roles, children }: { roles?: Role[], children: ReactNode }) {
    const store = useStore();
    const router = useRouter();
    const { ready, user } = store;

    const pathname = usePathname();
    const mustChange = store.mustChangePassword;

    // ยังไม่เข้าสู่ระบบ → ไปหน้า login แล้วกลับมาหน้านี้หลังเข้าสู่ระบบ
    // ได้รหัสผ่านชั่วคราวจากผู้ดูแลระบบ → ต้องตั้งรหัสผ่านใหม่ก่อนใช้หน้าอื่น
    // (เพิ่งกดออกจากระบบ → ไปหน้า login เฉย ๆ ไม่ต้องจำหน้าเดิม)
    const hadUser = useRef(false);
    useEffect(() => {
        if (!ready) return;
        if (user) hadUser.current = true;
        if (!user) router.replace(hadUser.current ? "/login" : `/login?next=${encodeURIComponent(pathname)}&reason=expired`);
        else if (mustChange && pathname !== "/account") router.replace("/account?required=1");
    }, [ready, user, mustChange, pathname, router]);

    if (!ready || !user) {
        return <div className="flex min-h-screen items-center justify-center bg-page text-sm text-ink-3">กำลังโหลด...</div>
    }

    const counts = menuCounts(store);
    const menu = menuFor(user, store.hasPerm).map((m) => ({ ...m, count: counts[m.href] || undefined }));
    const allowed = !roles || roles.some((r) => user.roles.includes(r));

    return (
        <div className="flex min-h-screen bg-page">
            <Sidebar menu={mustChange ? [] : menu} user={{ name: user.name, position: user.position, role: primaryRole(user) }} onLogout={store.logout} />
            <main className="min-w-0 flex-1 px-8 pt-6 pb-12">
                {allowed ? children : <NoAccess roles={roles!} />}
            </main>

            {/* ข้อความแจ้งผลหลังกดปุ่ม (หายเองใน 4 วินาที) */}
            {store.toast && (
                <div key={store.toast.id} role="status"
                    className="fixed right-6 bottom-6 z-50 flex max-w-md items-center gap-3 rounded-xl bg-sidebar px-4 py-3 text-sm text-white shadow-xl">
                    <CheckCircle1 className="size-5 shrink-0 text-[#34D399]" />
                    <span className="flex-1">{store.toast.text}</span>
                    <button aria-label="ปิด" onClick={() => store.showToast("")} className="text-sidebar-ink hover:text-white"><Xmark className="size-4" /></button>
                </div>
            )}
        </div>
    )
}

// ไม่มีสิทธิ์เข้าหน้านี้ (ใช้ทั้งใน RoleShell และ Guard)
export function NoAccess({ roles, text }: { roles?: Role[], text?: string }) {
    const { user } = useStore();
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <h1 className="text-xl font-bold text-ink">ไม่มีสิทธิ์เข้าหน้านี้</h1>
            <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-ink-2">
                {text ?? <>หน้านี้สำหรับ {roles?.map((r) => <RoleBadge key={r} role={r} />)} เท่านั้น</>}
            </p>
            {user && <Link href={roleHome[primaryRole(user)]} className="text-sm font-semibold text-brand hover:underline">กลับหน้าแรกของฉัน</Link>}
        </div>
    )
}

// ตรวจสิทธิ์รายหน้า (หน้าที่อยู่ในกลุ่ม (app) ซึ่งหลายโรลใช้ร่วมกัน)
export function Guard({ roles, perm, children }: { roles: Role[], perm?: string, children: ReactNode }) {
    const store = useStore();
    const user = store.user;
    if (!user) return null;
    const mine = roles.filter((r) => user.roles.includes(r));
    if (mine.length === 0) return <NoAccess roles={roles} />;
    if (perm && !store.hasPerm(perm, mine)) return <NoAccess text="ผู้ดูแลระบบปิดสิทธิ์ของโรลคุณสำหรับหน้านี้" />;
    return <>{children}</>;
}
