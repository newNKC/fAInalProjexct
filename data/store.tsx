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
}

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

const DATA_KEY = "rq-data-v3";   // เปลี่ยนเลขเวอร์ชันเมื่อโครงข้อมูลเปลี่ยน → เบราว์เซอร์โหลดข้อมูลตัวอย่างใหม่
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
    const canSee = (r: Request) => !!user && canView(data.users, user, r, { restrictByTeam: data.restrictByTeam, teamMembers: teamOf(r)?.memberIds ?? null });

    // ---------- เข้า / ออกจากระบบ ----------
    const login = (email: string, remember: boolean): User | null => {
        // พิมพ์แค่ "requester.sales" ก็ได้ ระบบเติม @company.local ให้
        const typed = email.trim().toLowerCase();
        const full = typed.includes("@") ? typed : `${typed}@company.local`;
        const found = data.users.find((u) => u.email.toLowerCase() === full);
        if (!found || found.roles.length === 0) return null;
        const s = { userId: found.id };
        setSession(s);
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
        return found;
    }

    const logout = () => {
        setSession(null);
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
    }

    // ---------- เปลี่ยนสถานะ + บันทึกประวัติ ----------
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
        if (!user) return null;
        const hasApprover = !!findApprover(data.users, user.dept);
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

    const resubmitRequest = (id: number, draft: RequestDraft) =>
        setData((d) => changeStatus(patchRequest(d, id, draft), id, "pending_approval", "แก้ไขและส่งใหม่"));

    const confirmDone = (id: number) => setData((d) => changeStatus(d, id, "done", "ตรวจรับงาน"));
    const requestFix = (id: number, reason: string) => setData((d) => changeStatus(d, id, "in_progress", "ขอให้แก้ไขงาน", reason));

    // ---------- หัวหน้าต้นสังกัด ----------
    const approve = (id: number) => setData((d) => changeStatus(patchRequest(d, id, { approverId: user?.id ?? null }), id, "pending_target", "อนุมัติ"));
    const returnRequest = (id: number, reason: string) => setData((d) => changeStatus(patchRequest(d, id, { approverId: user?.id ?? null }), id, "returned", "ส่งกลับ", reason));

    // ---------- หัวหน้าแผนกปลายทาง ----------
    const acceptWithPlan = (id: number, plan: PlanDraft, teamId: number | null) => setData((d) => {
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
    const rejectRequest = (id: number, reason: string) => setData((d) => changeStatus(d, id, "rejected", "ปฏิเสธ", reason));
    const forwardRequest = (id: number, dept: string, reason: string) =>
        setData((d) => changeStatus(patchRequest(d, id, { targetDept: dept }), id, "pending_target", `ส่งต่อไป${dept}`, reason));

    // ---------- ผู้รับงาน ----------
    const setProgress = (taskId: number, progress: number) => setData((d) => {
        const tasks = d.tasks.map((t) => t.id === taskId ? { ...t, progress, completedAt: progress === 100 ? (t.completedAt ?? now()) : null } : t);
        let next = { ...d, tasks };
        const task = tasks.find((t) => t.id === taskId);
        const request = d.requests.find((r) => r.id === task?.requestId);
        // งานทุกชิ้นครบ 100 → รอตรวจรับ
        if (task && request?.status === "in_progress") {
            const leaves = tasks.filter((t) => t.requestId === task.requestId && isLeafTask(t, tasks));
            if (leaves.length > 0 && leaves.every((t) => t.progress === 100) && requestProgress(request, tasks) === 100) {
                next = changeStatus(next, task.requestId, "pending_acceptance", "แผนกปลายทางปิดงาน 100%");
            }
        }
        return next;
    });

    // ---------- ผู้ดูแลระบบ ----------
    const setUserRoles = (userId: number, roles: Role[]) =>
        setData((d) => ({ ...d, users: d.users.map((u) => u.id === userId ? { ...u, roles } : u) }));
    const setPermissions = (permissions: Permission[]) => setData((d) => ({ ...d, permissions }));

    const saveCategory = (c: Omit<Category, "id"> & { id?: number }) => setData((d) => ({
        ...d,
        categories: c.id
            ? d.categories.map((x) => x.id === c.id ? { ...x, ...c, id: x.id } : x)
            : [...d.categories, { ...c, id: nextId(d.categories) }],
    }));
    const removeCategory = (id: number) => setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));

    const saveTeam = (t: Omit<Team, "id"> & { id?: number }) => setData((d) => ({
        ...d,
        teams: t.id
            ? d.teams.map((x) => x.id === t.id ? { ...x, ...t, id: x.id } : x)
            : [...d.teams, { ...t, id: nextId(d.teams) }],
    }));
    const removeTeam = (id: number) => setData((d) => ({ ...d, teams: d.teams.filter((t) => t.id !== id) }));
    const setRestrictByTeam = (on: boolean) => setData((d) => ({ ...d, restrictByTeam: on }));

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
        ...data, ready, user, depts, userById, teamOf, canSee, hasPerm, can, toast, showToast,
        login, logout,
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
