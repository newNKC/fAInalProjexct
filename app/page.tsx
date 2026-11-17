import { redirect } from "next/navigation";

// หน้าแรกของเว็บ → ไปหน้าเข้าสู่ระบบ
export default function Home() {
  redirect("/login");
}
