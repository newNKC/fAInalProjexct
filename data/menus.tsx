import {
    Bookmark1, CheckCircle1, DashboardSquare1, DoubleCheckMark, FileTextMultiple, LetterBox,
    Plus, Shield1Check, UserMultiple1, UserMultiple4,
} from "@tailgrids/icons";
import type { MenuItem } from "@/components/sidebar";
import type { Role } from "@/data/users";

// เมนูของแต่ละโรล · คนที่มีหลายโรลจะเห็นเมนูของทุกโรลต่อกันใน sidebar (แยกหัวข้อตามโรล)
export const roleMenus: Record<Role, MenuItem[]> = {
    requester: [
        { href: "/requests", label: "คำขอของฉัน", icon: <FileTextMultiple /> },
        { href: "/requests/new", label: "สร้างคำขอ", icon: <Plus /> },
    ],
    approver: [
        { href: "/approvals", label: "พิจารณาคำขอ", icon: <CheckCircle1 /> },
    ],
    head: [
        { href: "/incoming", label: "คำขอเข้าแผนก", icon: <LetterBox /> },
        { href: "/workload", label: "ภาระงานทีม", icon: <UserMultiple4 /> },
    ],
    assignee: [
        { href: "/tasks", label: "งานของฉัน", icon: <DoubleCheckMark /> },
    ],
    executive: [
        { href: "/dashboard", label: "Dashboard", icon: <DashboardSquare1 /> },
    ],
    admin: [
        { href: "/admin/dashboard", label: "Dashboard", icon: <DashboardSquare1 /> },
        { href: "/admin/users", label: "จัดการผู้ใช้", icon: <UserMultiple1 /> },
        { href: "/admin/categories", label: "หมวดคำขอ", icon: <Bookmark1 /> },
        { href: "/admin/permissions", label: "สิทธิ์โรล", icon: <Shield1Check /> },
        { href: "/admin/teams", label: "ทีม", icon: <UserMultiple4 /> },
    ],
};
