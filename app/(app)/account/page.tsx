'use client'

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle1, Eye, EyeDisabled, InfoCircle, Locked3 } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import Banner from "@/components/banner";
import PageHeader from "@/components/page-header";
import { Card } from "@/components/request-parts";
import RoleBadge from "@/components/role-badge";
import { passwordRules } from "@/data/auth";
import { homeFor } from "@/data/menus";
import { useStore } from "@/data/store";
import { cn } from "@/utils/cn";

// บัญชีของฉัน: ข้อมูลพนักงาน (จาก HR แก้ไม่ได้) + เปลี่ยนรหัสผ่าน
export default function Page() {
    const store = useStore();
    const router = useRouter();
    const required = useSearchParams().get("required") === "1" || store.mustChangePassword;
    const user = store.user!;

    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");

    const failing = passwordRules.filter((r) => !r.test(next));
    const mismatch = confirm.length > 0 && confirm !== next;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!current || !next || !confirm) return setError("กรุณากรอกให้ครบทุกช่อง");
        if (failing.length) return setError(`รหัสผ่านใหม่ยังไม่ผ่านเงื่อนไข: ${failing.map((r) => r.label).join(", ")}`);
        if (next !== confirm) return setError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
        const err = store.changePassword(current, next);
        if (err) return setError(err);
        setError(""); setCurrent(""); setNext(""); setConfirm("");
        store.showToast("เปลี่ยนรหัสผ่านแล้ว");
        if (required) router.replace(homeFor(user, store.hasPerm));
    }

    const field = (id: string, label: string, value: string, set: (v: string) => void, auto: string, extra?: ReactNode) => (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
            <Input id={id} type={show ? "text" : "password"} autoComplete={auto} value={value} onChange={(e) => set(e.target.value)} />
            {extra}
        </div>
    );

    const info: [string, string][] = [["ชื่อ-นามสกุล", user.name], ["อีเมล", user.email], ["แผนก", user.dept], ["ตำแหน่ง", user.position]];

    return (
        <>
            <PageHeader title="บัญชีของฉัน" />
            {required && (
                <Banner tone="warning" icon={<Locked3 />} className="mb-4">
                    คุณกำลังใช้รหัสผ่านชั่วคราวจากผู้ดูแลระบบ กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งานต่อ
                </Banner>
            )}
            <div className="grid grid-cols-[1fr_26rem] items-start gap-6">
                <Card title="ข้อมูลพนักงาน" hint="ข้อมูลจากฝ่ายบุคคล (HR) · ถ้าไม่ถูกต้องให้แจ้งฝ่ายบุคคล">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        {info.map(([k, v]) => (
                            <div key={k}><dt className="text-xs text-ink-3">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
                        ))}
                        <div className="col-span-2">
                            <dt className="text-xs text-ink-3">โรลในระบบ</dt>
                            <dd className="mt-1 flex flex-wrap gap-1">{user.roles.map((r) => <RoleBadge key={r} role={r} />)}</dd>
                        </div>
                    </dl>
                </Card>

                <Card title="เปลี่ยนรหัสผ่าน">
                    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                        {/* ช่องชื่อผู้ใช้ซ่อนไว้ให้ตัวจัดการรหัสผ่านของเบราว์เซอร์รู้ว่าเป็นบัญชีไหน */}
                        <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
                        {field("current", "รหัสผ่านปัจจุบัน", current, setCurrent, "current-password")}
                        {field("new", "รหัสผ่านใหม่", next, setNext, "new-password",
                            <ul className="mt-1 flex flex-col gap-0.5 text-xs">
                                {passwordRules.map((r) => {
                                    const ok = r.test(next);
                                    return <li key={r.label} className={cn("flex items-center gap-1.5", ok ? "text-[#047857]" : "text-ink-3")}>
                                        <CheckCircle1 className={cn("size-3.5", !ok && "opacity-40")} />{r.label}
                                    </li>;
                                })}
                            </ul>)}
                        {field("confirm", "ยืนยันรหัสผ่านใหม่", confirm, setConfirm, "new-password",
                            mismatch && <span className="text-xs text-red-600">รหัสผ่านไม่ตรงกัน</span>)}
                        <button type="button" onClick={() => setShow((s) => !s)} className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
                            {show ? <EyeDisabled className="size-4" /> : <Eye className="size-4" />}{show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        </button>
                        {error && <p role="alert" className="flex items-start gap-2 text-sm text-red-600"><InfoCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}
                        <Button type="submit" size="sm" >บันทึกรหัสผ่านใหม่</Button>
                    </form>
                </Card>
            </div>
        </>
    )
}
