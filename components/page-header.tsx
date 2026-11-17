'use client'

// หัวเพจทุกหน้า (ตาม Figma): ลิงก์ย้อนกลับ · ชื่อหน้า · ป้ายโรล + "มุมมองของ ..." · ช่องค้นหาคำขอ · กระดิ่ง · ปุ่มหลักของหน้า
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Bell1, Search1 } from "@tailgrids/icons";
import { Input } from "@/components/tailgrids/core/input";
import { actionItems } from "@/components/action-items";
import RoleBadge from "@/components/role-badge";
import StatusBadge from "@/components/status-badge";
import { displayStatus, nick, primaryRole } from "@/data/requests";
import { useStore } from "@/data/store";

type Props = {
    title: string
    back?: { href: string, label: string }
    subtitle?: string          // ข้อความแทน "มุมมองของ ..." (เช่น หน้า Dashboard)
    actions?: ReactNode
}

export default function PageHeader({ title, back, subtitle, actions }: Props) {
    const store = useStore();
    const user = store.user;

    // ชื่อแท็บเบราว์เซอร์ตามหน้าที่เปิด
    useEffect(() => { document.title = `${title} · ระบบจัดการคำขอ`; }, [title]);

    if (!user) return null;

    return (
        <div className="mb-6 flex items-start gap-4">
            <div className="min-w-0 flex-1">
                {back && (
                    <Link href={back.href} className="mb-1.5 inline-flex items-center gap-1.5 text-xs text-ink-2 hover:text-brand [&>svg]:size-4">
                        <ArrowLeft />{back.label}
                    </Link>
                )}
                <h1 className="text-2xl font-bold text-ink">{title}</h1>
                <div className="mt-1.5 flex items-center gap-2">
                    <RoleBadge role={primaryRole(user)} />
                    <span className="text-xs text-ink-2">{subtitle ?? `มุมมองของ ${nick(user.name)} · ${user.dept}`}</span>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 pt-2">
                <GlobalSearch />
                <NotificationBell />
                {actions}
            </div>
        </div>
    )
}

// ช่องค้นหารหัสหรือชื่อคำขอ (ค้นเฉพาะคำขอที่ผู้ใช้มีสิทธิ์ดู) · ↑↓ เลือก, Enter เปิด, Esc ปิด
function GlobalSearch() {
    const store = useStore();
    const router = useRouter();
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const term = q.trim().toLowerCase();
    const results = term ? store.requests.filter((r) => store.canSee(r) && (r.code.toLowerCase().includes(term) || r.title.toLowerCase().includes(term))).slice(0, 6) : [];

    const go = (id: number) => { setOpen(false); setQ(""); router.push(`/requests/${id}`); };

    return (
        <div className="relative w-64" role="search">
            <Search1 className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <Input type="search" aria-label="ค้นหารหัสหรือชื่อคำขอ" role="combobox" aria-expanded={open && !!term} aria-controls="search-results" aria-autocomplete="list"
                className="w-full py-2 pl-9 text-sm" placeholder="ค้นหารหัสหรือชื่อคำขอ" value={q}
                onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
                onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, results.length - 1)); }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].id); }
                    else if (e.key === "Escape") { setOpen(false); }
                }} />
            {open && term && (
                <ul id="search-results" role="listbox" className="absolute top-full right-0 z-20 mt-1 w-96 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-line">
                    {results.length === 0 && <li className="px-3 py-2 text-sm text-ink-3">ไม่พบคำขอที่ตรงกับ “{q}”</li>}
                    {results.map((r, i) => (
                        <li key={r.id} role="option" aria-selected={i === active}>
                            <Link href={`/requests/${r.id}`} onMouseEnter={() => setActive(i)} onClick={() => { setOpen(false); setQ(""); }}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${i === active ? "bg-page" : ""}`}>
                                <span className="text-xs text-ink-3">{r.code}</span>
                                <span className="flex-1 truncate text-ink">{r.title}</span>
                                <StatusBadge status={displayStatus(r)} />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// กระดิ่ง: งานที่รอผู้ใช้คนนี้ทำ
function NotificationBell() {
    const store = useStore();
    const [open, setOpen] = useState(false);
    const items = actionItems(store);
    const total = items.reduce((s, i) => s + i.count, 0);

    return (
        <div className="relative">
            <button aria-label={`การแจ้งเตือน ${total} รายการ`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                className="relative flex size-10 items-center justify-center rounded-lg bg-white text-ink-2 ring-1 ring-line hover:text-brand">
                <Bell1 className="size-[18px]" />
                {total > 0 && <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#E11D48] text-[10px] font-bold text-white">{total}</span>}
            </button>
            {open && (
                <div className="absolute top-full right-0 z-20 mt-1 w-72 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-line">
                    <p className="px-3 py-2 text-xs font-semibold text-ink-2">งานที่รอคุณ</p>
                    {items.length === 0 && <p className="px-3 pb-2 text-sm text-ink-3">ไม่มีงานค้าง</p>}
                    {items.map((i) => (
                        <Link key={i.label} href={i.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-page">
                            <span className="flex-1 text-ink">{i.label}</span>
                            <span className="rounded-full bg-brand-soft px-2 text-xs font-semibold text-brand-strong">{i.count}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
