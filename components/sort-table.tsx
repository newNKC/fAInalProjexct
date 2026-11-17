'use client'

// ตารางมาตรฐาน: กดหัวคอลัมน์เพื่อเรียง (กดซ้ำสลับ น้อย→มาก / มาก→น้อย) · แบ่งหน้า · แถวเป็นลิงก์จริง
// แถวที่มี rowHref: คลิก = เปิดหน้า, Ctrl/⌘+คลิก หรือคลิกกลาง = เปิดแท็บใหม่, Tab ไปที่ลิงก์ในคอลัมน์แรกแล้วกด Enter ได้
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent, type ReactNode } from "react";
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
    rowHref?: (row: T) => string
    initialSort?: { key: string, dir: "asc" | "desc" }
    empty?: string
    pageSize?: number
}

const PAGE_SIZES = [10, 20, 50];

export default function SortTable<T>({ rows, columns, rowKey, rowHref, initialSort, empty = "ไม่มีข้อมูล", pageSize: initialSize = 10 }: Props<T>) {
    const router = useRouter();
    const [sort, setSort] = useState(initialSort ?? null);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(initialSize);

    const col = columns.find((c) => c.key === sort?.key);
    const sorted = !col?.sortValue ? rows : [...rows].sort((a, b) => {
        const x = col.sortValue!(a), y = col.sortValue!(b);
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "th");
        return sort!.dir === "asc" ? cmp : -cmp;
    });

    const pages = Math.max(1, Math.ceil(sorted.length / size));
    const current = Math.min(page, pages - 1);
    const shown = sorted.slice(current * size, current * size + size);

    const toggle = (key: string) => {
        setSort((s) => s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
        setPage(0);
    };

    // คลิกแถว: ถ้าคลิกโดนลิงก์/ปุ่มข้างในอยู่แล้ว ไม่ต้องทำซ้ำ · กด Ctrl/⌘ หรือคลิกกลาง = แท็บใหม่
    const open = (e: MouseEvent, href: string) => {
        if ((e.target as HTMLElement).closest("a,button,input,select,textarea,label")) return;
        if (window.getSelection()?.toString()) return;   // กำลังลากเลือกข้อความ
        if (e.ctrlKey || e.metaKey || e.button === 1) window.open(href, "_blank");
        else router.push(href);
    };

    return (
        <div>
            <TableRoot className="w-full bg-white text-sm">
                <TableHeader>
                    <TableRow className="bg-page">
                        {columns.map((c) => (
                            <TableHead key={c.key} className={c.className}
                                aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined}>
                                {c.sortValue ? (
                                    <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 rounded hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none [&>svg]:size-3.5"
                                        title={`เรียงตาม${c.label}`}>
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
                    {shown.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="py-10 text-center text-ink-3">{empty}</TableCell>
                        </TableRow>
                    )}
                    {shown.map((row) => {
                        const href = rowHref?.(row);
                        return (
                            <TableRow key={rowKey(row)} className={cn(href && "cursor-pointer hover:bg-page")}
                                onClick={href ? (e) => open(e, href) : undefined}
                                onAuxClick={href ? (e) => e.button === 1 && open(e, href) : undefined}>
                                {columns.map((c, i) => (
                                    <TableCell key={c.key} className={c.className}>
                                        {/* คอลัมน์แรกเป็นลิงก์จริง (คีย์บอร์ด, คลิกขวา "เปิดในแท็บใหม่", คัดลอกลิงก์) */}
                                        {href && i === 0
                                            ? <Link href={href} className="block rounded focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:outline-none">{c.render(row)}</Link>
                                            : c.render(row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </TableRoot>

            {/* แบ่งหน้า (แสดงเมื่อมีมากกว่า 1 หน้าหรือมากกว่า 10 รายการ) */}
            {sorted.length > PAGE_SIZES[0] && (
                <nav aria-label="แบ่งหน้า" className="mt-3 flex items-center justify-between gap-3 text-xs text-ink-2">
                    <span>แสดง {current * size + 1}–{Math.min(sorted.length, (current + 1) * size)} จาก {sorted.length} รายการ</span>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5">แถวต่อหน้า
                            <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                                className="rounded-md border border-line bg-white px-2 py-1 text-xs text-ink outline-none focus:border-brand">
                                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                        <button disabled={current === 0} onClick={() => setPage(current - 1)}
                            className="rounded-md px-2.5 py-1 ring-1 ring-line enabled:hover:bg-page disabled:opacity-40">ก่อนหน้า</button>
                        <span>หน้า {current + 1} / {pages}</span>
                        <button disabled={current >= pages - 1} onClick={() => setPage(current + 1)}
                            className="rounded-md px-2.5 py-1 ring-1 ring-line enabled:hover:bg-page disabled:opacity-40">ถัดไป</button>
                    </div>
                </nav>
            )}
        </div>
    )
}
