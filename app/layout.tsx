import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/data/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบจัดการคำขอพัฒนา/แก้ไขซอฟต์แวร์",
  description: "ส่งคำขอ อนุมัติ แบ่งงาน และติดตามความคืบหน้า",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* ข้อมูลกลางของทั้งระบบ (data/store.tsx) */}
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
