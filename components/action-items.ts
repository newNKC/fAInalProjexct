// งานที่รอผู้ใช้คนนี้ทำ · ใช้ทั้งตัวเลขบนเมนู sidebar และรายการในกระดิ่งแจ้งเตือน
import { canApprove, isLeafTask } from "@/data/requests";
import type { Store } from "@/data/store";

export type ActionItem = { href: string, label: string, count: number }

export function actionItems(store: Store): ActionItem[] {
    const u = store.user;
    if (!u) return [];
    const items: ActionItem[] = [];
    const mineReturned = store.requests.filter((r) => r.requesterId === u.id && r.status === "returned").length;
    const mineAccept = store.requests.filter((r) => r.requesterId === u.id && r.status === "pending_acceptance").length;
    if (mineReturned) items.push({ href: "/requests", label: "คำขอของคุณถูกส่งกลับให้แก้ไข", count: mineReturned });
    if (mineAccept) items.push({ href: "/requests", label: "งานเสร็จแล้ว รอคุณตรวจรับ", count: mineAccept });
    if (u.roles.includes("approver") && store.can("approve")) {
        const n = store.requests.filter((r) => canApprove(store.users, u, r)).length;
        if (n) items.push({ href: "/approvals", label: "คำขอรออนุมัติ", count: n });
    }
    if (u.roles.includes("head") && store.can("decide")) {
        const n = store.requests.filter((r) => r.targetDept === u.dept && r.status === "pending_target").length;
        if (n) items.push({ href: "/incoming", label: "คำขอเข้าแผนกรอพิจารณา", count: n });
    }
    // ผู้ขอกด "ขอให้แก้ไข" → แจ้งหัวหน้าแผนกปลายทาง และผู้รับงานที่มีงานในคำขอนั้น
    const fixes = store.requests.filter((r) => r.status === "in_progress" && r.fixReason && r.targetDept === u.dept
        && (u.roles.includes("head") || store.tasks.some((t) => t.requestId === r.id && t.assigneeId === u.id)));
    for (const r of fixes) items.push({ href: `/requests/${r.id}`, label: `ผู้ขอขอให้แก้ไข ${r.code}: ${r.fixReason}`, count: 1 });
    if ((u.roles.includes("assignee") || u.roles.includes("head")) && store.can("progress")) {
        const n = store.tasks.filter((t) => t.assigneeId === u.id && t.progress < 100 && isLeafTask(t, store.tasks)
            && store.requests.find((r) => r.id === t.requestId)?.status === "in_progress").length;
        if (n) items.push({ href: "/tasks", label: "งานที่ยังทำไม่เสร็จ", count: n });
    }
    return items;
}

// ตัวเลขบนเมนู sidebar (หน้าไหนมีงานรอกี่ชิ้น)
export function menuCounts(store: Store): Record<string, number> {
    const out: Record<string, number> = {};
    for (const i of actionItems(store)) out[i.href] = (out[i.href] ?? 0) + i.count;
    return out;
}
