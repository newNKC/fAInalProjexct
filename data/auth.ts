// รหัสผ่านของผู้ใช้ · เก็บเป็นค่า hash (SHA-256 + salt ต่อคน) ไม่เก็บรหัสผ่านตรง ๆ
// ถ้าต่อ backend จริง ส่วนนี้ย้ายไปฝั่งเซิร์ฟเวอร์ทั้งหมด หน้าเว็บส่งแค่อีเมล+รหัสผ่านไปตรวจ

export type Credential = {
    salt: string
    hash: string
    mustChange: boolean        // รหัสผ่านชั่วคราวจากผู้ดูแลระบบ → ต้องตั้งใหม่ก่อนใช้งาน
    failed: number             // ใส่ผิดติดกันกี่ครั้ง
    lockedUntil: string | null // ใส่ผิดครบ MAX_FAILED ครั้ง → ล็อกชั่วคราว
}

export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;
export const EMAIL_DOMAIN = "company.local";

// รหัสผ่านเริ่มต้นของบัญชีตัวอย่างทุกบัญชีคือ Company@2026 (ดู README)
export const seedCredentials: Record<number, Credential> = {
    1: { salt: "1cafd35eecfd092b", hash: "e50e8747aa7810c3e6643d9180d01fe169a56b0f7d01559d2295ca0ea9f43d6b", mustChange: false, failed: 0, lockedUntil: null },
    2: { salt: "10ae0324dafae7e5", hash: "ab931663886d80c0d56407f1036af5c9e4b75dd1d7e87541fd1ad88aeaae4035", mustChange: false, failed: 0, lockedUntil: null },
    3: { salt: "a1616d5be8098a05", hash: "74caebe304af704afc34370975bd1734787014eb99b7e74a3a1db0c354853398", mustChange: false, failed: 0, lockedUntil: null },
    4: { salt: "6c6ad2894927d259", hash: "18d92b35ec905c52fccad86c68886028a0b7f7f9c40d0ba0a966224ca6d7bceb", mustChange: false, failed: 0, lockedUntil: null },
    5: { salt: "22938e3d97eb1df5", hash: "67f0b3e5b2a34a8a9ad5760bcf32c51447397b954615170f1c753a5b11175173", mustChange: false, failed: 0, lockedUntil: null },
    6: { salt: "f9ab8f8cedf4cb46", hash: "3d4c7384be7b7a61b6d61143db037c24da09d5ca47c1117f889292b0d941b16b", mustChange: false, failed: 0, lockedUntil: null },
    7: { salt: "bf4912cac019d379", hash: "274c871865dccf1a8a5935aa71f1a3e37d2402a2c94485b986c51daa26a04f72", mustChange: false, failed: 0, lockedUntil: null },
    8: { salt: "d6850d6d1940f262", hash: "14b9a0e38d68bacb81cdc9d6c43e3f628f6488a64afb5a3dc99b2399968a3149", mustChange: false, failed: 0, lockedUntil: null },
    9: { salt: "b81d34101e3c8ec9", hash: "8dc5b180e6b57a0436c379fc2d523d9c6e270c2efd962ac45e1c58dab8195f26", mustChange: false, failed: 0, lockedUntil: null },
}

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

export async function hashPassword(salt: string, password: string) {
    return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`)));
}

export async function makeCredential(password: string, mustChange: boolean): Promise<Credential> {
    const salt = toHex(crypto.getRandomValues(new Uint8Array(8)).buffer);
    return { salt, hash: await hashPassword(salt, password), mustChange, failed: 0, lockedUntil: null };
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
