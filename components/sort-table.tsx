'use client'

// ตารางที่กดหัวคอลัมน์เพื่อเรียงได้ (กดซ้ำ = สลับน้อยไปมาก / มากไปน้อย)
// ใช้กับทุกตารางในระบบ: รายการคำขอ งานของฉัน ผู้ใช้ งานเกินกำหนด ฯลฯ
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "@tailgrids/icons";
import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/tailgrids/core/table";
import { cn } from "@/utils/cn";

export type Column<T> = {
    key: string
    label: string
    render: (row: T) => ReactNode
    sortValue?: (row: T) => string | number   // ไม่ใส่ = คอลัมน์นี้เรียงไม่ได้
    className?: string
}

type Props<T> = {
    rows: T[]
    columns: Column<T>[]
    rowKey: (row: T) => string | number
    rowHref?: (row: T) => string               // กดทั้งแถวเพื่อเปิดหน้ารายละเอียด
    initialSort?: { key: string, dir: "asc" | "desc" }
    empty?: string
}

export default function SortTable<T>({ rows, columns, rowKey, rowHref, initialSort, empty = "ไม่มีข้อมูล" }: Props<T>) {
    const router = useRouter();
    const [sort, setSort] = useState(initialSort ?? null);

    const col = columns.find((c) => c.key === sort?.key);
    const sorted = !col?.sortValue ? rows : [...rows].sort((a, b) => {
        const x = col.sortValue!(a), y = col.sortValue!(b);
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "th");
        return sort!.dir === "asc" ? cmp : -cmp;
    });

    const toggle = (key: string) => setSort((s) => s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

    return (
        <TableRoot className="w-full bg-white text-sm">
            <TableHeader>
                <TableRow className="bg-page">
                    {columns.map((c) => (
                        <TableHead key={c.key} className={c.className}>
                            {c.sortValue ? (
                                <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-ink [&>svg]:size-3.5"
                                    aria-label={`เรียงตาม${c.label}`}>
                                    {c.label}
                                    {sort?.key === c.key
                                        ? (sort.dir === "asc" ? <ChevronUp /> : <ChevronDown />)
                                        : <ChevronDown className="opacity-30" />}
                                </button>
                            ) : c.label}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {sorted.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="py-10 text-center text-ink-3">{empty}</TableCell>
                    </TableRow>
                )}
                {sorted.map((row) => (
                    <TableRow key={rowKey(row)} className={cn(rowHref && "cursor-pointer hover:bg-page")}
                        onClick={rowHref ? () => router.push(rowHref(row)) : undefined}>
                        {columns.map((c) => <TableCell key={c.key} className={c.className}>{c.render(row)}</TableCell>)}
                    </TableRow>
                ))}
            </TableBody>
        </TableRoot>
    )
}
