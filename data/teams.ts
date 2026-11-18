// ทีมย่อยในแผนก (ฟีเจอร์เสริม) · คนหนึ่งอยู่ได้หลายทีม
export type Team = {
    id: number
    name: string
    dept: string
    leadId: number | null
    memberIds: number[]
    description?: string   // หน้าที่/ความรับผิดชอบของทีม (หน้า "ทีม")
}

export const seedTeams: Team[] = [
    { id: 1, name: "ทีมพัฒนาระบบขาย", dept: "แผนก IT", leadId: 5, memberIds: [5, 6], description: "พัฒนาและดูแลระบบที่ฝ่ายขายใช้งาน เช่น CRM และรายงานยอดขาย" },
    { id: 2, name: "ทีมโครงสร้างพื้นฐาน", dept: "แผนก IT", leadId: 7, memberIds: [7, 5], description: "ดูแลเซิร์ฟเวอร์ เครือข่าย สิทธิ์การเข้าถึง และการสำรองข้อมูล" },
    { id: 3, name: "ทีมสนับสนุนผู้ใช้", dept: "แผนก IT", leadId: 7, memberIds: [7, 9], description: "รับเรื่องปัญหาการใช้งานทั่วไปและช่วยเหลือผู้ใช้" },
    { id: 4, name: "ทีมรายงานและ Dashboard", dept: "แผนกข้อมูล", leadId: 14, memberIds: [14, 15], description: "ทำรายงานและ Dashboard จากฐานข้อมูลของบริษัท" },
]
