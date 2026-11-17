import type { Role, User } from "@/data/users";

// สถานะของคำขอ 7 แบบ (ตาม SRS หัวข้อ 2.2.4)
export type Status =
    | "pending_approval"     // รออนุมัติ
    | "returned"             // ส่งกลับแก้ไข
    | "pending_target"       // รอแผนกปลายทาง
    | "rejected"             // ปฏิเสธ
    | "in_progress"          // กำลังดำเนินการ
    | "pending_acceptance"   // รอตรวจรับ
    | "done"                 // เสร็จสิ้น

// ไฟล์แนบ (prototype เก็บแค่ชื่อและขนาด ไม่ได้เก็บไฟล์จริง)
export type Attachment = {
    name: string
    size: number
}

// คำขอ 1 รายการ
export type Request = {
    id: number
    code: string              // เลขที่คำขอ เช่น REQ-2026-0001
    title: string
    detail: string
    categoryId: number
    targetDept: string        // แผนกปลายทาง
    dueDate: string           // วันที่ต้องการ (YYYY-MM-DD)
    requesterId: number
    approverId: number | null
    status: Status
    attachments: Attachment[]
    createdAt: string         // ISO
}

// งานหลัก / งานย่อย (งานย่อยมี parentId)
export type Task = {
    id: number
    requestId: number
    parentId: number | null
    title: string
    assigneeId: number
    dueDate: string
    progress: number          // 0-100
}

// ประวัติคำขอ 1 แถว
export type Log = {
    id: number
    requestId: number
    actorId: number
    action: string
    fromStatus: Status | null
    toStatus: Status
    reason: string
    createdAt: string
}

// ===== helpers =====

// หัวหน้าต้นสังกัดของผู้ขอ = คนในแผนกเดียวกันที่มีโรล approver (ไม่ใช่ตัวเอง)
export const findApprover = (users: User[], requester: User) =>
    users.find((u) => u.dept === requester.dept && u.id !== requester.id && u.roles.includes("approver")) ?? null

// คนนี้พิจารณาคำขอนี้ได้ไหม: เป็นหัวหน้าต้นสังกัด (approver) แผนกเดียวกับผู้ขอ และไม่ใช่คำขอของตัวเอง
// เช็กจากโรลปัจจุบันทุกครั้ง ไม่ได้ล็อกผู้อนุมัติไว้ตอนส่ง → คนที่เพิ่งได้โรล approver เห็นคำขอที่รออยู่ทันที
export const canApprove = (users: User[], user: User, r: Request) => {
    const requester = users.find((u) => u.id === r.requesterId);
    return r.status === "pending_approval" && user.roles.includes("approver")
        && !!requester && requester.dept === user.dept && requester.id !== user.id
}

// หัวหน้าแผนก = คนในแผนกที่มีโรล head
export const findHead = (users: User[], dept: string) =>
    users.find((u) => u.dept === dept && u.roles.includes("head")) ?? null

// ความคืบหน้างานหลัก 1 งาน = เฉลี่ยงานย่อย (ถ้าไม่มีงานย่อยใช้ของตัวเอง)
export const taskProgress = (task: Task, tasks: Task[]) => {
    const subs = tasks.filter((t) => t.parentId === task.id);
    if (subs.length === 0) return task.progress;
    return Math.round(subs.reduce((sum, t) => sum + t.progress, 0) / subs.length);
}

// ความคืบหน้าของคำขอ = เฉลี่ยงานหลักทั้งหมด
export const requestProgress = (requestId: number, tasks: Task[]) => {
    const mains = tasks.filter((t) => t.requestId === requestId && t.parentId === null);
    if (mains.length === 0) return 0;
    return Math.round(mains.reduce((sum, t) => sum + taskProgress(t, tasks), 0) / mains.length);
}

// งานที่ผู้รับงานต้องรายงานเอง = งานย่อย + งานหลักที่ไม่มีงานย่อย
export const isLeafTask = (task: Task, tasks: Task[]) =>
    !tasks.some((t) => t.parentId === task.id)

// เกินกำหนดหรือยัง (ยังไม่จบ และวันที่ต้องการผ่านไปแล้ว)
export const isOverdue = (r: Request, today = new Date().toISOString().slice(0, 10)) =>
    !["done", "rejected"].includes(r.status) && r.dueDate < today

// วันที่แบบไทยสั้น เช่น 18 พ.ย. 69
const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
export const thaiDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()} ${months[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`
}
export const thaiDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${thaiDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

// หน้าแรกของแต่ละโรลหลังเข้าสู่ระบบ
export const roleHome: Record<Role, string> = {
    requester: "/requests",
    approver: "/approvals",
    head: "/incoming",
    assignee: "/tasks",
    executive: "/dashboard",
    admin: "/admin/dashboard",
}

// ===== ข้อมูลตัวอย่าง (เริ่มต้น) =====
// คนในข้อมูลตัวอย่าง: 1 แอน, 2 เอก, 3 สมศักดิ์ (ฝ่ายขาย) · 4 วิชัย (หัวหน้า IT), 5 ต้น, 6 พลอย, 7 เก่ง (IT)

const at = (day: number, hour = 9) => `2026-11-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+07:00`

export const seedRequests: Request[] = [
    { id: 1, code: "REQ-2026-0001", title: "เพิ่มรายงานยอดขายรายเดือนในระบบ CRM", detail: "ฝ่ายขายต้องการรายงานยอดขายแยกตามพนักงานและเดือน ส่งออกเป็น Excel ได้", categoryId: 2, targetDept: "แผนก IT", dueDate: "2026-12-10", requesterId: 1, approverId: 3, status: "in_progress", attachments: [{ name: "ตัวอย่างรายงาน.xlsx", size: 24576 }], createdAt: at(2) },
    { id: 2, code: "REQ-2026-0002", title: "แก้บั๊กพิมพ์ใบเสนอราคาแล้วตัวหนังสือไทยเพี้ยน", detail: "กดพิมพ์ใบเสนอราคาเป็น PDF แล้วสระลอย ตัวอักษรซ้อนกัน", categoryId: 1, targetDept: "แผนก IT", dueDate: "2026-11-25", requesterId: 2, approverId: null, status: "pending_approval", attachments: [{ name: "ภาพหน้าจอ.png", size: 182400 }], createdAt: at(16, 14) },
    { id: 3, code: "REQ-2026-0003", title: "ขอสิทธิ์ส่งออกข้อมูลลูกค้าจาก CRM", detail: "ต้องการส่งออกรายชื่อลูกค้าเพื่อทำแคมเปญสิ้นปี", categoryId: 3, targetDept: "แผนก IT", dueDate: "2026-11-16", requesterId: 1, approverId: 3, status: "pending_target", attachments: [], createdAt: at(12) },
    { id: 4, code: "REQ-2026-0004", title: "เพิ่มช่องส่วนลดพิเศษในใบเสนอราคา", detail: "ต้องการกรอกส่วนลดเป็นเปอร์เซ็นต์ได้", categoryId: 4, targetDept: "แผนก IT", dueDate: "2026-12-20", requesterId: 2, approverId: 3, status: "returned", attachments: [], createdAt: at(10) },
    { id: 5, code: "REQ-2026-0005", title: "ปรับหน้าค้นหาลูกค้าให้ค้นด้วยเบอร์โทรได้", detail: "ตอนนี้ค้นได้แค่ชื่อ อยากค้นด้วยเบอร์โทรด้วย", categoryId: 4, targetDept: "แผนก IT", dueDate: "2026-11-20", requesterId: 1, approverId: 3, status: "pending_acceptance", attachments: [], createdAt: at(3) },
    { id: 6, code: "REQ-2026-0006", title: "แก้ยอดรวมภาษีในใบแจ้งหนี้คำนวณผิด", detail: "ยอดภาษีปัดเศษผิด 1 สตางค์", categoryId: 1, targetDept: "แผนก IT", dueDate: "2026-11-10", requesterId: 3, approverId: null, status: "done", attachments: [], createdAt: at(1) },
    { id: 7, code: "REQ-2026-0007", title: "ปรับปรุงหน้าเข้าสู่ระบบของระบบลางาน", detail: "เพิ่มปุ่มแสดงรหัสผ่านและข้อความแจ้งเตือนภาษาไทย", categoryId: 4, targetDept: "แผนก IT", dueDate: "2026-12-15", requesterId: 5, approverId: 4, status: "pending_target", attachments: [], createdAt: at(14) },
    { id: 8, code: "REQ-2026-0008", title: "ขอทำแอปมือถือสำหรับฝ่ายขาย", detail: "อยากได้แอปมือถือที่ทำทุกอย่างเหมือน CRM", categoryId: 2, targetDept: "แผนก IT", dueDate: "2026-11-15", requesterId: 2, approverId: 3, status: "rejected", attachments: [], createdAt: at(4) },
]

export const seedTasks: Task[] = [
    // คำขอ 1: กำลังดำเนินการ
    { id: 1, requestId: 1, parentId: null, title: "ออกแบบหน้ารายงาน", assigneeId: 5, dueDate: "2026-11-28", progress: 0 },
    { id: 2, requestId: 1, parentId: 1, title: "ร่างหน้าจอรายงาน", assigneeId: 5, dueDate: "2026-11-20", progress: 100 },
    { id: 3, requestId: 1, parentId: 1, title: "เขียนคำสั่งดึงยอดขาย", assigneeId: 6, dueDate: "2026-11-26", progress: 60 },
    { id: 4, requestId: 1, parentId: null, title: "ทดสอบรายงาน", assigneeId: 7, dueDate: "2026-12-05", progress: 0 },
    // คำขอ 5: รอตรวจรับ (ครบ 100 แล้ว)
    { id: 5, requestId: 5, parentId: null, title: "เพิ่มการค้นด้วยเบอร์โทร", assigneeId: 6, dueDate: "2026-11-15", progress: 100 },
    { id: 6, requestId: 5, parentId: null, title: "ทดสอบการค้นหา", assigneeId: 7, dueDate: "2026-11-17", progress: 100 },
    // คำขอ 6: เสร็จสิ้น
    { id: 7, requestId: 6, parentId: null, title: "แก้สูตรปัดเศษภาษี", assigneeId: 5, dueDate: "2026-11-06", progress: 100 },
]

export const seedLogs: Log[] = [
    { id: 1, requestId: 1, actorId: 1, action: "ส่งคำขอ", fromStatus: null, toStatus: "pending_approval", reason: "", createdAt: at(2) },
    { id: 2, requestId: 1, actorId: 3, action: "อนุมัติ", fromStatus: "pending_approval", toStatus: "pending_target", reason: "", createdAt: at(2, 15) },
    { id: 3, requestId: 1, actorId: 4, action: "รับงานและวางแผน", fromStatus: "pending_target", toStatus: "in_progress", reason: "", createdAt: at(4) },
    { id: 4, requestId: 2, actorId: 2, action: "ส่งคำขอ", fromStatus: null, toStatus: "pending_approval", reason: "", createdAt: at(16, 14) },
    { id: 5, requestId: 3, actorId: 1, action: "ส่งคำขอ", fromStatus: null, toStatus: "pending_approval", reason: "", createdAt: at(12) },
    { id: 6, requestId: 3, actorId: 3, action: "อนุมัติ", fromStatus: "pending_approval", toStatus: "pending_target", reason: "", createdAt: at(13) },
    { id: 7, requestId: 4, actorId: 2, action: "ส่งคำขอ", fromStatus: null, toStatus: "pending_approval", reason: "", createdAt: at(10) },
    { id: 8, requestId: 4, actorId: 3, action: "ส่งกลับ", fromStatus: "pending_approval", toStatus: "returned", reason: "กรุณาระบุว่าส่วนลดสูงสุดได้กี่เปอร์เซ็นต์ และใครเป็นคนอนุมัติส่วนลด", createdAt: at(11) },
    { id: 9, requestId: 5, actorId: 1, action: "ส่งคำขอ", fromStatus: null, toStatus: "pending_approval", reason: "", createdAt: at(3) },
    { id: 10, requestId: 5, actorId: 3, action: "อนุมัติ", fromStatus: "pending_approval", toStatus: "pending_target", reason: "", createdAt: at(3, 13) },
    { id: 11, requestId: 5, actorId: 4, action: "รับงานและวางแผน", fromStatus: "pending_target", toStatus: "in_progress", reason: "", createdAt: at(5) },
    { id: 12, requestId: 5, actorId: 7, action: "งานครบร้อยละ 100", fromStatus: "in_progress", toStatus: "pending_acceptance", reason: "", createdAt: at(17) },
    { id: 13, requestId: 6, actorId: 3, action: "ส่งคำขอ (อนุมัติอัตโนมัติเพราะผู้ขอเป็นหัวหน้าต้นสังกัด)", fromStatus: null, toStatus: "pending_target", reason: "", createdAt: at(1) },
    { id: 14, requestId: 6, actorId: 4, action: "รับงานและวางแผน", fromStatus: "pending_target", toStatus: "in_progress", reason: "", createdAt: at(1, 14) },
    { id: 15, requestId: 6, actorId: 5, action: "งานครบร้อยละ 100", fromStatus: "in_progress", toStatus: "pending_acceptance", reason: "", createdAt: at(6) },
    { id: 16, requestId: 6, actorId: 3, action: "ยืนยันรับงาน", fromStatus: "pending_acceptance", toStatus: "done", reason: "", createdAt: at(7) },
    { id: 17, requestId: 7, actorId: 5, action: "ส่งคำขอ", fromStatus: null, toStatus: "pending_approval", reason: "", createdAt: at(14) },
    { id: 18, requestId: 7, actorId: 4, action: "อนุมัติ", fromStatus: "pending_approval", toStatus: "pending_target", reason: "", createdAt: at(14, 16) },
    { id: 19, requestId: 8, actorId: 2, action: "ส่งคำขอ", fromStatus: null, toStatus: "pending_approval", reason: "", createdAt: at(4) },
    { id: 20, requestId: 8, actorId: 3, action: "อนุมัติ", fromStatus: "pending_approval", toStatus: "pending_target", reason: "", createdAt: at(4, 15) },
    { id: 21, requestId: 8, actorId: 4, action: "ปฏิเสธ", fromStatus: "pending_target", toStatus: "rejected", reason: "ขอบเขตใหญ่เกินกว่าจะทำเป็นคำขอเดียว ขอให้แยกเป็นฟีเจอร์ที่ต้องใช้จริงก่อน", createdAt: at(6) },
]
