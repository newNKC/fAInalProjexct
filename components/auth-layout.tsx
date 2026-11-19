import type { ReactNode } from "react";
import { CheckCircle1 } from "@tailgrids/icons";

// โครงหน้าก่อนเข้าสู่ระบบ (เข้าสู่ระบบ / ลืมรหัสผ่าน): ซ้ายแบรนด์ ขวาฟอร์ม (ตาม Figma)
export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="grid min-h-screen grid-cols-1 bg-page lg:grid-cols-[1.1fr_1fr]">
            <section className="hidden flex-col justify-between bg-linear-to-br from-sidebar via-sidebar-active to-brand p-12 text-white lg:flex">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-sm font-semibold">RQ</span>
                    <div className="leading-tight"><p className="font-semibold">ระบบจัดการคำขอ</p><p className="text-xs text-sidebar-ink">Software Request</p></div>
                </div>
                <div className="max-w-md">
                    <h1 className="text-4xl leading-tight font-bold">ส่งคำขอ ติดตามงาน<br />ในที่เดียว</h1>
                    <p className="mt-4 text-sm text-white/90">ขอพัฒนาหรือแก้ไขซอฟต์แวร์ได้จากหน้าเดียว หัวหน้าอนุมัติ แผนกปลายทางแบ่งงาน และคุณเห็นความคืบหน้าทุกขั้น</p>
                    <ul className="mt-6 flex flex-col gap-3 text-sm">
                        {["ส่งคำขอพร้อมไฟล์แนบ ไม่ต้องส่งต่อทางแชท", "รู้ว่าคำขออยู่ขั้นไหน ใครกำลังทำ กี่เปอร์เซ็นต์", "ผู้บริหารเห็นภาพรวมและงานเกินกำหนดทันที"].map((t) => (
                            <li key={t} className="flex items-center gap-2.5"><CheckCircle1 className="size-5 text-[#A5B4FC]" />{t}</li>
                        ))}
                    </ul>
                </div>
                <p className="text-xs text-white/85">© 2569 ระบบจัดการคำขอพัฒนา/แก้ไขซอฟต์แวร์</p>
            </section>
            <section className="flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-[420px]">{children}</div>
            </section>
        </div>
    )
}
