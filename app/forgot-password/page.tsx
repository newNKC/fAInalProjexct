'use client'

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Envelope1 } from "@tailgrids/icons";
import AuthLayout from "@/components/auth-layout";
import { nick } from "@/data/requests";
import { useStore } from "@/data/store";

// ลืมรหัสผ่าน: ระบบภายในบริษัทให้ผู้ดูแลระบบรีเซ็ตให้ (ได้รหัสชั่วคราว แล้วตั้งใหม่ตอนเข้าสู่ระบบ)
export default function Page() {
    const store = useStore();
    const admins = store.users.filter((u) => u.roles.includes("admin"));
    useEffect(() => { document.title = "ลืมรหัสผ่าน · ระบบจัดการคำขอ"; }, []);

    return (
        <AuthLayout>
            <div className="flex flex-col gap-5 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-line">
                <div>
                    <h2 className="text-2xl font-bold text-ink">ลืมรหัสผ่าน</h2>
                    <p className="mt-1 text-sm text-ink-2">ติดต่อผู้ดูแลระบบเพื่อขอรีเซ็ตรหัสผ่าน คุณจะได้รหัสผ่านชั่วคราว และต้องตั้งรหัสผ่านใหม่ทันทีที่เข้าสู่ระบบ</p>
                </div>
                <ol className="flex flex-col gap-2 text-sm text-ink-2">
                    <li><span className="font-semibold text-ink">1.</span> แจ้งอีเมลพนักงานของคุณกับผู้ดูแลระบบ</li>
                    <li><span className="font-semibold text-ink">2.</span> รับรหัสผ่านชั่วคราวจากผู้ดูแลระบบ</li>
                    <li><span className="font-semibold text-ink">3.</span> เข้าสู่ระบบแล้วตั้งรหัสผ่านใหม่</li>
                </ol>
                {admins.length > 0 && (
                    <div>
                        <p className="mb-2 text-xs font-semibold text-ink-2">ผู้ดูแลระบบ</p>
                        <ul className="flex flex-col gap-2">
                            {admins.map((a) => (
                                <li key={a.id}>
                                    <a href={`mailto:${a.email}?subject=${encodeURIComponent("ขอรีเซ็ตรหัสผ่านระบบจัดการคำขอ")}`}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm ring-1 ring-line hover:bg-page">
                                        <Envelope1 className="size-4 text-brand" />
                                        <span className="flex-1"><span className="font-medium text-ink">{nick(a.name)}</span> <span className="text-xs text-ink-3">· {a.position}</span></span>
                                        <span className="text-xs text-ink-2">{a.email}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><ArrowLeft className="size-4" />กลับไปหน้าเข้าสู่ระบบ</Link>
            </div>
        </AuthLayout>
    )
}
