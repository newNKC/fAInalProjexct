// หมวดคำขอ (ตาม Figma หน้า "หมวดคำขอ") · active = ให้เลือกในฟอร์มส่งคำขอได้
export type Category = {
    id: number
    name: string
    description: string
    color: string
    active: boolean
}

export const seedCategories: Category[] = [
    { id: 1, name: "พัฒนาใหม่", description: "ระบบหรือฟีเจอร์ใหม่ที่ยังไม่มี", color: "#4F46E5", active: true },
    { id: 2, name: "ปรับปรุง", description: "แก้ไขหรือเพิ่มความสามารถของระบบเดิม", color: "#0284C7", active: true },
    { id: 3, name: "แก้ bug", description: "ระบบทำงานผิดจากที่ควรเป็น", color: "#E11D48", active: true },
    { id: 4, name: "แก้ปัญหา", description: "ปัญหาการใช้งานทั่วไป สิทธิ์ ข้อมูล", color: "#D97706", active: true },
]
