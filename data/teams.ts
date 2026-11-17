// ทีมในแผนก (restrictVisibility = ให้เห็นคำขอเฉพาะสมาชิกทีม)
export type Team = {
    id: number
    name: string
    dept: string
    memberIds: number[]
    restrictVisibility: boolean
}

export const seedTeams: Team[] = [
    { id: 1, name: "ทีมพัฒนาระบบขาย", dept: "แผนก IT", memberIds: [5, 6], restrictVisibility: false },
    { id: 2, name: "ทีมทดสอบ", dept: "แผนก IT", memberIds: [7], restrictVisibility: false },
]
