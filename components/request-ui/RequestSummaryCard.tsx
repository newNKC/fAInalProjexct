'use client'

// การ์ดสรุปคำขอของนพรัตน์ (เดิมเขียนซ้ำในหน้าพิจารณา / แตกงาน / ไม่รับงาน) · ใช้ข้อมูลจริงจาก store
import type { ReactNode } from "react";
import { Eye, FileTextMultiple } from "@tailgrids/icons";
import CategoryTag from "@/components/request-ui/CategoryTag";
import StatusTag from "@/components/request-ui/StatusTag";
import { Card, Detail } from "@/components/request-ui/RequestUI";
import { STATUS_LABEL } from "@/components/status-badge";
import { fmtSize } from "@/components/request-parts";
import { openFile } from "@/data/files";
import { displayStatus, thaiDate, type Request } from "@/data/requests";
import { useStore } from "@/data/store";

export default function RequestSummaryCard({ r, className = "split-layout__wide", footer, showDetail = true }: {
  r: Request; className?: string; footer?: ReactNode; showDetail?: boolean
}) {
  const store = useStore();
  const requester = store.userById(r.requesterId);
  const category = store.categories.find((c) => c.id === r.categoryId);

  return (
    <Card className={className}>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="table__id">{r.code}</p>
          <CategoryTag category={category?.name ?? "-"} color={category?.color} />
          <StatusTag status={STATUS_LABEL[displayStatus(r)]} />
        </div>
        <h2 className="mt-1 text-lg font-semibold">{r.title}</h2>
      </div>
      <Detail
        className="!grid-cols-1 sm:!grid-cols-4"
        rows={[
          ["ผู้ขอ", requester?.name ?? "-"],
          ["แผนก", requester?.dept ?? "-"],
          ["วันที่ส่ง", thaiDate(r.createdAt, true)],
          ["วันที่ต้องการ", thaiDate(r.dueDate, true)],
        ]}
      />
      {showDetail && (
        <div className="mt-5">
          <h3 className="text-base font-semibold">รายละเอียด</h3>
          <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{r.detail}</p>
        </div>
      )}
      <div className="mt-6">
        <div className="cell-sub">เอกสารแนบ</div>
        {r.attachments.length === 0 && <p className="mt-2 text-sm text-slate-500">ไม่มีไฟล์แนบ</p>}
        {r.attachments.map((f) => (
          <div key={f.id} className="card mt-2 flex items-center justify-between gap-4 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <FileTextMultiple size={20} className="shrink-0 text-[#4338CA]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="cell-sub">{fmtSize(f.size)}</p>
              </div>
            </div>
            <button type="button" onClick={async () => { if (!await openFile(f.id, f.name)) store.showToast(`ไม่พบไฟล์ ${f.name} ในเครื่องนี้`); }}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#4338CA] hover:underline">
              <Eye size={18} aria-hidden="true" />
              เปิดดู
            </button>
          </div>
        ))}
      </div>
      {footer}
    </Card>
  );
}
