import type { Role } from "@/data/users";

// สิทธิ์ 1 ข้อ และโรลที่ได้สิทธิ์นี้
export type Permission = {
    id: string
    label: string
    roles: Role[]
}

// ค่าเริ่มต้นตาม Figma หน้า "สิทธิ์โรล"
export const defaultPermissions: Permission[] = [
    { id: "submit", label: "ส่งคำขอ", roles: ["requester", "approver", "head", "assignee"] },
    { id: "approve", label: "อนุมัติคำขอของคนในแผนก", roles: ["approver"] },
    { id: "decide", label: "รับงาน / ปฏิเสธ / ส่งต่อแผนก", roles: ["head"] },
    { id: "breakdown", label: "แตกงานและมอบหมาย", roles: ["head"] },
    { id: "progress", label: "อัปเดตความคืบหน้างาน", roles: ["head", "assignee"] },
    { id: "dashboard", label: "ดู Dashboard", roles: ["approver", "head", "executive", "admin"] },
    { id: "users", label: "จัดการผู้ใช้และโรล", roles: ["admin"] },
    { id: "categories", label: "จัดการหมวดคำขอ", roles: ["admin"] },
    { id: "teams", label: "จัดการทีม", roles: ["head", "admin"] },
]

// ช่องที่ห้ามติ๊กเด็ดขาด (requirement: ผู้ดูแลระบบอนุมัติคำขอไม่ได้)
export const isLocked = (permissionId: string, role: Role) =>
    permissionId === "approve" && role === "admin"

// สิทธิ์ที่ผูกกับตำแหน่งในขั้นตอนงาน: ใช้ได้เฉพาะโรลที่มีหน้าที่นั้นจริง (ปิดได้ แต่เพิ่มให้โรลอื่นไม่ได้)
// เช่น "อนุมัติคำขอของคนในแผนก" ระบบส่งคำขอไปหาหัวหน้าต้นสังกัดของฝ่าย จึงให้โรลอื่นไม่ได้
export const WORKFLOW_ROLES: Record<string, Role[]> = {
    approve: ["approver"],
    decide: ["head"],
    breakdown: ["head"],
    progress: ["head", "assignee"],
}
export const isBound = (permissionId: string, role: Role) =>
    !!WORKFLOW_ROLES[permissionId] && !WORKFLOW_ROLES[permissionId].includes(role)

// ล้างค่าที่ติ๊กไว้ในช่องที่ใช้ไม่ได้ (เช่นข้อมูลเก่าที่บันทึกไว้ก่อนมีกฎนี้)
export const sanitizePermissions = (list: Permission[]): Permission[] =>
    list.map((p) => ({ ...p, roles: p.roles.filter((r) => !isLocked(p.id, r) && !isBound(p.id, r)) }))
