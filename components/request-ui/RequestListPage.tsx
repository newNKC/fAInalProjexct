'use client'

// หน้ารายการคำขอแบบตาราง (งานของนพรัตน์ เดิม approval/unit/page.tsx และ incoming/dept/page.tsx ซึ่งโค้ดเกือบเหมือนกัน)
// ปรับให้ใช้ข้อมูลจริงจาก store · ตัวกรองหมวด/สถานะยังอยู่ใน URL (?category=&completion=) ตามแบบเดิม
// เพิ่ม: เรียงตามหัวคอลัมน์ได้, แบ่งหน้า, ความคืบหน้าดูอย่างเดียว
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import CategoryFilter from "@/components/request-ui/CategoryFilter";
import CategoryTag from "@/components/request-ui/CategoryTag";
import DataTable, { type DataColumn } from "@/components/request-ui/DataTable";
import ProgressCell from "@/components/request-ui/ProgressCell";
import { PageHeader } from "@/components/request-ui/RequestUI";
import StatusTag from "@/components/request-ui/StatusTag";
import { STATUS_LABEL } from "@/components/status-badge";
import { displayStatus, lastUpdate, nick, requestProgress, thaiDate, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

export default function RequestListPage({ title, sub, hrefBase, requests, mode, actions, banners }: {
  title: string
  sub: string
  hrefBase: string
  requests: Request[]
  mode: "unit" | "dept"     // unit = คำขอที่คนในฝ่ายส่ง (มีคอลัมน์ "ส่งถึง") · dept = งานที่ส่งเข้าแผนก (มีคอลัมน์ "ผู้รับผิดชอบ")
  actions?: ReactNode
  banners?: ReactNode
}) {
  const store = useStore();
  const params = useSearchParams();
  const categoryNames = store.categories.map((c) => c.name);

  // อ่านตัวเลือกกรองจากลิงก์ เพื่อให้กลับมาแล้วเห็นรายการแบบเดิมได้
  const selectedCategories = [...new Set(params.getAll("category").filter((c) => categoryNames.includes(c)))];
  const completion = params.get("completion");
  const selectedStatus = completion === "unfinished" || completion === "done" ? completion : null;

  const categoryOf = (r: Request) => store.categories.find((c) => c.id === r.categoryId);
  // กรองหมวดก่อน แล้วค่อยกรองว่าเสร็จแล้วหรือยังไม่เสร็จ (ปฏิเสธแล้วนับเป็น "เสร็จแล้ว" เพราะปิดคำขอแล้ว)
  const closed = (r: Request) => r.status === "done" || r.status === "rejected";
  const rows = requests
    .filter((r) => selectedCategories.length === 0 || selectedCategories.includes(categoryOf(r)?.name ?? ""))
    .filter((r) => selectedStatus === "done" ? closed(r) : selectedStatus === "unfinished" ? !closed(r) : true);

  const owner = (r: Request) => {
    const team = store.teamOf(r);
    const people = [...new Set(store.tasks.filter((t) => t.requestId === r.id && t.assigneeId).map((t) => nick(store.userById(t.assigneeId)?.name)))];
    return people.length ? people.join(", ") + (team ? ` · ${team.name}` : "") : "ยังไม่มอบหมาย";
  };

  const cols: DataColumn<Request>[] = [
    {
      key: "title", label: "เรื่อง", sortValue: (r) => r.title, render: (r) => (
        <Link href={`/requests/${r.id}`} className="group block">
          <div className="font-medium group-hover:underline">{r.title}</div>
          <div className="mt-1 text-xs text-slate-500 group-hover:text-brand">{r.code}</div>
        </Link>
      ),
    },
    { key: "category", label: "หมวด", sortValue: (r) => categoryOf(r)?.name ?? "", render: (r) => <CategoryTag category={categoryOf(r)?.name ?? "-"} color={categoryOf(r)?.color} /> },
    mode === "unit"
      ? { key: "by", label: "ผู้ขอ", sortValue: (r) => store.userById(r.requesterId)?.name ?? "", render: (r) => store.userById(r.requesterId)?.name }
      : { key: "owner", label: "ผู้รับผิดชอบ", sortValue: (r) => owner(r), render: (r) => owner(r) },
    ...(mode === "unit"
      ? [{ key: "target", label: "ส่งถึง", sortValue: (r: Request) => r.targetDept, render: (r: Request) => r.targetDept }]
      : [{ key: "from", label: "จากฝ่าย", sortValue: (r: Request) => store.userById(r.requesterId)?.dept ?? "", render: (r: Request) => store.userById(r.requesterId)?.dept }]),
    { key: "status", label: "สถานะ", sortValue: (r) => STATUS_LABEL[displayStatus(r)], render: (r) => <StatusTag status={STATUS_LABEL[displayStatus(r)]} /> },
    { key: "progress", label: "ความคืบหน้า", sortValue: (r) => requestProgress(r, store.tasks), render: (r) => <ProgressCell value={requestProgress(r, store.tasks)} /> },
    { key: "updated", label: "อัปเดต", sortValue: (r) => lastUpdate(r, store.logs), render: (r) => thaiDate(lastUpdate(r, store.logs), true) },
  ];

  return (
    <>
      <PageHeader title={title} sub={sub} actions={actions} statusFilter={{ hrefBase, selectedCategories, selectedStatus }} />
      {banners}
      <CategoryFilter hrefBase={hrefBase} selectedCategories={selectedCategories} selectedStatus={selectedStatus} options={categoryNames} />
      <DataTable rows={rows} cols={cols} rowKey={(r) => r.id} initialSort={{ key: "updated", dir: "desc" }} empty="ไม่มีคำขอที่ตรงกับตัวกรอง" />
      <p className="mt-3 text-xs text-slate-500">กดชื่อเรื่องเพื่อดูรายละเอียด · {rows.length} รายการ</p>
    </>
  );
}
