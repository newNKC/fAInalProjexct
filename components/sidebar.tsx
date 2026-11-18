'use client'

// fix when fusion: ไฟล์กลาง ทุกคนต้องใช้ไฟล์นี้ตัวเดียวกันทุกตัวอักษร ตอนรวมเช็กว่าไม่มีใครแก้ต่างไปจากนี้

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Exit } from "@tailgrids/icons";
import { buttonStyles } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import RoleBadge from "@/components/role-badge";
import { cn } from "@/utils/cn";

// ชนิดข้อมูลของเมนู 1 อัน
export type MenuItem = {
    href: string
    label: string
    icon: ReactNode
    count?: number
    section?: string   // หัวข้อกลุ่มเมนู (ใช้ตอนผู้ใช้มีหลายโรล เช่น "ผู้ขอ", "หัวหน้าต้นสังกัด")
}

// ชนิดข้อมูลของผู้ใช้ที่แสดงด้านล่าง
export type SidebarUser = {
    name: string
    position: string
    role: "requester" | "approver" | "head" | "assignee" | "executive" | "admin"
}

// คลาสที่เมนูทุกอันใช้ร่วมกัน (รวมวงแสงที่โผล่เฉพาะตอนกด Tab)
const itemBase = "w-full justify-start gap-3 px-3 [&>svg]:size-[18px] focus:ring-0 focus-visible:ring-2 focus-visible:ring-brand/60"

export default function Sidebar({ menu, user, onLogout }: { menu: MenuItem[], user: SidebarUser, onLogout?: () => void }) {
    const pathname = usePathname();

    // เมนูที่ตรงกับ URL มากที่สุด (กัน "คำขอของฉัน" กับ "สร้างคำขอ" ติดสีพร้อมกัน)
    const activeHref = menu
        .filter((m) => pathname === m.href || pathname.startsWith(m.href + "/"))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    return (
        // sidebar container
        <aside className="sticky top-0 flex h-screen w-62 shrink-0 flex-col gap-1 bg-sidebar px-4 py-6">
            {/* logo */}
            <div className="mb-5 flex items-center gap-2.5 px-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-white">RQ</span>
                <div className="leading-tight">
                    <p className="text-sm font-semibold text-white">ระบบจัดการคำขอ</p>
                    <p className="text-xs text-sidebar-ink">Software Request</p>
                </div>
            </div>

            {!menu[0]?.section && <p className="px-2 pb-1 text-xs font-semibold text-sidebar-ink">เมนู</p>}

            {/* menu */}
            <nav className="flex flex-col gap-1 overflow-y-auto">
                {menu.map((item, i) => {
                    const active = item.href === activeHref;
                    const newSection = item.section && item.section !== menu[i - 1]?.section;
                    return (
                        <div key={item.href} className="contents">
                        {newSection && <p className={cn("px-2 pb-1 text-xs font-semibold text-sidebar-ink", i > 0 && "pt-3")}>{item.section}</p>}
                        <Link href={item.href}
                            className={cn(
                                buttonStyles({ variant: active ? "primary" : "ghost", appearance: "fill", size: "sm" }),
                                itemBase,
                                active ? "bg-sidebar-active text-white hover:bg-sidebar-active" : "text-sidebar-ink hover:bg-sidebar-active/60 hover:text-white",
                            )}
                        >
                            {item.icon}
                            <span className="flex-1">{item.label}</span>
                            {item.count ? <Badge size="sm" className="bg-brand text-white">{item.count}</Badge> : null}
                        </Link>
                        </div>
                    );
                })}
            </nav>

            {/* push bottom part down */}
            <div className="flex-1" />

            {/* logout */}
            {/* ออกจากระบบ: ล้างผู้ใช้ที่ล็อกอินแล้วกลับไป /login */}
            <Link href="/login" onClick={onLogout}
                className={cn(buttonStyles({ variant: "ghost", size: "sm" }), itemBase, "text-sidebar-ink hover:bg-sidebar-active/60 hover:text-white")}
            >
                <Exit />
                ออกจากระบบ
            </Link>

            {/* user box → หน้าบัญชีของฉัน (ข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน) */}
            <Link href="/account" title="บัญชีของฉัน" className="mt-1 flex items-center gap-2.5 rounded-xl bg-sidebar-active p-3 hover:ring-1 hover:ring-white/20">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">{user.name.slice(0, 1)}</span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{user.name} · {user.position}</p>
                    <RoleBadge role={user.role} className="mt-1" />
                </div>
            </Link>
        </aside>
    )
}
