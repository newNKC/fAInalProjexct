// ทีมย่อยในแผนก (ฟีเจอร์เสริม) · คนหนึ่งอยู่ได้หลายทีม
export type Team = {
    id: number
    name: string
    dept: string
    leadId: number | null
    memberIds: number[]
}

export const seedTeams: Team[] = [
    { id: 1, name: "ทีมพัฒนาระบบขาย", dept: "แผนก IT", leadId: 5, memberIds: [5, 6] },
    { id: 2, name: "ทีมโครงสร้างพื้นฐาน", dept: "แผนก IT", leadId: 7, memberIds: [7, 5] },
    { id: 3, name: "ทีมสนับสนุนผู้ใช้", dept: "แผนก IT", leadId: 7, memberIds: [7, 9] },
    { id: 4, name: "ทีมรายงานและ Dashboard", dept: "แผนกข้อมูล", leadId: 14, memberIds: [14, 15] },
]
