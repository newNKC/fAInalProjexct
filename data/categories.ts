// หมวดคำขอ 1 หมวด (สีใช้แสดงจุดสีหน้าชื่อหมวด)
export type Category = {
    id: number
    name: string
    color: string
}

export const seedCategories: Category[] = [
    { id: 1, name: "แก้ไขข้อผิดพลาด", color: "#E11D48" },
    { id: 2, name: "พัฒนาฟีเจอร์ใหม่", color: "#4F46E5" },
    { id: 3, name: "ขอสิทธิ์และข้อมูล", color: "#D97706" },
    { id: 4, name: "ปรับปรุงหน้าจอ", color: "#059669" },
]
