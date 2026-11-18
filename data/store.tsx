'use client'

// ข้อมูลกลางของทั้งระบบ (Context + localStorage)
// ทุกหน้าอ่าน/เขียนข้อมูลผ่าน useStore() ที่นี่ที่เดียว รีเฟรชแล้วข้อมูลยังอยู่ และทุกแท็บเห็นข้อมูลชุดเดียวกัน

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { seedCategories, type Category } from "@/data/categories";
import { defaultPermissions, type Permission } from "@/data/permissions";
import {
    canView, findApprover, isLeafTask, nowISO, requestProgress, seedLogs, seedRequests, seedTasks,
    type Attachment, type Log, type Request, type Status, type Task,
} from "@/data/requests";
import { seedTeams, type Team } from "@/data/teams";
import { LOCK_MINUTES, MAX_FAILED, normalizeEmail, seedCredentials, tempPassword, type Credential } from "@/data/auth";
import { users as seedUsers, type Role, type User } from "@/data/users";

type Data = {
    users: User[]
    permissions: Permission[]
    categories: Category[]
    teams: Team[]
    requests: Request[]
    tasks: Task[]
    logs: Log[]
    restrictByTeam: boolean   // จำกัดการมองเห็นคำขอตามทีม (หน้า "ทีม")
    auth: Record<number, Credential>   // รหัสผ่านของผู้ใช้แต่ละคน · key = user id
}

export type LoginResult = { ok: true, user: User, mustChange: boolean } | { ok: false, error: string }

type Session = { userId: number }

// ข้อมูลที่ผู้ขอกรอกในแบบฟอร์ม
export type RequestDraft = {
    title: string
    detail: string
    categoryId: number
    targetDept: string
    dueDate: string
    attachments: Attachment[]
}

// แผนงานที่หัวหน้าแผนกปลายทางแตกไว้ก่อนกด "ยืนยันรับงานและมอบหมาย"
export type PlanDraft = {
    title: string
    subs: { title: string, assigneeId: number, dueDate: string }[]
}[]

const DATA_KEY = "rq-data-v6";   // เปลี่ยนเลขเวอร์ชันเมื่อโครงข้อมูลเปลี่ยน → เบราว์เซอร์โหลดข้อมูลตัวอย่างใหม่
const SESSION_KEY = "rq-session-v1";

const seed = (): Data => ({
    users: seedUsers,
    permissions: defaultPermissions,
    categories: seedCategories,
    teams: seedTeams,
    requests: seedRequests,
    tasks: seedTasks,
    logs: seedLogs,
    restrictByTeam: false,
    auth: seedCredentials,
});

const nextId = (rows: { id: number }[]) => rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
const now = () => nowISO();

function useStoreValue() {
    const [data, setData] = useState<Data>(seed);
    const [session, setSession] = useState<Session | null>(null);
    const [ready, setReady] = useState(false);
    const [toast, setToast] = useState<{ id: number, text: string } | null>(null);

    // โหลดครั้งแรกจาก localStorage (ต้องรอฝั่งเบราว์เซอร์ จึงอ่านใน effect)
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        try {
            const saved = localStorage.getItem(DATA_KEY);
            if (saved) setData(JSON.parse(saved));
            const s = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
            if (s) setSession(JSON.parse(s));
        } catch {
            // ข้อมูลเสีย → ใช้ค่าเริ่มต้น
        }
        setReady(true);
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!ready) return;
        try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch { }
    }, [data, ready]);

    // เปิดหลายแท็บ: แท็บอื่นแก้ข้อมูล → แท็บนี้อัปเดตตาม
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === DATA_KEY && e.newValue) {
                try { setData(JSON.parse(e.newValue)); } catch { }
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // ข้อความแจ้งผล (toast) หายเองใน 4 วินาที
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);
    const showToast = (text: string) => setToast(text ? { id: Date.now(), text } : null);

    const user = session ? data.users.find((u) => u.id === session.userId) ?? null : null;
    const userById = (id: number | null) => data.users.find((u) => u.id === id);
    const teamOf = (r: Request) => data.teams.find((t) => t.id === r.teamId) ?? null;
    // ผู้ใช้คนนี้ดูคำขอนี้ได้ไหม (ใช้กรองทุกรายการและหน้ารายละเอียด)
    const canSee = (r: Request) => !!user && canView(data.users, user, r, {
        restrictByTeam: data.restrictByTeam, teamMembers: teamOf(r)?.memberIds ?? null,
        assigned: data.tasks.some((t) => t.requestId === r.id && t.assigneeId === user.id),
    });
    // หัวหน้าต้นสังกัดที่จะพิจารณาคำขอของฝ่ายนี้ (null = ข้ามขั้นอนุมัติ) · ใช้แสดงในแบบฟอร์มส่งคำขอ
    const approverOf = (dept: string) => approverIn(data, dept);

    // ---------- เข้า / ออกจากระบบ ----------
    const setCred = (userId: number, patch: Partial<Credential>) =>
        setData((d) => ({ ...d, auth: { ...d.auth, [userId]: { ...d.auth[userId], ...patch } } }));

    const login = (email: string, password: string, remember: boolean): LoginResult => {
        const wrong = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        const found = data.users.find((u) => u.email.toLowerCase() === normalizeEmail(email));
        if (!found) return { ok: false, error: wrong };
        const cred = data.auth[found.id];
        if (!cred) return { ok: false, error: "บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ" };

        const lockedMs = cred.lockedUntil ? Date.parse(cred.lockedUntil) - Date.now() : 0;
        if (lockedMs > 0) {
            return { ok: false, error: `ใส่รหัสผ่านผิดเกิน ${MAX_FAILED} ครั้ง บัญชีถูกล็อกชั่วคราว ลองใหม่ใน ${Math.ceil(lockedMs / 60000)} นาที หรือติดต่อผู้ดูแลระบบ` };
        }

        if (password !== cred.password) {
            const failed = cred.failed + 1;
            if (failed >= MAX_FAILED) {
                setCred(found.id, { failed: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() });
                return { ok: false, error: `ใส่รหัสผ่านผิดครบ ${MAX_FAILED} ครั้ง บัญชีถูกล็อก ${LOCK_MINUTES} นาที` };
            }
            setCred(found.id, { failed, lockedUntil: null });
            const left = MAX_FAILED - failed;
            return { ok: false, error: left <= 2 ? `${wrong} (เหลืออีก ${left} ครั้งก่อนบัญชีถูกล็อก)` : wrong };
        }
        if (found.roles.length === 0) return { ok: false, error: "บัญชีนี้ยังไม่มีสิทธิ์ใช้งานระบบ กรุณาติดต่อผู้ดูแลระบบ" };

        if (cred.failed || cred.lockedUntil) setCred(found.id, { failed: 0, lockedUntil: null });
        const s = { userId: found.id };
        setSession(s);
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
        return { ok: true, user: found, mustChange: cred.mustChange };
    }

    // เปลี่ยนรหัสผ่านของตัวเอง (คืนข้อความผิดพลาด หรือ null ถ้าสำเร็จ)
    const changePassword = (current: string, next: string): string | null => {
        if (!user) return "กรุณาเข้าสู่ระบบใหม่";
        const cred = data.auth[user.id];
        if (!cred || current !== cred.password) return "รหัสผ่านปัจจุบันไม่ถูกต้อง";
        if (current === next) return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม";
        const fresh: Credential = { password: next, mustChange: false, failed: 0, lockedUntil: null };
        setData((d) => ({ ...d, auth: { ...d.auth, [user.id]: fresh } }));
        return null;
    }

    // ผู้ดูแลระบบรีเซ็ตรหัสผ่าน → ได้รหัสชั่วคราว (แสดงครั้งเดียว) ผู้ใช้ต้องตั้งใหม่ตอนเข้าสู่ระบบ · ปลดล็อกบัญชีไปด้วย
    const resetPassword = (userId: number): string => {
        const temp = tempPassword();
        const fresh: Credential = { password: temp, mustChange: true, failed: 0, lockedUntil: null };
        setData((d) => ({ ...d, auth: { ...d.auth, [userId]: fresh } }));
        return temp;
    }
    const unlockUser = (userId: number) => setCred(userId, { failed: 0, lockedUntil: null });
    const credentialOf = (userId: number) => data.auth[userId] as Credential | undefined;
    const mustChangePassword = !!user && !!data.auth[user.id]?.mustChange;

    const logout = () => {
        setSession(null);
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
    }

    // ---------- เปลี่ยนสถานะ + บันทึกประวัติ ----------
    // หัวหน้าต้นสังกัดของฝ่ายที่อนุมัติได้จริง (มีโรล + โรลนั้นยังมีสิทธิ์ "อนุมัติคำขอ") · ไม่มี → คำขอข้ามขั้นอนุมัติ
    const approverIn = (d: Data, dept: string) =>
        d.permissions.find((p) => p.id === "approve")?.roles.includes("approver") ? findApprover(d.users, dept) : null;
    // คำขอที่ค้างรออนุมัติของฝ่ายที่ไม่เหลือคนอนุมัติได้ → ส่งต่อไปแผนกปลายทาง
    const releaseStuck = (d: Data): Data => {
        let next = d;
        for (const r of d.requests.filter((x) => x.status === "pending_approval"
            && !approverIn(d, d.users.find((u) => u.id === x.requesterId)?.dept ?? ""))) {
            next = changeStatus(next, r.id, "pending_target", "ข้ามขั้นอนุมัติ (ฝ่ายไม่มีหัวหน้าต้นสังกัดที่อนุมัติได้)");
        }
        return next;
    }
    // ทำต่อเฉพาะเมื่อคำขออยู่ในสถานะที่คาดไว้ (กันกดซ้ำ/กดจากหน้าเก่าแล้วทำซ้ำ)
    const inStatus = (d: Data, id: number, ...statuses: Status[]) => statuses.includes(d.requests.find((r) => r.id === id)?.status as Status);

    // ตรวจสิทธิ์ก่อนทำรายการ (หน้า "สิทธิ์โรล") · ไม่มีสิทธิ์ → แจ้งแล้วไม่ทำ
    const deny = (...perms: string[]) => {
        if (perms.every((p) => can(p))) return false;
        showToast("คุณไม่มีสิทธิ์ทำรายการนี้ (ผู้ดูแลระบบปิดสิทธิ์ไว้)");
        return true;
    }

    const changeStatus = (d: Data, requestId: number, to: Status, action: string, reason = ""): Data => {
        const r = d.requests.find((x) => x.id === requestId);
        if (!r || !user) return d;
        return {
            ...d,
            requests: d.requests.map((x) => x.id === requestId ? { ...x, status: to } : x),
            logs: [...d.logs, { id: nextId(d.logs), requestId, actorId: user.id, action, fromStatus: r.status, toStatus: to, reason, createdAt: now() }],
        };
    }
    const patchRequest = (d: Data, id: number, patch: Partial<Request>): Data =>
        ({ ...d, requests: d.requests.map((r) => r.id === id ? { ...r, ...patch } : r) });

    // ---------- ผู้ขอ ----------
    const submitRequest = (draft: RequestDraft): Request | null => {
        if (!user || deny("submit")) return null;
        const hasApprover = !!approverIn(data, user.dept);
        const id = nextId(data.requests);
        const maxCode = data.requests.reduce((m, r) => Math.max(m, Number(r.code.slice(4)) || 0), 0);
        const created: Request = {
            ...draft,
            id,
            code: `REQ-${String(maxCode + 1).padStart(4, "0")}`,
            requesterId: user.id,
            approverId: null,
            teamId: null,
            // แผนกที่ไม่มีหัวหน้าต้นสังกัดในระบบ → ข้ามขั้นอนุมัติ
            status: hasApprover ? "pending_approval" : "pending_target",
            createdAt: now(),
        };
        setData((d) => ({
            ...d,
            requests: [...d.requests, created],
            logs: [...d.logs, {
                id: nextId(d.logs), requestId: id, actorId: user.id,
                action: hasApprover ? "ส่งคำขอ" : "ส่งคำขอ (ไม่มีหัวหน้าต้นสังกัด ข้ามขั้นอนุมัติ)",
                fromStatus: null, toStatus: created.status, reason: "", createdAt: now(),
            }],
        }));
        return created;
    }

    const resubmitRequest = (id: number, draft: RequestDraft) => setData((d) => {
        if (!inStatus(d, id, "returned")) return d;
        const hasApprover = !!approverIn(d, user?.dept ?? "");
        return changeStatus(patchRequest(d, id, draft), id, hasApprover ? "pending_approval" : "pending_target",
            hasApprover ? "แก้ไขและส่งใหม่" : "แก้ไขและส่งใหม่ (ข้ามขั้นอนุมัติ)");
    });

    const confirmDone = (id: number) => setData((d) => inStatus(d, id, "pending_acceptance") ? changeStatus(d, id, "done", "ตรวจรับงาน") : d);
    // ผู้ขอขอให้แก้ไข: งานย่อยที่เคยเสร็จกลับไปเป็น 80% (กลับเข้า "งานของฉัน" ของผู้รับงาน) + เก็บเหตุผลไว้แจ้งแผนกปลายทาง
    const requestFix = (id: number, reason: string) => setData((d) => {
        if (!inStatus(d, id, "pending_acceptance")) return d;
        const tasks = d.tasks.map((t) => t.requestId === id && isLeafTask(t, d.tasks) && t.progress === 100 ? { ...t, progress: 80, completedAt: null } : t);
        return changeStatus(patchRequest({ ...d, tasks }, id, { fixReason: reason }), id, "in_progress", "ขอให้แก้ไขงาน", reason);
    });

    // ---------- หัวหน้าต้นสังกัด ----------
    const approve = (id: number) => !deny("approve") && setData((d) => !inStatus(d, id, "pending_approval") ? d : changeStatus(patchRequest(d, id, { approverId: user?.id ?? null }), id, "pending_target", "อนุมัติ"));
    const returnRequest = (id: number, reason: string) => !deny("approve") && setData((d) => !inStatus(d, id, "pending_approval") ? d : changeStatus(patchRequest(d, id, { approverId: user?.id ?? null }), id, "returned", "ส่งกลับ", reason));

    // ---------- หัวหน้าแผนกปลายทาง ----------
    const acceptWithPlan = (id: number, plan: PlanDraft, teamId: number | null) => !deny("decide", "breakdown") && setData((d) => {
        if (!inStatus(d, id, "pending_target")) return d;   // กันกดยืนยันซ้ำแล้วได้งานซ้ำ
        const tasks = [...d.tasks];
        for (const major of plan) {
            const mainId = nextId(tasks);
            const due = major.subs.map((s) => s.dueDate).sort().at(-1) ?? "";
            tasks.push({ id: mainId, requestId: id, parentId: null, title: major.title, assigneeId: null, dueDate: due, progress: 0, completedAt: null });
            for (const s of major.subs) {
                tasks.push({ id: nextId(tasks), requestId: id, parentId: mainId, title: s.title, assigneeId: s.assigneeId, dueDate: s.dueDate, progress: 0, completedAt: null });
            }
        }
        return changeStatus(patchRequest({ ...d, tasks }, id, { teamId }), id, "in_progress", "รับงานและมอบหมาย");
    });
    const rejectRequest = (id: number, reason: string) => !deny("decide") && setData((d) => !inStatus(d, id, "pending_target") ? d : changeStatus(d, id, "rejected", "ปฏิเสธ", reason));
    const forwardRequest = (id: number, dept: string, reason: string) =>
        !deny("decide") && setData((d) => !inStatus(d, id, "pending_target") ? d : changeStatus(patchRequest(d, id, { targetDept: dept, teamId: null }), id, "pending_target", `ส่งต่อไป${dept}`, reason));

    // ---------- ผู้รับงาน ----------
    const setProgress = (taskId: number, progress: number) => !deny("progress") && setData((d) => {
        const tasks = d.tasks.map((t) => t.id === taskId ? { ...t, progress, completedAt: progress === 100 ? (t.completedAt ?? now()) : null } : t);
        let next = { ...d, tasks };
        const task = tasks.find((t) => t.id === taskId);
        const request = d.requests.find((r) => r.id === task?.requestId);
        // งานทุกชิ้นครบ 100 → รอตรวจรับ
        if (task && request?.status === "in_progress") {
            const leaves = tasks.filter((t) => t.requestId === task.requestId && isLeafTask(t, tasks));
            if (leaves.length > 0 && leaves.every((t) => t.progress === 100) && requestProgress(request, tasks) === 100) {
                next = changeStatus(patchRequest(next, task.requestId, { fixReason: null }), task.requestId, "pending_acceptance",
                    request.fixReason ? "แก้ไขตามที่ขอแล้ว ปิดงาน 100%" : "แผนกปลายทางปิดงาน 100%");
            }
        }
        return next;
    });

    // ---------- ผู้ดูแลระบบ ----------
    // แก้โรล (คืนข้อความผิดพลาด หรือ null ถ้าสำเร็จ)
    //  - ห้ามเอาโรลผู้ดูแลระบบออกจากตัวเอง หรือจากผู้ดูแลระบบคนสุดท้าย (ไม่งั้นไม่มีใครแก้กลับได้)
    //  - ฝ่ายไหนไม่เหลือหัวหน้าต้นสังกัด → คำขอที่ค้างรออนุมัติของฝ่ายนั้นส่งต่อไปแผนกปลายทางเลย (เหมือนฝ่ายที่ไม่มีหัวหน้าต้นสังกัด)
    const setUserRoles = (userId: number, roles: Role[]): string | null => {
        if (deny("users")) return "ไม่มีสิทธิ์";
        const target = data.users.find((u) => u.id === userId);
        if (target?.roles.includes("admin") && !roles.includes("admin")) {
            if (userId === user?.id) return "เอาโรลผู้ดูแลระบบออกจากตัวเองไม่ได้ ให้ผู้ดูแลระบบคนอื่นเป็นคนเอาออก";
            if (data.users.filter((u) => u.roles.includes("admin")).length <= 1) return "ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน";
        }
        setData((d) => {
            return releaseStuck({ ...d, users: d.users.map((u) => u.id === userId ? { ...u, roles } : u) });
        });
        return null;
    }
    const setPermissions = (permissions: Permission[]) => user?.roles.includes("admin") && setData((d) => releaseStuck({ ...d, permissions }));

    const saveCategory = (c: Omit<Category, "id"> & { id?: number }) => !deny("categories") && setData((d) => ({
        ...d,
        categories: c.id
            ? d.categories.map((x) => x.id === c.id ? { ...x, ...c, id: x.id } : x)
            : [...d.categories, { ...c, id: nextId(d.categories) }],
    }));
    const removeCategory = (id: number) => !deny("categories") && setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));

    const saveTeam = (t: Omit<Team, "id"> & { id?: number }) => !deny("teams") && setData((d) => ({
        ...d,
        teams: t.id
            ? d.teams.map((x) => x.id === t.id ? { ...x, ...t, id: x.id } : x)
            : [...d.teams, { ...t, id: nextId(d.teams) }],
    }));
    const removeTeam = (id: number) => !deny("teams") && setData((d) => ({ ...d, teams: d.teams.filter((t) => t.id !== id) }));
    const setRestrictByTeam = (on: boolean) => !deny("teams") && setData((d) => ({ ...d, restrictByTeam: on }));

    // HR ซิงก์ (จำลอง): โหลดชื่อ แผนก ตำแหน่งใหม่ แต่คงโรลที่ผู้ดูแลตั้งไว้
    const syncHR = () => setData((d) => ({
        ...d,
        users: seedUsers.map((hr) => ({ ...hr, roles: d.users.find((u) => u.id === hr.id)?.roles ?? hr.roles })),
    }));

    // โรลชุดนี้ (อย่างน้อย 1 โรล) ได้สิทธิ์ข้อนี้ไหม (หน้า "สิทธิ์โรล")
    const hasPerm = (perm: string, roles: Role[]) => !!data.permissions.find((p) => p.id === perm)?.roles.some((r) => roles.includes(r));
    const can = (perm: string) => !!user && hasPerm(perm, user.roles);

    const depts = Array.from(new Set(data.users.map((u) => u.dept)));

    return {
        ...data, ready, user, depts, userById, teamOf, canSee, approverOf, hasPerm, can, toast, showToast,
        login, logout, changePassword, resetPassword, unlockUser, credentialOf, mustChangePassword,
        submitRequest, resubmitRequest, confirmDone, requestFix,
        approve, returnRequest,
        acceptWithPlan, rejectRequest, forwardRequest,
        setProgress,
        setUserRoles, setPermissions, saveCategory, removeCategory, saveTeam, removeTeam, setRestrictByTeam, syncHR,
    };
}

export type Store = ReturnType<typeof useStoreValue>

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const value = useStoreValue();
    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
    const store = useContext(StoreContext);
    if (!store) throw new Error("useStore ต้องอยู่ใน <StoreProvider>");
    return store;
}
