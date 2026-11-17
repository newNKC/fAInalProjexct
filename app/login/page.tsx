'use client'

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle1 } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import { TextField } from "@/components/tailgrids/core/text-field";
import RoleBadge from "@/components/role-badge";
import { nick, primaryRole, roleHome } from "@/data/requests";
import { useStore } from "@/data/store";
import type { User } from "@/data/users";

// บัญชีทดลอง 6 โรล (ตาม Figma "ทดลองเข้าใช้ตามโรล")
const demoEmails = [
    "requester.sales@company.local",
    "approver.sales@company.local",
    "head.it@company.local",
    "assignee.it@company.local",
    "executive.mgmt@company.local",
    "admin.it@company.local",
];

export default function Page() {
    const router = useRouter();
    const store = useStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");

    // เข้าสู่ระบบอยู่แล้ว (เช่น กดย้อนกลับมาหน้านี้) → พากลับหน้าแรกของตัวเอง ไม่ล็อกเอาต์เอง
    // ออกจากระบบทำได้จากปุ่ม "ออกจากระบบ" ใน sidebar เท่านั้น
    const { ready, user } = store;
    useEffect(() => {
        if (ready && user) router.replace(roleHome[primaryRole(user)]);
    }, [ready, user, router]);

    useEffect(() => { document.title = "เข้าสู่ระบบ · ระบบจัดการคำขอ"; }, []);

    const go = (user: User) => router.push(roleHome[primaryRole(user)]);

    const login = (e?: FormEvent) => {
        e?.preventDefault();
        if (!email.trim() || !password.trim()) return setError("กรุณากรอกอีเมลและรหัสผ่าน");
        const user = store.login(email, remember);   // prototype: รหัสผ่านอะไรก็ได้
        if (!user) return setError("ไม่พบอีเมลนี้ในรายชื่อพนักงาน หรือบัญชียังไม่มีโรลในระบบ");
        setError("");
        go(user);
    }

    const demos = demoEmails.map((e) => store.users.find((u) => u.email === e)).filter((u): u is User => !!u && u.roles.length > 0);

    return (
        <div className="grid min-h-screen grid-cols-[1.1fr_1fr] bg-page">
            {/* ===== ฝั่งแบรนด์ ===== */}
            <section className="flex flex-col justify-between bg-linear-to-br from-sidebar via-sidebar-active to-brand p-12 text-white">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-sm font-semibold">RQ</span>
                    <div className="leading-tight"><p className="font-semibold">ระบบจัดการคำขอ</p><p className="text-xs text-sidebar-ink">Software Request</p></div>
                </div>
                <div className="max-w-md">
                    <h1 className="text-4xl leading-tight font-bold">ส่งคำขอ ติดตามงาน<br />ในที่เดียว</h1>
                    <p className="mt-4 text-sm text-white/80">ขอพัฒนาหรือแก้ไขซอฟต์แวร์ได้จากหน้าเดียว หัวหน้าอนุมัติ แผนกปลายทางแบ่งงาน และคุณเห็นความคืบหน้าทุกขั้น</p>
                    <ul className="mt-6 flex flex-col gap-3 text-sm">
                        {["ส่งคำขอพร้อมไฟล์แนบ ไม่ต้องส่งต่อทางแชท", "รู้ว่าคำขออยู่ขั้นไหน ใครกำลังทำ กี่เปอร์เซ็นต์", "ผู้บริหารเห็นภาพรวมและงานเกินกำหนดทันที"].map((t) => (
                            <li key={t} className="flex items-center gap-2.5"><CheckCircle1 className="size-5 text-[#A5B4FC]" />{t}</li>
                        ))}
                    </ul>
                </div>
                <p className="text-xs text-white/60">Prototype · ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น</p>
            </section>

            {/* ===== ฟอร์มเข้าสู่ระบบ ===== */}
            <section className="flex items-center justify-center p-10">
                <div className="flex w-[440px] flex-col gap-4">
                    <form onSubmit={login} noValidate className="flex flex-col gap-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-line">
                        <div>
                            <h2 className="text-2xl font-bold text-ink">เข้าสู่ระบบ</h2>
                            <p className="text-sm text-ink-2">ใช้บัญชีพนักงานของบริษัท</p>
                        </div>
                        <TextField className="gap-1.5">
                            <Label className="font-medium text-ink">อีเมลพนักงาน</Label>
                            <Input name="username" autoComplete="username" autoFocus placeholder="เช่น requester.sales" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </TextField>
                        <TextField className="gap-1.5">
                            <Label className="font-medium text-ink">รหัสผ่าน</Label>
                            <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </TextField>
                        <div className="flex items-center gap-2 text-sm text-ink">
                            <Checkbox id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                            <label htmlFor="remember" className="cursor-pointer">จดจำการเข้าสู่ระบบ</label>
                        </div>
                        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                        <Button className="w-full" type="submit">เข้าสู่ระบบ</Button>
                    </form>

                    {/* ทางลัดสำหรับทดลอง */}
                    <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
                        <p className="text-sm font-semibold text-ink">ทดลองเข้าใช้ตามโรล (prototype)</p>
                        <p className="mb-3 text-xs text-ink-3">กดชื่อเพื่อเข้าสู่ระบบเป็นคนนั้นทันที</p>
                        <ul className="flex flex-col gap-1">
                            {demos.map((u) => (
                                <li key={u.id}>
                                    <button type="button" onClick={() => { const found = store.login(u.email, remember); if (found) go(found); }}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-page">
                                        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">{u.name.slice(0, 1)}</span>
                                        <span className="flex-1"><span className="font-medium text-ink">{nick(u.name)}</span><span className="text-xs text-ink-3"> · {u.dept}</span></span>
                                        <RoleBadge role={primaryRole(u)} />
                                        <ArrowRight className="size-4 text-ink-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    )
}
