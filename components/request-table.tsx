'use client'

// ตารางรายการคำขอ (ใช้ในหน้าคำขอของฉัน รออนุมัติ คำขอเข้าแผนก และหน้าสรุปภาพรวม)
import Link from "next/link";
import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/tailgrids/core/table";
import ProgressBar from "@/components/progress-bar";
import StatusBadge from "@/components/status-badge";
import { isOverdue, requestProgress, thaiDate, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

type Props = {
    requests: Request[]
    href: (r: Request) => string
    showRequester?: boolean
    empty?: string
}

export default function RequestTable({ requests, href, showRequester, empty = "ไม่มีคำขอ" }: Props) {
    const store = useStore();
    const sorted = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return (
        <TableRoot className="w-full bg-white text-sm">
            <TableHeader>
                <TableRow className="bg-page">
                    <TableHead>คำขอ</TableHead>
                    {showRequester && <TableHead>ผู้ขอ</TableHead>}
                    <TableHead>หมวด</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>วันที่ต้องการ</TableHead>
                    <TableHead className="w-44">ความคืบหน้า</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sorted.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={showRequester ? 6 : 5} className="py-10 text-center text-ink-3">{empty}</TableCell>
                    </TableRow>
                )}
                {sorted.map((r) => {
                    const category = store.categories.find((c) => c.id === r.categoryId);
                    const requester = store.userById(r.requesterId);
                    return (
                        <TableRow key={r.id}>
                            <TableCell>
                                <Link href={href(r)} className="group block">
                                    <p className="text-xs text-ink-3">{r.code}</p>
                                    <p className="font-medium text-ink group-hover:text-brand group-hover:underline">{r.title}</p>
                                </Link>
                            </TableCell>
                            {showRequester && (
                                <TableCell className="font-normal text-ink-2">
                                    <p>{requester?.name}</p>
                                    <p className="text-xs text-ink-3">{requester?.dept}</p>
                                </TableCell>
                            )}
                            <TableCell className="font-normal text-ink-2">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="size-2 rounded-full" style={{ background: category?.color }} />{category?.name ?? "-"}
                                </span>
                            </TableCell>
                            <TableCell><StatusBadge status={r.status} /></TableCell>
                            <TableCell className={isOverdue(r) ? "font-semibold text-[#BE123C]" : "font-normal text-ink-2"}>
                                {thaiDate(r.dueDate)}{isOverdue(r) && " · เกินกำหนด"}
                            </TableCell>
                            <TableCell><ProgressBar value={requestProgress(r.id, store.tasks)} /></TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </TableRoot>
    )
}
