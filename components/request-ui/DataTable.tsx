'use client'

// ตารางสไตล์ RequestUI (.table ของนพรัตน์) + เพิ่มให้กดหัวคอลัมน์เพื่อเรียง และแบ่งหน้า (requirement)
import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "@tailgrids/icons";

export type DataColumn<T> = {
  key: string
  label: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
}

export default function DataTable<T>({ rows, cols, rowKey, rowTone, initialSort, empty = "ไม่มีรายการ", pageSize = 10 }: {
  rows: T[]
  cols: DataColumn<T>[]
  rowKey: (row: T) => string | number
  rowTone?: (row: T) => CSSProperties   // สีพื้นแถวตามสถานะ (toneStyle)
  initialSort?: { key: string, dir: "asc" | "desc" }
  empty?: string
  pageSize?: number
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const col = cols.find((c) => c.key === sort?.key);
  const sorted = !col?.sortValue ? rows : [...rows].sort((a, b) => {
    const x = col.sortValue!(a), y = col.sortValue!(b);
    const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "th");
    return sort!.dir === "asc" ? cmp : -cmp;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const shown = sorted.slice(current * pageSize, (current + 1) * pageSize);

  return (
    <>
      <div className="table-wrap"><div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined}>
                  {c.sortValue ? (
                    <button type="button" title={`เรียงตาม${c.label}`} className="inline-flex items-center gap-1 hover:underline"
                      onClick={() => { setSort((s) => s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" }); setPage(0); }}>
                      {c.label}
                      {sort?.key === c.key ? (sort.dir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} className="opacity-30" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={cols.length} className="py-10 text-center text-slate-600">{empty}</td></tr>}
            {shown.map((row) => <tr key={rowKey(row)} className={rowTone ? "tone-row" : undefined} style={rowTone?.(row)}>{cols.map((c) => <td key={c.key}>{c.render(row)}</td>)}</tr>)}
          </tbody>
        </table>
      </div></div>
      {sorted.length > pageSize && (
        <nav aria-label="แบ่งหน้า" className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>แสดง {current * pageSize + 1}–{Math.min(sorted.length, (current + 1) * pageSize)} จาก {sorted.length} รายการ</span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn--outline !px-3 !py-1 text-xs" disabled={current === 0} onClick={() => setPage(current - 1)}>ก่อนหน้า</button>
            <span>หน้า {current + 1} / {pages}</span>
            <button type="button" className="btn btn--outline !px-3 !py-1 text-xs" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>ถัดไป</button>
          </div>
        </nav>
      )}
    </>
  );
}
