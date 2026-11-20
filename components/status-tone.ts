import type { CSSProperties } from "react";
import type { DisplayStatus } from "@/data/requests";

// สีพื้นแถวตามสถานะ (ใช้คู่กับคลาส .tone-row / .tone-item ใน request-ui.css)
// bg = พื้นอ่อนทั้งแถว · accent = แถบเข้มด้านซ้าย 4px ให้แยกสถานะได้ชัดแม้มองผ่าน ๆ
// โทนสีตรงกับป้ายสถานะในตาราง (StatusTag) เช่น เสร็จสิ้น = เขียว, รออนุมัติ = เหลือง, กำลังดำเนินการ = ฟ้า
export const STATUS_TONE: Record<DisplayStatus, { bg: string; accent: string }> = {
    pending_approval: { bg: "#FEF5DC", accent: "#D97706" },   // รออนุมัติ · เหลือง
    returned: { bg: "#F1ECFF", accent: "#7C3AED" },           // ส่งกลับแก้ไข · ม่วง
    pending_target: { bg: "#EDF0F5", accent: "#64748B" },     // รอแผนกปลายทาง · เทา
    rejected: { bg: "#FCEAEA", accent: "#DC2626" },           // ปฏิเสธ · แดง
    in_progress: { bg: "#E6F0FF", accent: "#2563EB" },        // กำลังดำเนินการ · ฟ้า
    pending_acceptance: { bg: "#E0F7FA", accent: "#0891B2" }, // รอตรวจรับ · ฟ้าอมเขียว
    done: { bg: "#E3F6EA", accent: "#16A34A" },               // เสร็จสิ้น · เขียว
    done_late: { bg: "#EEF7DC", accent: "#CA8A04" },          // เสร็จสิ้นแต่ส่งมอบช้า · เขียวอมเหลือง แถบซ้ายสีส้มเหลือง
    overdue: { bg: "#FDE4E4", accent: "#B91C1C" },            // เกินกำหนด · แดงเข้ม
    fix: { bg: "#FFEEDB", accent: "#EA580C" },                // ขอให้แก้ไข · ส้ม
};

export const toneStyle = (status: DisplayStatus) =>
    ({ "--row-bg": STATUS_TONE[status].bg, "--row-accent": STATUS_TONE[status].accent }) as CSSProperties;
