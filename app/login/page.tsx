'use client'

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import { TextField } from "@/components/tailgrids/core/text-field";
import { roleHome } from "@/data/requests";
import { useStore } from "@/data/store";



export default function Page() {
    const router = useRouter();
    const store = useStore();

    // states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");

    // เข้ามาหน้านี้ (รวมถึงกด "ออกจากระบบ" ที่ sidebar) → ล้างผู้ใช้ที่ล็อกอินไว้
    const { ready, logout } = store;
    useEffect(() => {
        if (ready) logout();
    }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

    // กดปุ่มเข้าสู่ระบบ
    const login = () => {
        // validate
        if (!email.trim() || !password.trim()) {
            setError("กรุณากรอกอีเมลและรหัสผ่าน");
            return;
        }
        // หาพนักงานจากอีเมล (prototype: รหัสผ่านอะไรก็ได้)
        const user = store.login(email, remember);
        if (!user) {
            setError("ไม่พบอีเมลนี้ในรายชื่อพนักงาน หรือบัญชียังไม่มีโรลในระบบ");
            return;
        }
        setError("");
        router.push(roleHome[user.roles[0]]);   // ไปหน้าแรกของโรลแรก
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-sidebar via-sidebar-active to-brand p-8">
            {/* ===== login card ===== */}
            <section className="flex w-[460px] flex-col gap-4 rounded-2xl bg-white p-8 shadow-2xl">
                {/* logo + title */}
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand text-lg font-semibold text-white">RQ</span>
                <div>
                    <h2 className="text-2xl font-bold text-ink">เข้าสู่ระบบ</h2>
                    <p className="text-sm text-ink-2">ใช้บัญชีพนักงานของบริษัท</p>
                </div>

                {/* email */}
                <TextField className="gap-1.5">
                    <Label className="font-medium text-ink">อีเมลพนักงาน</Label>
                    <Input placeholder="orawan.s@company.local" value={email} onChange={(e) => setEmail(e.target.value)} />
                </TextField>

                {/* password */}
                <TextField className="gap-1.5">
                    <Label className="font-medium text-ink">รหัสผ่าน</Label>
                    <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && login()} />
                </TextField>

                {/* remember me */}
                <div className="flex items-center gap-2 text-sm text-ink">
    <Checkbox id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
    <label htmlFor="remember" className="cursor-pointer">จดจำการเข้าสู่ระบบ</label>
</div>

                {/* error message (แสดงเมื่อมี error เท่านั้น) */}
                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button className="w-full" onPress={login}>เข้าสู่ระบบ</Button>




            </section>
        </div>
    )
}