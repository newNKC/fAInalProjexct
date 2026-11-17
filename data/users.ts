import type { SidebarUser } from "@/components/sidebar";

export type Role = SidebarUser["role"]

// ผู้ใช้ 1 คน (ชื่อ แผนก ตำแหน่ง มาจาก HR · แก้ได้เฉพาะ roles)
export type User = {
    id: number
    name: string
    email: string
    dept: string
    position: string
    roles: Role[]
}

// ลำดับโรลที่ใช้แสดงในตารางและใน dialog
export const allRoles: Role[] = ["requester", "approver", "head", "assignee", "executive", "admin"]

// ข้อมูลตัวอย่างตาม Figma หน้า "จัดการผู้ใช้"
// อีเมลทดลองตั้งเป็น "โรลหลัก.แผนก" ให้จำง่าย (sales = ฝ่ายขาย, it = แผนก IT, mgmt = ฝ่ายบริหาร) · โรลซ้ำในแผนกเดียวกันต่อท้ายเลข 2, 3
// fix when fusion: รายชื่อพนักงานชุดนี้หน้าของคนอื่นต้องใช้ด้วย (แตกงาน, ทีม, ภาระงาน) → ตกลงให้เหลือไฟล์ข้อมูลกลางไฟล์เดียว ไม่ให้ต่างคนต่างมีรายชื่อของตัวเอง
export const users: User[] = [
    { id: 1, name: "อรวรรณ ศรีสุข (แอน)", email: "requester.sales@company.local", dept: "ฝ่ายขาย", position: "เจ้าหน้าที่ขาย", roles: ["requester"] },
    { id: 2, name: "เอกชัย (เอก)", email: "requester2.sales@company.local", dept: "ฝ่ายขาย", position: "เจ้าหน้าที่ขาย", roles: ["requester"] },
    { id: 3, name: "สมศักดิ์ ใจดี", email: "approver.sales@company.local", dept: "ฝ่ายขาย", position: "หัวหน้าฝ่ายขาย", roles: ["approver", "requester"] },
    { id: 4, name: "วิชัย ทองดี", email: "head.it@company.local", dept: "แผนก IT", position: "หัวหน้าแผนก IT", roles: ["head", "approver"] },
    { id: 5, name: "ธนกร (ต้น)", email: "assignee.it@company.local", dept: "แผนก IT", position: "นักพัฒนาระบบ", roles: ["assignee", "requester"] },
    { id: 6, name: "พลอย", email: "assignee2.it@company.local", dept: "แผนก IT", position: "นักพัฒนาระบบ", roles: ["assignee"] },
    { id: 7, name: "เก่ง", email: "assignee3.it@company.local", dept: "แผนก IT", position: "นักทดสอบระบบ", roles: ["assignee"] },
    { id: 8, name: "ประภาพร วงศ์ใหญ่", email: "executive.mgmt@company.local", dept: "ฝ่ายบริหาร", position: "ผอ.ฝ่ายปฏิบัติการ", roles: ["executive"] },
    { id: 9, name: "นิดา (นิด)", email: "admin.it@company.local", dept: "แผนก IT", position: "ผู้ดูแลระบบ", roles: ["admin"] },
]