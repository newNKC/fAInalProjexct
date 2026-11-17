'use client'

// ข้อมูลกลางของทั้งระบบ (Context + localStorage)
// ทุกหน้าอ่าน/เขียนข้อมูลผ่าน useStore() ที่นี่ที่เดียว รีเฟรชแล้วข้อมูลยังอยู่
// ปุ่ม "ล้างข้อมูลตัวอย่าง" (resetDemo) จะคืนค่าเริ่มต้นทั้งหมด

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { seedCategories, type Category } from "@/data/categories";
import { defaultPermissions, type Permission } from "@/data/permissions";
import {
    findApprover, isLeafTask, requestProgress, seedLogs, seedRequests, seedTasks,
    type Attachment, type Log, type Request, type Status, type Task,
} from "@/data/requests";
import { seedTeams, type Team } from "@/data/teams";
import { users as seedUsers, type Role, type User } from "@/data/users";

// ข้อมูลทั้งหมดที่เก็บใน localStorage
type Data = {
    users: User[]
    permissions: Permission[]
    categories: Category[]
    teams: Team[]
    requests: Request[]
    tasks: Task[]
    logs: Log[]
}

// ผู้ที่เข้าสู่ระบบอยู่
type Session = {
    userId: number
    role: Role
}

// ข้อมูลที่ผู้ขอกรอกในแบบฟอร์ม
export type RequestDraft = {
    title: string
    detail: string
    categoryId: number
    targetDept: string
    dueDate: string
    attachments: Attachment[]
}

const DATA_KEY = "rq-data-v2";   // เปลี่ยนเลขเวอร์ชันเมื่อข้อมูลตัวอย่างเปลี่ยน → เบราว์เซอร์โหลดค่าเริ่มต้นใหม่
const SESSION_KEY = "rq-session-v1";

const seed = (): Data => ({
    users: seedUsers,
    permissions: defaultPermissions,
    categories: seedCategories,
    teams: seedTeams,
    requests: seedRequests,
    tasks: seedTasks,
    logs: seedLogs,
});

const nextId = (rows: { id: number }[]) => rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
const now = () => new Date().toISOString();

function useStoreValue() {
    const [data, setData] = useState<Data>(seed);
    const [session, setSession] = useState<Session | null>(null);
    const [ready, setReady] = useState(false);   // อ่าน localStorage เสร็จแล้วหรือยัง

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

    // บันทึกทุกครั้งที่ข้อมูลเปลี่ยน
    useEffect(() => {
        if (!ready) return;
        try { localStorage.setItem(DATA_KEY, JSON.stringify(data)); } catch { }
    }, [data, ready]);

    // เปิดหลายแท็บพร้อมกัน: แท็บอื่นแก้ข้อมูล → อัปเดตแท็บนี้ตาม (ไม่งั้นแท็บเก่าจะเขียนทับด้วยข้อมูลเก่า)
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === DATA_KEY && e.newValue) {
                try { setData(JSON.parse(e.newValue)); } catch { }
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const user = session ? data.users.find((u) => u.id === session.userId) ?? null : null;
    const userById = (id: number | null) => data.users.find((u) => u.id === id);

    // ---------- เข้า / ออกจากระบบ ----------
    const login = (email: string, remember: boolean): User | null => {
        // พิมพ์แค่ "requester.sales" ก็ได้ ระบบเติม @company.local ให้
        const typed = email.trim().toLowerCase();
        const full = typed.includes("@") ? typed : `${typed}@company.local`;
        const found = data.users.find((u) => u.email.toLowerCase() === full);
        if (!found || found.roles.length === 0) return null;
        const s = { userId: found.id, role: found.roles[0] };
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

    const switchRole = (role: Role) => {
        if (!session || session.role === role) return;
        const s = { ...session, role };
        setSession(s);
        const storage = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
        storage.setItem(SESSION_KEY, JSON.stringify(s));
    }

    // ---------- ตัวช่วยเปลี่ยนสถานะ + บันทึกประวัติ ----------
    const changeStatus = (d: Data, requestId: number, to: Status, action: string, reason = ""): Data => {
        const r = d.requests.find((x) => x.id === requestId);
        if (!r || !user) return d;
        return {
            ...d,
            requests: d.requests.map((x) => x.id === requestId ? { ...x, status: to } : x),
            logs: [...d.logs, { id: nextId(d.logs), requestId, actorId: user.id, action, fromStatus: r.status, toStatus: to, reason, createdAt: now() }],
        };
    }

    // ---------- ผู้ขอ ----------
    const submitRequest = (draft: RequestDraft): Request | null => {
        if (!user) return null;
        const approver = findApprover(data.users, user);
        const id = nextId(data.requests);
        const created: Request = {
            ...draft,
            id,
            code: `REQ-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`,
            requesterId: user.id,
            approverId: null,                 // ใส่ตอนมีคนอนุมัติ / ส่งกลับจริง
            // ไม่มีหัวหน้าต้นสังกัด (ผู้ขอเป็นหัวหน้าเอง) → ข้ามขั้นอนุมัติ
            status: approver ? "pending_approval" : "pending_target",
            createdAt: now(),
        };
        setData((d) => ({
            ...d,
            requests: [...d.requests, created],
            logs: [...d.logs, {
                id: nextId(d.logs), requestId: id, actorId: user.id,
                action: approver ? "ส่งคำขอ" : "ส่งคำขอ (อนุมัติอัตโนมัติเพราะผู้ขอเป็นหัวหน้าต้นสังกัด)",
                fromStatus: null, toStatus: created.status, reason: "", createdAt: now(),
            }],
        }));
        return created;
    }

    const resubmitRequest = (id: number, draft: RequestDraft) => {
        setData((d) => {
            const updated = { ...d, requests: d.requests.map((r) => r.id === id ? { ...r, ...draft } : r) };
            return changeStatus(updated, id, "pending_approval", "แก้ไขและส่งใหม่");
        });
    }

    const confirmDone = (id: number) => setData((d) => changeStatus(d, id, "done", "ยืนยันรับงาน"));
    const requestFix = (id: number, reason: string) => setData((d) => changeStatus(d, id, "in_progress", "ขอให้แก้ไขงาน", reason));

    // ---------- หัวหน้าต้นสังกัด ----------
    // บันทึกว่าใครเป็นผู้อนุมัติจริง
    const withApprover = (d: Data, id: number): Data =>
        ({ ...d, requests: d.requests.map((r) => r.id === id ? { ...r, approverId: user?.id ?? null } : r) });
    const approve = (id: number) => setData((d) => changeStatus(withApprover(d, id), id, "pending_target", "อนุมัติ"));
    const returnRequest = (id: number, reason: string) => setData((d) => changeStatus(withApprover(d, id), id, "returned", "ส่งกลับ", reason));

    // ---------- หัวหน้าแผนกปลายทาง ----------
    const acceptRequest = (id: number) => setData((d) => changeStatus(d, id, "in_progress", "รับงานและวางแผน"));
    const rejectRequest = (id: number, reason: string) => setData((d) => changeStatus(d, id, "rejected", "ปฏิเสธ", reason));
    const forwardRequest = (id: number, dept: string, reason: string) => setData((d) => {
        const moved = { ...d, requests: d.requests.map((r) => r.id === id ? { ...r, targetDept: dept } : r) };
        // สถานะยังเป็น "รอแผนกปลายทาง" แต่เปลี่ยนแผนก
        return changeStatus(moved, id, "pending_target", `ส่งต่อไป${dept}`, reason);
    });

    const addTask = (task: Omit<Task, "id" | "progress">) =>
        setData((d) => ({ ...d, tasks: [...d.tasks, { ...task, id: nextId(d.tasks), progress: 0 }] }));

    const removeTask = (taskId: number) =>
        setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== taskId && t.parentId !== taskId) }));

    // ---------- ผู้รับงาน ----------
    const setProgress = (taskId: number, progress: number) => setData((d) => {
        const tasks = d.tasks.map((t) => t.id === taskId ? { ...t, progress } : t);
        let next = { ...d, tasks };
        const task = tasks.find((t) => t.id === taskId);
        const request = d.requests.find((r) => r.id === task?.requestId);
        // งานทุกชิ้นครบ 100 → รอตรวจรับ
        if (task && request?.status === "in_progress") {
            const leaves = tasks.filter((t) => t.requestId === task.requestId && isLeafTask(t, tasks));
            if (leaves.length > 0 && leaves.every((t) => t.progress === 100) && requestProgress(task.requestId, tasks) === 100) {
                next = changeStatus(next, task.requestId, "pending_acceptance", "งานครบร้อยละ 100");
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

    // HR ซิงก์ (จำลอง): โหลดชื่อ แผนก ตำแหน่ง จากข้อมูลตั้งต้นใหม่ แต่คงโรลที่ผู้ดูแลตั้งไว้
    const syncHR = () => setData((d) => ({
        ...d,
        users: seedUsers.map((hr) => ({ ...hr, roles: d.users.find((u) => u.id === hr.id)?.roles ?? hr.roles })),
    }));

    const resetDemo = () => setData(seed());

    // แผนกทั้งหมด (จากรายชื่อพนักงาน)
    const depts = Array.from(new Set(data.users.map((u) => u.dept)));

    return {
        ...data, ready, session, user, role: session?.role ?? null, depts, userById,
        login, logout, switchRole,
        submitRequest, resubmitRequest, confirmDone, requestFix,
        approve, returnRequest,
        acceptRequest, rejectRequest, forwardRequest, addTask, removeTask,
        setProgress,
        setUserRoles, setPermissions, saveCategory, removeCategory, saveTeam, removeTeam, syncHR, resetDemo,
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
