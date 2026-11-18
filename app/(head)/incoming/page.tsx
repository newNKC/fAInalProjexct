'use client'

// คำขอเข้าแผนก (งานของนพรัตน์ เดิม app/(incoming)/incoming/IncomingDashboard.tsx)
// ปรับให้ใช้ข้อมูลจริง: คำขอที่รอแผนกของผู้ใช้พิจารณา · ตัวเลขสรุปจาก store · เพิ่มตัวเลือกเรียงลำดับ
import { useState } from "react";
import { ArrowBothDirectionHorizontal2, CheckCircle1, Layers2 } from "@tailgrids/icons";
import { Card, PageHeader } from "@/components/request-ui/RequestUI";
import LinkButton from "@/components/request-ui/LinkButton";
import CategoryTag from "@/components/request-ui/CategoryTag";
import SortSelect, { sortBy, type SortOption } from "@/components/sort-select";
import { isOverdue, nick, thaiDate, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

export default function IncomingDashboard() {
  const store = useStore();
  const user = store.user!;
  const [sort, setSort] = useState("due");

  const inDept = store.requests.filter((r) => r.targetDept === user.dept);
  const pendingRequests = inDept.filter((r) => r.status === "pending_target");
  const summaries = [
    { label: "รอพิจารณา", count: pendingRequests.length, color: "bg-amber-500" },
    { label: "กำลังดำเนินการ", count: inDept.filter((r) => r.status === "in_progress").length, color: "bg-blue-500" },
    { label: "เกินกำหนด", count: inDept.filter((r) => isOverdue(r)).length, color: "bg-red-500" },
  ];

  const options: SortOption<Request>[] = [
    { key: "due", label: "วันที่ต้องการใกล้สุด", value: (r) => r.dueDate },
    { key: "oldest", label: "ส่งก่อน (รอนานสุด)", value: (r) => r.createdAt },
    { key: "newest", label: "ส่งล่าสุด", value: (r) => r.createdAt, dir: "desc" },
    { key: "code", label: "รหัสคำขอ", value: (r) => r.code },
    { key: "title", label: "ชื่อคำขอ", value: (r) => r.title },
    { key: "dept", label: "ฝ่ายที่ส่ง", value: (r) => store.userById(r.requesterId)?.dept ?? "" },
  ];

  return (
    <>
      <PageHeader title="คำขอเข้าแผนก" sub={`คำขอที่ส่งถึง${user.dept}และรอแตกงานให้ทีม`} />
      <dl className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaries.map((summary) => (
          <Card key={summary.label} className="!min-w-0">
            <dt className="flex items-center gap-2 text-sm text-slate-500">
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
          <Card className="text-center text-sm text-slate-600">ไม่มีคำขอที่รอดำเนินการ</Card>
        ) : (
          sortBy(pendingRequests, options, sort).map((request) => {
            const category = store.categories.find((c) => c.id === request.categoryId);
            const approvedLog = store.logs.filter((l) => l.requestId === request.id && l.action === "อนุมัติ").at(-1);
            const approver = store.userById(approvedLog?.actorId ?? request.approverId);
            const forwardLog = store.logs.filter((l) => l.requestId === request.id && l.action.startsWith("ส่งต่อไป")).at(-1);
            return (
              <Card key={request.id}>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="table__id text-xs">{request.code}</p>
                      <CategoryTag category={category?.name ?? "-"} color={category?.color} />
                    </div>
                    <h2 className="mt-1 font-semibold">{request.title}</h2>
                    <p className="cell-sub mt-1">{store.userById(request.requesterId)?.dept} → {request.targetDept} · ต้องการภายใน {thaiDate(request.dueDate, true)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-green-700">
                      <CheckCircle1 size={14} className="shrink-0" aria-hidden="true" />
                      <span>
                        {approver
                          ? <>อนุมัติโดย {nick(approver.name)} ({approver.position}){approvedLog && <> · {thaiDate(approvedLog.createdAt, true)}</>}</>
                          : "ฝ่ายนี้ไม่มีหัวหน้าต้นสังกัด · ส่งตรงถึงแผนก"}
                      </span>
                    </p>
                    {forwardLog && <p className="mt-1 text-xs text-slate-500">ส่งต่อมาโดย {nick(store.userById(forwardLog.actorId)?.name)}{forwardLog.reason && ` · ${forwardLog.reason}`}</p>}
                  </div>
                  <LinkButton href={`/requests/${request.id}`} variant="ghost">ดูรายละเอียด</LinkButton>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {/* เปิดรายละเอียดเพื่อรับงานและแบ่งงานย่อยให้ทีม */}
                  <LinkButton href={`/incoming/${request.id}/plan`}>
                    <Layers2 size={18} aria-hidden="true" />
                    รับงานและแบ่งงาน
                  </LinkButton>
                  {/* เปิดหน้าส่งต่อแผนกอื่นหรือปฏิเสธคำขอ */}
                  <LinkButton href={`/incoming/${request.id}/decline`} variant="outline">
                    <ArrowBothDirectionHorizontal2 size={18} aria-hidden="true" />
                    ส่งต่อ / ปฏิเสธ
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
