'use client'

// รอการอนุมัติ (งานของนพรัตน์ เดิม app/(approval)/approval/ApprovalDashboard.tsx)
// ปรับให้ใช้ข้อมูลจริงจาก store: คำขอที่รอผู้ใช้คนนี้อนุมัติ · ยอดเดือนนี้นับจากประวัติ · เพิ่มตัวเลือกเรียงลำดับ
import { useState } from "react";
import CategoryTag from "@/components/request-ui/CategoryTag";
import { Card, PageHeader } from "@/components/request-ui/RequestUI";
import LinkButton from "@/components/request-ui/LinkButton";
import SortSelect, { sortBy, type SortOption } from "@/components/sort-select";
import { canApprove, nick, thaiDate, todayISO, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

export default function ApprovalDashboard() {
  const store = useStore();
  const user = store.user!;
  const [sort, setSort] = useState("oldest");

  const pendingRequests = store.requests.filter((r) => canApprove(store.users, user, r));
  const month = todayISO().slice(0, 7);
  const countThisMonth = (action: string) =>
    store.logs.filter((l) => l.actorId === user.id && l.action === action && l.createdAt.slice(0, 7) === month).length;

  const summaries = [
    { label: "รออนุมัติ", count: pendingRequests.length, color: "bg-amber-500" },
    { label: "อนุมัติเดือนนี้", count: countThisMonth("อนุมัติ"), color: "bg-green-500" },
    { label: "ส่งกลับเดือนนี้", count: countThisMonth("ส่งกลับ"), color: "bg-[#3730A3]" },
  ];

  const options: SortOption<Request>[] = [
    { key: "oldest", label: "ส่งก่อน (รอนานสุด)", value: (r) => r.createdAt },
    { key: "newest", label: "ส่งล่าสุด", value: (r) => r.createdAt, dir: "desc" },
    { key: "due", label: "วันที่ต้องการใกล้สุด", value: (r) => r.dueDate },
    { key: "code", label: "รหัสคำขอ", value: (r) => r.code },
    { key: "title", label: "ชื่อคำขอ", value: (r) => r.title },
    { key: "requester", label: "ผู้ขอ", value: (r) => nick(store.userById(r.requesterId)?.name) },
  ];

  return (
    <>
      <PageHeader title="รอการอนุมัติ" sub={`คำขอของคนใน${user.dept}ที่กำลังรอพิจารณาจากคุณ`} />
      <dl className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaries.map((summary) => (
          <Card key={summary.label} className="!min-w-0">
            <dt className="flex items-center gap-2 text-sm text-slate-600">
              <span className={`size-2 rounded-full ${summary.color}`} aria-hidden="true" />
              {summary.label}
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-slate-900">{summary.count}</dd>
          </Card>
        ))}
      </dl>
      <div className="mb-3 flex justify-end">
        <SortSelect options={options} value={sort} onChange={setSort} />
      </div>
      <div className="space-y-4">
        {pendingRequests.length === 0 ? (
          <Card className="text-center text-sm text-slate-600">ไม่มีคำขอรออนุมัติ</Card>
        ) : (
          sortBy(pendingRequests, options, sort).map((request) => {
            const by = store.userById(request.requesterId);
            const category = store.categories.find((c) => c.id === request.categoryId);
            return (
              <Card key={request.id} pad={false} className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="avatar" aria-hidden="true">{by?.name.slice(0, 1)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="table__id text-xs">{request.code}</p>
                        <CategoryTag category={category?.name ?? "-"} color={category?.color} />
                      </div>
                      <h2 className="mt-1 truncate text-sm font-semibold">{request.title}</h2>
                      <p className="cell-sub">ส่งโดย {nick(by?.name)}{by?.id === user.id ? " (คุณ)" : ""} · {thaiDate(request.createdAt, true)} · ต้องการภายใน {thaiDate(request.dueDate, true)}</p>
                    </div>
                  </div>
                  {/* เปิดหน้ารายละเอียดเพื่อพิจารณาคำขอนี้ */}
                  <LinkButton href={`/approvals/${request.id}`} className="inline-flex shrink-0 items-center gap-1 px-3 py-2 text-sm">
                    พิจารณา
                  </LinkButton>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
