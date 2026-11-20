import {
    Bookmark1, CheckCircle1, DashboardSquare1, DoubleCheckMark, FileTextMultiple, LetterBox,
    Plus, Shield1Check, UserMultiple1, UserMultiple4,
} from "@tailgrids/icons";
import type { MenuItem } from "@/components/sidebar";
import { deptKind, primaryRole, roleHome } from "@/data/requests";
import type { Role, User } from "@/data/users";

// เมนูทั้งหมดในระบบ (ตาม Figma) · perm = รหัสสิทธิ์ในหน้า "สิทธิ์โรล" ที่ต้องมีจึงเห็นเมนูนี้
type MenuDef = { href: string, label: (u: User) => string, icon: MenuItem["icon"], perm?: string }

const M: Record<string, MenuDef> = {
    approvals: { href: "/approvals", label: () => "รออนุมัติ", icon: <CheckCircle1 aria-hidden="true" />, perm: "approve" },
    incoming: { href: "/incoming", label: () => "คำขอเข้าแผนก", icon: <LetterBox aria-hidden="true" />, perm: "decide" },
    tasks: { href: "/tasks", label: () => "งานของฉัน", icon: <DoubleCheckMark aria-hidden="true" />, perm: "progress" },
    // ผู้ขออย่างเดียวเห็น "คำขอของฉัน" · โรลอื่นเห็น "คำขอในฝ่าย/แผนก" (หน้าเดียวกัน แสดงคำขอของทุกคนในฝ่าย)
    // หัวหน้าต้นสังกัดเห็น "คำขอในฝ่าย" (คำขอที่คนในฝ่ายส่ง) · โรลอื่นเห็น "คำขอของฉัน" (หน้าเดียวกัน)
    // (หัวหน้าต้นสังกัดที่เป็นหัวหน้าแผนกปลายทางด้วย ใช้ "คำขอที่แผนกส่ง" เพื่อไม่ให้ชนกับเมนู "คำขอในแผนก")
    requests: { href: "/requests", label: (u) => !u.roles.includes("approver") ? "คำขอของฉัน" : u.roles.includes("head") ? `คำขอที่${deptKind(u.dept)}ส่ง` : `คำขอใน${deptKind(u.dept)}`, icon: <FileTextMultiple aria-hidden="true" /> },
    // งานที่ส่งเข้าแผนก (หัวหน้าแผนก / ผู้รับงาน)
    deptRequests: { href: "/incoming/dept", label: () => "คำขอในแผนก", icon: <FileTextMultiple aria-hidden="true" /> },
    newRequest: { href: "/requests/new", label: () => "ส่งคำขอใหม่", icon: <Plus aria-hidden="true" />, perm: "submit" },
    teams: { href: "/teams", label: () => "ทีม", icon: <UserMultiple4 aria-hidden="true" />, perm: "teams" },
    dashboard: { href: "/dashboard", label: () => "Dashboard", icon: <DashboardSquare1 aria-hidden="true" />, perm: "dashboard" },
    users: { href: "/admin/users", label: () => "จัดการผู้ใช้", icon: <UserMultiple1 aria-hidden="true" />, perm: "users" },
    categories: { href: "/admin/categories", label: () => "หมวดคำขอ", icon: <Bookmark1 aria-hidden="true" />, perm: "categories" },
    permissions: { href: "/admin/permissions", label: () => "สิทธิ์โรล", icon: <Shield1Check aria-hidden="true" /> },
};

// เมนูของแต่ละโรล (ลำดับตาม Figma)
export const roleMenus: Record<Role, MenuDef[]> = {
    requester: [M.requests, M.newRequest],
    approver: [M.approvals, M.requests, M.newRequest, M.dashboard],
    head: [M.incoming, M.deptRequests, M.requests, M.newRequest, M.teams, M.dashboard],
    assignee: [M.tasks, M.deptRequests, M.requests, M.newRequest],
    executive: [M.dashboard],
    admin: [M.dashboard, M.users, M.categories, M.teams, M.permissions],
};

// เมนูที่ได้มาจากการติ๊กสิทธิ์ในหน้า "สิทธิ์โรล" (ไม่ผูกกับตำแหน่ง ให้โรลไหนก็ได้)
// เช่น ติ๊ก "ดู Dashboard" ให้ผู้ขอ → ผู้ขอเห็นเมนู Dashboard · ติ๊ก "ส่งคำขอ" ให้ผู้บริหาร → เห็นคำขอของฉัน + ส่งคำขอใหม่
const permMenus: Record<string, MenuDef[]> = {
    submit: [M.requests, M.newRequest],
    dashboard: [M.dashboard],
    teams: [M.teams],
    users: [M.users],
    categories: [M.categories],
};

// ลำดับเมนูเมื่อคนหนึ่งมีหลายโรล: งานที่รอทำก่อน → คำขอ → ภาพรวม → เมนูผู้ดูแลระบบ
const order = [M.approvals, M.incoming, M.tasks, M.deptRequests, M.requests, M.newRequest, M.teams, M.dashboard, M.users, M.categories, M.permissions].map((m) => m.href);

// รวมเมนูของทุกโรลที่ผู้ใช้มี (ไม่ซ้ำ) · ซ่อนเมนูที่ผู้ดูแลระบบปิดสิทธิ์ไว้
export function menuFor(user: User, hasPerm: (perm: string, roles: Role[]) => boolean): MenuItem[] {
    const defs = new Map<string, { def: MenuDef, roles: Role[] }>();
    const add = (def: MenuDef, role: Role) => {
        const e = defs.get(def.href) ?? { def, roles: [] };
        if (!e.roles.includes(role)) e.roles.push(role);
        defs.set(def.href, e);
    };
    for (const role of user.roles) {
        for (const def of roleMenus[role]) add(def, role);
        // สิทธิ์ที่ผู้ดูแลระบบติ๊กเพิ่มให้โรลนี้ → เพิ่มเมนูของสิทธิ์นั้น
        for (const [perm, list] of Object.entries(permMenus)) if (hasPerm(perm, [role])) list.forEach((def) => add(def, role));
    }
    // มีโรลเดียวและไม่ได้เมนูเพิ่มจากสิทธิ์ → ใช้ลำดับตาม Figma ของโรลนั้น
    const own = user.roles.length === 1 ? roleMenus[user.roles[0]].map((m) => m.href) : null;
    const seq = own && [...defs.keys()].every((h) => own.includes(h)) ? own : order;
    return seq
        .filter((href) => defs.has(href))
        .map((href) => defs.get(href)!)
        .filter(({ def, roles }) => !def.perm || hasPerm(def.perm, roles))
        .map(({ def }) => ({ href: def.href, label: def.label(user), icon: def.icon }));
}

// หน้าแรกของผู้ใช้ = เมนูแรกที่เขามีสิทธิ์ (ผู้ดูแลระบบปิดสิทธิ์ไหน หน้าแรกก็ไม่พาไปหน้านั้น)
// (ใช้หน้าแรกของโรลหลักก่อน ถ้าโรลหลักถูกปิดสิทธิ์หน้านั้น ค่อยใช้เมนูแรกที่เหลือ)
export function homeFor(user: User, hasPerm: (perm: string, roles: Role[]) => boolean): string {
    const menu = menuFor(user, hasPerm).map((m) => m.href);
    const preferred = roleHome[primaryRole(user)];
    return menu.includes(preferred) ? preferred : menu[0] ?? "/account";
}
