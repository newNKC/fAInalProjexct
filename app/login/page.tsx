'use client'

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Eye, EyeDisabled, InfoCircle } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Input } from "@/components/tailgrids/core/input";
import AuthLayout from "@/components/auth-layout";
import { EMAIL_DOMAIN } from "@/data/auth";
import { primaryRole, roleHome } from "@/data/requests";
import { useStore } from "@/data/store";
import type { User } from "@/data/users";

export default function Page() {
    return <Suspense><Login /></Suspense>
}

// กลับไปหน้าที่ตั้งใจจะเปิดก่อนถูกพามาเข้าสู่ระบบ (รับเฉพาะ path ภายในเว็บนี้)
const safeNext = (next: string | null) => next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : null;

function Login() {
    const router = useRouter();
    const params = useSearchParams();
    const store = useStore();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [remember, setRemember] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [error, setError] = useState("");
    const [fieldErr, setFieldErr] = useState<{ email?: string, password?: string }>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => { document.title = "เข้าสู่ระบบ · ระบบจัดการคำขอ"; }, []);

    const go = (user: User, mustChange: boolean) => {
        if (mustChange) return router.replace("/account?required=1");
        router.replace(safeNext(params.get("next")) ?? roleHome[primaryRole(user)]);
    }

    // เข้าสู่ระบบอยู่แล้ว (เช่น กดย้อนกลับมาหน้านี้) → ไปหน้าแรกของตัวเอง
    const { ready, user } = store;
    useEffect(() => {
        if (ready && user) go(user, store.mustChangePassword);
    }, [ready, user]); // eslint-disable-line react-hooks/exhaustive-deps

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const fe: typeof fieldErr = {};
        if (!email.trim()) fe.email = "กรุณากรอกอีเมล";
        if (!password) fe.password = "กรุณากรอกรหัสผ่าน";
        setFieldErr(fe);
        setError("");
        if (fe.email || fe.password) {
            document.getElementById(fe.email ? "email" : "password")?.focus();
            return;
        }
        setBusy(true);
        const res = await store.login(email, password, remember);
        setBusy(false);
        if (!res.ok) {
            setError(res.error);
            setPassword("");
            document.getElementById("password")?.focus();
            return;
        }
        go(res.user, res.mustChange);
    }

    const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

    return (
        <AuthLayout>
            <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-line">
                <div>
                    <h2 className="text-2xl font-bold text-ink">เข้าสู่ระบบ</h2>
                    <p className="text-sm text-ink-2">ใช้อีเมลและรหัสผ่านพนักงานของบริษัท</p>
                </div>

                {params.get("reason") === "expired" && !error && (
                    <p className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-strong"><InfoCircle className="size-4 shrink-0" />กรุณาเข้าสู่ระบบเพื่อใช้งานต่อ</p>
                )}
                {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-[#FFE4E6] px-3 py-2 text-sm text-[#BE123C]"><InfoCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-ink">อีเมล</label>
                    <Input id="email" name="username" type="text" inputMode="email" autoComplete="username" autoFocus autoCapitalize="none" spellCheck={false}
                        placeholder={`name@${EMAIL_DOMAIN}`} value={email} onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={!!fieldErr.email} aria-describedby={fieldErr.email ? "email-err" : undefined} />
                    {fieldErr.email && <span id="email-err" className="text-xs text-red-600">{fieldErr.email}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-sm font-medium text-ink">รหัสผ่าน</label>
                        <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">ลืมรหัสผ่าน?</Link>
                    </div>
                    <div className="relative">
                        <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" className="w-full pr-11"
                            value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={onKey} onKeyDown={onKey}
                            aria-invalid={!!fieldErr.password} aria-describedby={fieldErr.password ? "password-err" : undefined} />
                        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={show}
                            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-ink-3 hover:text-ink">
                            {show ? <EyeDisabled className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    {fieldErr.password && <span id="password-err" className="text-xs text-red-600">{fieldErr.password}</span>}
                    {capsLock && <span className="text-xs text-[#B45309]">Caps Lock เปิดอยู่</span>}
                </div>

                <div className="flex items-center gap-2 text-sm text-ink">
                    <Checkbox id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    <label htmlFor="remember" className="cursor-pointer">จดจำการเข้าสู่ระบบในเครื่องนี้</label>
                </div>

                <Button className="w-full" type="submit" disabled={busy || !ready}>{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</Button>
            </form>
            <p className="mt-4 text-center text-xs text-ink-3">ยังไม่มีบัญชีหรือเข้าสู่ระบบไม่ได้ ติดต่อผู้ดูแลระบบของบริษัท</p>
        </AuthLayout>
    )
}
