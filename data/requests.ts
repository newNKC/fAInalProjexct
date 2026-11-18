import type { Role, User } from "@/data/users";

// สถานะของคำขอ 7 แบบ (ตาม SRS) · "เกินกำหนด" ไม่ใช่สถานะที่เก็บ แต่คำนวณตอนแสดง (displayStatus)
export type Status =
    | "pending_approval"     // รออนุมัติ
    | "returned"             // ส่งกลับแก้ไข
    | "pending_target"       // รอแผนกปลายทาง
    | "rejected"             // ปฏิเสธ
    | "in_progress"          // กำลังดำเนินการ
    | "pending_acceptance"   // รอตรวจรับ
    | "done"                 // เสร็จสิ้น

export type DisplayStatus = Status | "overdue"

// ไฟล์แนบ: เก็บข้อมูลไฟล์ไว้ที่นี่ ส่วนตัวไฟล์จริงเก็บใน IndexedDB ของเบราว์เซอร์ (data/files.ts) ตาม id
export type Attachment = { id: string, name: string, size: number, type: string }

export type Request = {
    id: number
    code: string              // REQ-0152
    title: string
    detail: string
    categoryId: number
    targetDept: string        // ส่งถึง (แผนกปลายทาง)
    dueDate: string           // วันที่ต้องการ YYYY-MM-DD
    requesterId: number
    approverId: number | null // คนที่อนุมัติ/ส่งกลับจริง
    teamId: number | null     // ทีมที่รับผิดชอบ (ไม่บังคับ)
    status: Status
    attachments: Attachment[]
    createdAt: string         // ISO
}

// งานหลัก (parentId = null, ไม่มีผู้รับผิดชอบ) / งานย่อย (มี parentId และผู้รับผิดชอบ)
export type Task = {
    id: number
    requestId: number
    parentId: number | null
    title: string
    assigneeId: number | null
    dueDate: string
    progress: number          // 0-100
    completedAt: string | null
}

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

// ===== ผู้ใช้ =====

// ชื่อเล่น เช่น "อรวรรณ ศรีสุข (แอน)" → "แอน", "สมศักดิ์ ใจดี" → "สมศักดิ์"
export const nick = (name?: string) => {
    if (!name) return "";
    const m = name.match(/\(([^)]+)\)/);
    return m ? m[1] : name.split(" ")[0];
}

// "ฝ่ายขาย" → "ฝ่าย", "แผนก IT" → "แผนก" (ใช้ตั้งชื่อเมนู "คำขอในฝ่าย/แผนก")
export const deptKind = (dept: string) => dept.startsWith("ฝ่าย") ? "ฝ่าย" : "แผนก"

// ลำดับความสำคัญของโรล (โรลแรกที่มี = โรลหลัก ใช้เลือกหน้าแรกและป้ายใน sidebar)
export const roleRank: Role[] = ["admin", "executive", "head", "approver", "assignee", "requester"]
export const primaryRole = (user: User): Role => roleRank.find((r) => user.roles.includes(r)) ?? user.roles[0]

// หน้าแรกของแต่ละโรลหลังเข้าสู่ระบบ
export const roleHome: Record<Role, string> = {
    requester: "/requests",
    approver: "/approvals",
    head: "/incoming",
    assignee: "/tasks",
    executive: "/dashboard",
    admin: "/dashboard",
}

export const findApprover = (users: User[], dept: string) =>
    users.find((u) => u.dept === dept && u.roles.includes("approver")) ?? null

export const findHead = (users: User[], dept: string) =>
    users.find((u) => u.dept === dept && u.roles.includes("head")) ?? null

// หัวหน้าต้นสังกัดพิจารณาคำขอนี้ได้ไหม (คำขอของคนในฝ่ายเดียวกัน รวมคำขอของตัวเองตาม Figma)
export const canApprove = (users: User[], user: User, r: Request) => {
    const requester = users.find((u) => u.id === r.requesterId);
    return r.status === "pending_approval" && user.roles.includes("approver") && requester?.dept === user.dept
}

// ใครดูคำขอนี้ได้ · คนในแผนกเดียวกับผู้ขอ / แผนกปลายทาง (หัวหน้า, ผู้รับงาน) / ผู้บริหาร / ผู้ดูแลระบบ
// เปิด "จำกัดการมองเห็นตามทีม" แล้ว คนในแผนกปลายทางที่ไม่ได้อยู่ทีมนั้นจะมองไม่เห็น (ยกเว้นหัวหน้าแผนก)
export const canView = (users: User[], user: User, r: Request, opts: { restrictByTeam: boolean, teamMembers: number[] | null }) => {
    if (user.roles.includes("executive") || user.roles.includes("admin")) return true;
    const requester = users.find((u) => u.id === r.requesterId);
    if (requester?.dept === user.dept) return true;
    if (r.targetDept === user.dept) {
        if (user.roles.includes("head")) return true;
        if (opts.restrictByTeam && opts.teamMembers) return opts.teamMembers.includes(user.id);
        return true;
    }
    return false;
}

// ===== งานและความคืบหน้า =====

export const subtasksOf = (task: Task, tasks: Task[]) => tasks.filter((t) => t.parentId === task.id)

export const taskProgress = (task: Task, tasks: Task[]) => {
    const subs = subtasksOf(task, tasks);
    if (subs.length === 0) return task.progress;
    return Math.round(subs.reduce((sum, t) => sum + t.progress, 0) / subs.length);
}

export const requestProgress = (r: Request, tasks: Task[]) => {
    if (r.status === "done") return 100;
    const mains = tasks.filter((t) => t.requestId === r.id && t.parentId === null);
    if (mains.length === 0) return 0;
    return Math.round(mains.reduce((sum, t) => sum + taskProgress(t, tasks), 0) / mains.length);
}

// งานที่ผู้รับงานรายงานเอง = งานที่ไม่มีงานย่อยใต้ตัวเอง
export const isLeafTask = (task: Task, tasks: Task[]) => !tasks.some((t) => t.parentId === task.id)

// ===== วันที่ =====

// เวลาปัจจุบันแบบมีเขตเวลาของเครื่อง เช่น 2026-11-18T09:40:00+07:00 (วันที่ตรงกับปฏิทินไทย ไม่เพี้ยนเป็น UTC)
export const nowISO = () => {
    const d = new Date();
    const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
    const off = -d.getTimezoneOffset();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${off >= 0 ? "+" : "-"}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`
}

export const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// เกินกำหนด = ยังรอแผนกปลายทางหรือกำลังทำ และเลยวันที่ต้องการแล้ว
export const isOverdue = (r: Request, today = todayISO()) =>
    ["pending_target", "in_progress"].includes(r.status) && r.dueDate < today

export const displayStatus = (r: Request): DisplayStatus => isOverdue(r) ? "overdue" : r.status

export const daysBetween = (fromISO: string, toISO: string) =>
    Math.round((Date.parse(toISO.slice(0, 10)) - Date.parse(fromISO.slice(0, 10))) / 864e5)

export const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

// วันที่แบบไทย: "18 พ.ย." / แบบมีปี "18 พ.ย. 2569"
export const thaiDate = (iso: string, withYear = false) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${d} ${thaiMonths[m - 1]}${withYear ? ` ${y + 543}` : ""}`
}
export const thaiDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${thaiDate(iso, true)} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

// อัปเดตล่าสุดของคำขอ = เวลาของประวัติล่าสุด
export const lastUpdate = (r: Request, logs: Log[]) =>
    logs.filter((l) => l.requestId === r.id).reduce((max, l) => l.createdAt > max ? l.createdAt : max, r.createdAt)

// ===== ข้อมูลตัวอย่าง (อิงจาก Figma) =====
// ผู้ใช้: 1 แอน, 2 เอก, 3 สมศักดิ์ (ฝ่ายขาย) · 4 วิชัย (หัวหน้าแผนก IT), 5 ต้น, 6 พลอย, 7 เก่ง (แผนก IT) · 8 ประภาพร · 9 นิด

const at = (date: string, time = "09:00") => `${date}T${time}:00+07:00`

type SeedRow = [code: number, title: string, cat: number, requester: number, status: Status, created: string, due: string, approver: number | null]

const rows: SeedRow[] = [
    [152, "เพิ่มตัวกรองลูกค้าในระบบ CRM", 2, 1, "pending_approval", "2026-11-11", "2026-11-30", null],
    [156, "ข้อมูลลูกค้าซ้ำในระบบ CRM", 4, 2, "pending_approval", "2026-11-10", "2026-12-05", null],
    [155, "รายงานค่าคอมมิชชันพนักงานขาย", 1, 3, "pending_approval", "2026-11-11", "2026-12-15", null],
    [153, "หน้าค้นหาสินค้าในระบบขายช้า", 3, 2, "pending_target", "2026-11-09", "2026-11-28", 3],
    [150, "ปรับแบบฟอร์มใบสั่งซื้อให้รองรับส่วนลด", 2, 2, "returned", "2026-11-08", "2026-12-20", 3],
    [148, "ระบบรายงานยอดขายรายเดือน", 1, 1, "in_progress", "2026-10-20", "2026-11-30", 3],
    [144, "ระบบแจ้งเตือนเมื่อสำรองข้อมูลล้มเหลว", 1, 5, "pending_target", "2026-11-08", "2026-12-10", 4],
    [139, "หน้าออกใบแจ้งหนี้โหลดค้าง", 3, 1, "pending_acceptance", "2026-11-01", "2026-11-10", 3],
    [137, "ปรับหน้าเข้าสู่ระบบของระบบภายใน", 2, 6, "done", "2026-10-26", "2026-11-06", 4],
    [135, "นำเข้าข้อมูลลูกค้าจาก Excel ไม่ได้", 4, 2, "in_progress", "2026-10-28", "2026-11-05", 3],
    [131, "ปรับสิทธิ์เข้าถึงโฟลเดอร์ฝ่ายขาย", 4, 2, "done", "2026-10-24", "2026-11-02", 3],
    [129, "ปรับรูปแบบใบเสร็จฝ่ายขาย", 2, 3, "in_progress", "2026-10-15", "2026-11-12", 3],
    [126, "ระบบจองห้องประชุม", 1, 1, "rejected", "2026-10-20", "2026-12-01", 3],
    // คำขอย้อนหลังที่ปิดแล้ว (ให้กราฟรายเดือนมีข้อมูล)
    [101, "เพิ่มช่องหมายเหตุในใบเสนอราคา", 2, 1, "done", "2026-01-12", "2026-01-30", 3],
    [103, "แก้การปัดเศษยอดรวมใบแจ้งหนี้", 3, 2, "done", "2026-02-03", "2026-02-20", 3],
    [105, "ระบบแจ้งเตือนลูกค้าค้างชำระ", 1, 1, "done", "2026-02-18", "2026-03-20", 3],
    [107, "รีเซ็ตรหัสผ่านระบบ CRM ไม่ได้", 4, 2, "done", "2026-03-05", "2026-03-10", 3],
    [109, "ปรับหน้ารายชื่อลูกค้าให้ค้นด้วยเบอร์โทร", 2, 1, "done", "2026-03-22", "2026-04-15", 3],
    [111, "แก้รายงานภาษีขายแสดงผิดเดือน", 3, 3, "done", "2026-04-08", "2026-04-25", 3],
    [113, "เพิ่มสิทธิ์ดูรายงานให้ผู้จัดการเขต", 4, 2, "done", "2026-05-02", "2026-05-09", 3],
    [115, "ระบบบันทึกการเข้าพบลูกค้า", 1, 1, "done", "2026-05-20", "2026-06-30", 3],
    [117, "ปรับหน้า Dashboard ฝ่ายขาย", 2, 3, "done", "2026-06-11", "2026-07-05", 3],
    [119, "สคริปต์สำรองข้อมูลอัตโนมัติ", 1, 5, "done", "2026-06-25", "2026-07-20", 4],
    [121, "แก้การส่งอีเมลยืนยันคำสั่งซื้อ", 3, 2, "done", "2026-07-14", "2026-07-25", 3],
    [122, "เพิ่มตัวกรองวันที่ในรายงานคลังสินค้า", 2, 7, "done", "2026-08-06", "2026-08-30", 4],
    [123, "นำเข้าราคาสินค้าจาก Excel", 1, 1, "done", "2026-08-21", "2026-09-15", 3],
    [124, "แก้หน้าพิมพ์ใบส่งของตัวหนังสือเพี้ยน", 3, 2, "done", "2026-09-09", "2026-09-20", 3],
    [125, "ขอสิทธิ์เข้าระบบบัญชีให้พนักงานใหม่", 4, 3, "rejected", "2026-09-28", "2026-10-05", 3],
]

const details: Record<number, string> = {
    152: "ฝ่ายขายต้องการกรองรายชื่อลูกค้าตามจังหวัด ประเภทลูกค้า และยอดซื้อย้อนหลัง เพื่อวางแผนเยี่ยมลูกค้า",
    148: "ฝ่ายขายต้องการรายงานยอดขายแยกตามพนักงานและเดือน ส่งออกเป็น Excel ได้ ใช้แทนการรวมยอดด้วยมือทุกสิ้นเดือน",
    139: "หน้าออกใบแจ้งหนี้โหลดนานเกิน 1 นาทีเมื่อมีรายการมากกว่า 50 บรรทัด บางครั้งค้างจนต้องปิดหน้า",
}

const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10)

export const seedRequests: Request[] = rows.map(([code, title, cat, requester, status, created, due, approver], i) => ({
    id: i + 1,
    code: `REQ-${String(code).padStart(4, "0")}`,
    title,
    detail: details[code] ?? `${title} · รายละเอียดเพิ่มเติมตามที่คุยกับหัวหน้าต้นสังกัดแล้ว`,
    categoryId: cat,
    targetDept: "แผนก IT",
    dueDate: due,
    requesterId: requester,
    approverId: approver,
    teamId: [148, 135, 139].includes(code) ? 1 : null,
    status,
    attachments: [],
    createdAt: at(created, code === 152 ? "09:40" : code === 148 ? "10:15" : code === 139 ? "13:05" : "09:00"),
}))

const idOf = (code: number) => rows.findIndex((r) => r[0] === code) + 1

// งาน: [รหัสคำขอ, งานหลัก, [งานย่อย, ผู้รับผิดชอบ, กำหนดส่ง, %]]
const plan: [number, string, [string, number, string, number][]][] = [
    [148, "วางแผน", [["วิเคราะห์ความต้องการรายงาน", 5, "2026-10-24", 100], ["ประเมินเวลาและคน", 4, "2026-10-24", 100]]],
    [148, "ออกแบบรายงาน", [["ออกแบบหน้ารายงาน", 6, "2026-11-06", 100]]],
    [148, "พัฒนา", [["API รายงานยอดขายรายเดือน", 5, "2026-11-18", 50], ["หน้าจอรายงาน", 6, "2026-11-21", 30]]],
    [148, "ทดสอบ", [["ทดสอบรายงานกับข้อมูลจริง", 7, "2026-11-27", 0]]],
    [139, "วิเคราะห์สาเหตุ", [["หาคำสั่งที่ทำให้ช้า", 5, "2026-11-04", 100]]],
    [139, "แก้ไขระบบ", [["ปรับคำสั่งดึงข้อมูลใบแจ้งหนี้", 5, "2026-11-07", 100]]],
    [139, "ทดสอบ", [["ทดสอบกับใบแจ้งหนี้ 200 บรรทัด", 7, "2026-11-09", 100]]],
    [135, "แก้ไข", [["แก้การอ่านไฟล์ Excel", 5, "2026-11-04", 40]]],
    [135, "ทดสอบ", [["ทดสอบนำเข้าไฟล์ลูกค้า", 7, "2026-11-05", 40]]],
    [129, "พัฒนา", [["ปรับแม่แบบใบเสร็จ", 6, "2026-11-10", 60]]],
    [129, "ทดสอบ", [["ตรวจรูปแบบกับฝ่ายขาย", 7, "2026-11-12", 0]]],
    [137, "พัฒนา", [["ปรับหน้าเข้าสู่ระบบ", 6, "2026-11-03", 100]]],
    [131, "ตั้งค่าสิทธิ์", [["ปรับสิทธิ์โฟลเดอร์", 7, "2026-10-30", 100]]],
]

export const seedTasks: Task[] = (() => {
    const out: Task[] = [];
    for (const [code, major, subs] of plan) {
        const requestId = idOf(code);
        const mainId = out.length + 1;
        out.push({ id: mainId, requestId, parentId: null, title: major, assigneeId: null, dueDate: subs.at(-1)![2], progress: 0, completedAt: null });
        for (const [title, who, due, p] of subs) {
            out.push({ id: out.length + 1, requestId, parentId: mainId, title, assigneeId: who, dueDate: due, progress: p, completedAt: p === 100 ? at(due, "17:00") : null });
        }
    }
    return out;
})();

// ประวัติ: สร้างตามสถานะของแต่ละคำขอ
export const seedLogs: Log[] = (() => {
    const out: Log[] = [];
    const add = (requestId: number, actorId: number, action: string, from: Status | null, to: Status, date: string, reason = "", time = "09:00") =>
        out.push({ id: out.length + 1, requestId, actorId, action, fromStatus: from, toStatus: to, reason, createdAt: at(date, time) });
    for (const r of seedRequests) {
        const c = r.createdAt.slice(0, 10);
        const code = Number(r.code.slice(4));
        const head = 4;
        add(r.id, r.requesterId, "ส่งคำขอ", null, "pending_approval", c, "", r.createdAt.slice(11, 16));
        if (r.status === "pending_approval") continue;
        if (r.status === "returned") {
            add(r.id, r.approverId!, "ส่งกลับ", "pending_approval", "returned", addDays(c, 2), "กรุณาระบุว่าส่วนลดสูงสุดได้กี่เปอร์เซ็นต์ และใครเป็นคนอนุมัติส่วนลด");
            continue;
        }
        add(r.id, r.approverId!, "อนุมัติ", "pending_approval", "pending_target", addDays(c, 1));
        if (r.status === "pending_target") continue;
        if (r.status === "rejected") {
            add(r.id, head, "ปฏิเสธ", "pending_target", "rejected", addDays(c, 3), code === 126 ? "ระบบจองห้องประชุมของบริษัทกลางมีอยู่แล้ว ให้ใช้ระบบเดิม" : "ไม่อยู่ในขอบเขตงานของแผนก IT");
            continue;
        }
        add(r.id, head, "รับงานและมอบหมาย", "pending_target", "in_progress", addDays(c, 2));
        if (r.status === "in_progress") continue;
        const end = code === 139 ? "2026-11-09" : addDays(r.dueDate, -2);
        add(r.id, 7, "แผนกปลายทางปิดงาน 100%", "in_progress", "pending_acceptance", end, "", "16:00");
        if (r.status === "pending_acceptance") continue;
        add(r.id, r.requesterId, "ตรวจรับงาน", "pending_acceptance", "done", addDays(end, 1));
    }
    return out;
})();

