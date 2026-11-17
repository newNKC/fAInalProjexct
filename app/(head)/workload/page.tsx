'use client'

import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/tailgrids/core/table";
import PageHeader from "@/components/page-header";
import ProgressBar from "@/components/progress-bar";
import { isLeafTask, thaiDate } from "@/data/requests";
import { useStore } from "@/data/store";

export default function Page() {
    const store = useStore();
    const me = store.user;
    const today = new Date().toISOString().slice(0, 10);

    const members = store.users.filter((u) => u.dept === me?.dept && (u.roles.includes("assignee") || u.roles.includes("head")));
    // งานที่ยังเปิดอยู่ (คำขอยังกำลังทำ) และเป็นงานที่ต้องรายงานเอง
    const openOf = (userId: number) => store.tasks.filter((t) => t.assigneeId === userId && t.progress < 100 && isLeafTask(t, store.tasks)
        && ["pending_target", "in_progress"].includes(store.requests.find((r) => r.id === t.requestId)?.status ?? ""));

    return (
        <>
            <PageHeader title="ภาระงานทีม" />
            <TableRoot className="w-full bg-white text-sm">
                <TableHeader>
                    <TableRow className="bg-page">
                        <TableHead>สมาชิก</TableHead>
                        <TableHead className="w-28 text-center">งานค้าง</TableHead>
                        <TableHead className="w-28 text-center">เกินกำหนด</TableHead>
                        <TableHead>งานที่กำลังทำ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {members.map((u) => {
                        const open = openOf(u.id);
                        const late = open.filter((t) => t.dueDate < today).length;
                        return (
                            <TableRow key={u.id}>
                                <TableCell>
                                    <p className="font-medium text-ink">{u.name}</p>
                                    <p className="text-xs font-normal text-ink-3">{u.position}</p>
                                </TableCell>
                                <TableCell className="text-center text-lg font-bold text-ink">{open.length}</TableCell>
                                <TableCell className={late ? "text-center font-bold text-[#BE123C]" : "text-center text-ink-3"}>{late}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1.5">
                                        {open.length === 0 && <span className="text-xs text-ink-3">ว่าง</span>}
                                        {open.map((t) => (
                                            <div key={t.id} className="flex items-center gap-3 text-xs">
                                                <span className="flex-1 text-ink-2">{t.title} <span className="text-ink-3">· {store.requests.find((r) => r.id === t.requestId)?.code} · ส่ง {thaiDate(t.dueDate)}</span></span>
                                                <ProgressBar value={t.progress} className="w-36" />
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </TableRoot>
        </>
    )
}
