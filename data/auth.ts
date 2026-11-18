// รหัสผ่านของผู้ใช้ + สถานะบัญชี (ล็อก / ต้องตั้งรหัสใหม่)

export type Credential = {
    password: string
    mustChange: boolean        // รหัสผ่านชั่วคราวจากผู้ดูแลระบบ → ต้องตั้งใหม่ก่อนใช้งาน
    failed: number             // ใส่ผิดติดกันกี่ครั้ง
    lockedUntil: string | null // ใส่ผิดครบ MAX_FAILED ครั้ง → ล็อกชั่วคราว
}

export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;
export const EMAIL_DOMAIN = "company.local";

// รหัสผ่านเริ่มต้นของบัญชีตัวอย่างทุกบัญชีคือ Company@2026 (ดู README)
export const seedCredentials: Record<number, Credential> = {
    1: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    2: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    3: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    4: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    5: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    6: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    7: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    8: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    9: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    10: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    11: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    12: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    13: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    14: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
    15: { password: "Company@2026", mustChange: false, failed: 0, lockedUntil: null },
}

// กฎรหัสผ่าน (คืนรายการข้อที่ยังไม่ผ่าน)
export const passwordRules: { label: string, test: (p: string) => boolean }[] = [
    { label: "อย่างน้อย 8 ตัวอักษร", test: (p) => p.length >= 8 },
    { label: "มีตัวอักษรภาษาอังกฤษ", test: (p) => /[A-Za-z]/.test(p) },
    { label: "มีตัวเลข", test: (p) => /\d/.test(p) },
];

// รหัสผ่านชั่วคราว 10 ตัว (ตัด 0 O 1 l I ที่อ่านสับสนออก)
export function tempPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const r = crypto.getRandomValues(new Uint32Array(8));
    return `${Array.from(r, (n) => chars[n % chars.length]).join("")}#${(r[0] % 90) + 10}`;
}

// พิมพ์แค่ส่วนหน้า @ ก็ได้ ระบบเติมโดเมนบริษัทให้
export const normalizeEmail = (typed: string) => {
    const t = typed.trim().toLowerCase();
    return t.includes("@") ? t : `${t}@${EMAIL_DOMAIN}`;
}
