'use client'

// โครงหน้าของทุกโรล: ตรวจว่าเข้าสู่ระบบแล้วและมีโรลนี้จริง แล้วแสดง Sidebar + เนื้อหา
// layout ของแต่ละกลุ่ม (requester), (approver), ... ส่ง role และ menu เข้ามา

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import Sidebar, { type MenuItem } from "@/components/sidebar";
import RoleBadge from "@/components/role-badge";
import { roleHome } from "@/data/requests";
import { useStore } from "@/data/store";
import { allRoles, type Role } from "@/data/users";
import { cn } from "@/utils/cn";

// เมนูไหนต้องใช้สิทธิ์ข้อไหน (ผู้ดูแลระบบปิดสิทธิ์ในหน้า "สิทธิ์โรล" แล้วเมนูจะหายไป)
const menuPermission: Record<string, string> = {
    "/requests/new": "submit",
    "/admin/dashboard": "dashboard",
    "/dashboard": "dashboard",
    "/admin/users": "users",
    "/admin/categories": "categories",
    "/admin/teams": "teams",
};

export default function RoleShell({ role, menu, children }: { role: Role, menu: MenuItem[], children: ReactNode }) {
    const store = useStore();
    const router = useRouter();
    const { ready, user, session } = store;

    // ยังไม่เข้าสู่ระบบ → ไปหน้า login
    useEffect(() => {
        if (ready && !user) router.replace("/login");
    }, [ready, user, router]);

    // เปิด URL ของโรลอื่นที่ตัวเองมี → สลับโรลให้อัตโนมัติ
    useEffect(() => {
        if (user && user.roles.includes(role) && session?.role !== role) store.switchRole(role);
    }, [user, role, session, store]);

    if (!ready || !user) {
        return <div className="flex min-h-screen items-center justify-center bg-page text-sm text-ink-3">กำลังโหลด...</div>
    }

    // ไม่มีโรลนี้ → ห้ามเข้า
    if (!user.roles.includes(role)) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page p-8 text-center">
                <h1 className="text-xl font-bold text-ink">ไม่มีสิทธิ์เข้าหน้านี้</h1>
                <p className="text-sm text-ink-2">หน้านี้สำหรับ <RoleBadge role={role} /> แต่บัญชีของคุณไม่มีโรลนี้</p>
                <Link href={roleHome[user.roles[0]]} className="text-sm font-semibold text-brand hover:underline">กลับหน้าแรกของฉัน</Link>
            </div>
        )
    }

    // จำนวนงานที่รออยู่ แสดงเป็นตัวเลขบนเมนู
    const counts: Record<string, number> = {
        "/requests": store.requests.filter((r) => r.requesterId === user.id && ["returned", "pending_acceptance"].includes(r.status)).length,
        "/approvals": store.requests.filter((r) => r.approverId === user.id && r.status === "pending_approval").length,
        "/incoming": store.requests.filter((r) => r.targetDept === user.dept && r.status === "pending_target").length,
        "/tasks": store.tasks.filter((t) => t.assigneeId === user.id && t.progress < 100 && !store.tasks.some((s) => s.parentId === t.id)
            && store.requests.find((r) => r.id === t.requestId)?.status === "in_progress").length,
    };

    const shownMenu = menu
        .filter((m) => {
            const pid = menuPermission[m.href];
            return !pid || store.permissions.find((p) => p.id === pid)?.roles.includes(role);
        })
        .map((m) => ({ ...m, count: counts[m.href] || undefined }));

    const otherRoles = allRoles.filter((r) => user.roles.includes(r));

    return (
        <div className="flex min-h-screen bg-page">
            <Sidebar menu={shownMenu} user={{ name: user.name, position: user.position, role }} />
            <main className="min-w-0 flex-1 px-8 pt-6 pb-12">
                {/* สลับโรล (แสดงเฉพาะคนที่มีหลายโรล) */}
                {otherRoles.length > 1 && (
                    <div className="mb-5 flex items-center gap-2 text-xs text-ink-2">
                        <span>สลับโรล:</span>
                        {otherRoles.map((r) => (
                            <Link key={r} href={roleHome[r]}
                                className={cn("rounded-md ring-offset-2", r === role ? "ring-2 ring-brand" : "opacity-70 hover:opacity-100")}>
                                <RoleBadge role={r} />
                            </Link>
                        ))}
                    </div>
                )}
                {children}
            </main>
        </div>
    )
}
