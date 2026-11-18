'use client'

// ส่งต่อ / ปฏิเสธคำขอ (งานของนพรัตน์ เดิม incoming/incomingReject/page.tsx)
// ปรับให้ใช้ข้อมูลจริง: ยืนยันแล้วเรียก store (คำขอปิด/ย้ายแผนกจริง) · รายชื่อแผนกจาก store
// เพิ่ม: ส่งต่อต้องมีเหตุผลด้วย (requirement "ทุกกรณีต้องมีเหตุผล")
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle1 } from "@tailgrids/icons";
import { Badge, Button, Card, Detail, Field, PageHeader } from "@/components/request-ui/RequestUI";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import {
  Combobox, ComboboxContent, ComboboxInput, ComboboxInputWrapper, ComboboxItem, ComboboxList, ComboboxTrigger,
} from "@/components/tailgrids/core/combobox";
import CategoryTag from "@/components/request-ui/CategoryTag";
import StatusTag from "@/components/request-ui/StatusTag";
import { NoAccess } from "@/components/role-shell";
import { findHead, nick, thaiDate } from "@/data/requests";
import { useStore } from "@/data/store";

export default function DepartmentRejectPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const user = store.user!;
  const [finished, setFinished] = useState(false);
  const request = store.requests.find((r) => r.id === Number(id));
  if (!request) return <NoAccess title="ไม่พบคำขอ" text="ไม่มีคำขอนี้ในระบบ หรือลิงก์ไม่ถูกต้อง" />;
  if ((!finished && (request.targetDept !== user.dept || request.status !== "pending_target"))) {
    return <NoAccess text="คำขอนี้ไม่ได้รอแผนกของคุณพิจารณา" />;
  }
  const category = store.categories.find((c) => c.id === request.categoryId);
  const approvedLog = store.logs.filter((l) => l.requestId === request.id && l.action === "อนุมัติ").at(-1);
  const approver = store.userById(approvedLog?.actorId ?? request.approverId);

  return (
    <>
      <PageHeader title="ส่งต่อ / ปฏิเสธคำขอ" sub={request.code} back="กลับไปคำขอเข้าแผนก" backHref="/incoming" />
      <div className="split-layout">
        <Card className="h-fit">
          <div className="flex flex-wrap items-center gap-2">
            <p className="table__id text-xs">{request.code}</p>
            <StatusTag status="รอแผนกปลายทาง" />
            <CategoryTag category={category?.name ?? "-"} color={category?.color} />
          </div>
          <h2 className="mt-1 font-semibold">{request.title}</h2>
          <Detail
            className="mt-4 !grid-cols-1 sm:!grid-cols-3"
            rows={[
              ["ผู้ขอ", store.userById(request.requesterId)?.name ?? "-"],
              ["ส่งถึง", request.targetDept],
              ["วันที่ต้องการ", thaiDate(request.dueDate, true)],
            ]}
          />
          <p className="mt-4 text-sm whitespace-pre-line text-slate-600">{request.detail}</p>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-green-700">
            <CheckCircle1 size={14} className="shrink-0" aria-hidden="true" />
            <span>
              {approver
                ? <>อนุมัติโดย {nick(approver.name)} ({approver.position}){approvedLog && <> · {thaiDate(approvedLog.createdAt, true)}</>}</>
                : "ฝ่ายนี้ไม่มีหัวหน้าต้นสังกัด · ส่งตรงถึงแผนก"}
            </span>
          </p>
        </Card>
        <ForwardRejectForm key={request.id} requestId={request.id} backHref="/incoming" onDone={() => setFinished(true)} />
      </div>
    </>
  );
}

function ForwardRejectForm({ requestId, backHref, onDone }: { requestId: number; backHref: string; onDone: () => void }) {
  const router = useRouter();
  const store = useStore();
  const request = store.requests.find((r) => r.id === requestId)!;
  // แผนกที่ส่งต่อได้ = แผนกอื่นที่มีหัวหน้าแผนกในระบบ
  const forwardTo = store.depts.filter((d) => d !== store.user!.dept && findHead(store.users, d));
  // ลิงก์ "ส่งต่อแผนกอื่น" / "ปฏิเสธ" จากหน้าอื่นเลือกตัวเลือกไว้ให้ก่อน (?mode=)
  const initial = useSearchParams().get("mode");
  // เก็บตัวเลือก เหตุผล และปลายทางไว้ชั่วคราวระหว่างกรอกฟอร์ม
  const [action, setAction] = useState<"forward" | "reject" | null>(initial === "forward" || initial === "reject" ? initial : null);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [forwardReason, setForwardReason] = useState("");
  const [done, setDone] = useState<"forward" | "reject" | null>(null);
  const canSubmit =
    action === "forward" ? Boolean(to) && forwardReason.trim().length > 0
      : action === "reject" ? reason.trim().length > 0
        : false;
  const toggleAction = (nextAction: "forward" | "reject") => {
    setAction((current) => (current === nextAction ? null : nextAction));
  };

  const confirm = () => {
    if (action === "forward" && to && forwardReason.trim()) {
      onDone();
      store.forwardRequest(requestId, to, forwardReason.trim());
      store.showToast(`ส่งต่อ ${request.code} ไป${to}แล้ว`);
      setDone("forward");
    } else if (action === "reject" && reason.trim()) {
      onDone();
      store.rejectRequest(requestId, reason.trim());
      store.showToast(`ปฏิเสธ ${request.code} แล้ว · ผู้ขอจะเห็นเหตุผล`);
      setDone("reject");
    }
  };

  return (
    <Card className="split-layout__wide">
      {/* หลังยืนยัน แสดงผลที่เลือกและปุ่มกลับไปหน้ารายการ */}
      {done ? (
        <div className="py-8 text-center">
          <Badge>{done === "forward" ? "กำลังดำเนินการ" : "ไม่อนุมัติ"}</Badge>
          <p className="mt-3 text-sm">{done === "forward" ? `ส่งต่อให้ ${to} แล้ว` : "ปฏิเสธคำขอและแจ้งผู้ขอแล้ว"}</p>
          <Button variant="outline" className="mt-4" onPress={() => router.push(backHref)}>กลับไปรายการ</Button>
        </div>
      ) : (
        // เลือกได้ครั้งละแบบ: ปฏิเสธพร้อมเหตุผล หรือส่งต่อไปแผนกอื่น
        <div className="space-y-4">
          <h2 className="font-semibold">ไม่รับงานนี้</h2>
          <p className="text-xs text-slate-500">เลือกอย่างใดอย่างหนึ่ง · ทุกกรณีต้องมีเหตุผล ผู้ขอจะเห็นเหตุผลนี้</p>
          <Card className="border border-slate-200 p-4">
            <label htmlFor="reject-with-reason" className="flex cursor-pointer items-center gap-3">
              <Checkbox id="reject-with-reason" checked={action === "reject"} onChange={() => toggleAction("reject")} />
              <span className="font-medium">ปฏิเสธพร้อมเหตุผล</span>
            </label>
            <div className="mt-4">
              <Field label="เหตุผล *">
                <textarea rows={4} className="input" value={reason} onChange={(event) => setReason(event.target.value)}
                  placeholder="ระบุเหตุผลที่ไม่สามารถดำเนินการได้" disabled={action !== "reject"} required={action === "reject"} />
              </Field>
            </div>
          </Card>
          <Card className="border border-slate-200 p-4">
            <label htmlFor="forward-to-department" className="flex cursor-pointer items-start gap-3">
              <Checkbox id="forward-to-department" checked={action === "forward"} onChange={() => toggleAction("forward")} />
              <span className="font-medium">ส่งต่อแผนกอื่น (ผู้ขอเลือกแผนกผิด)</span>
            </label>
            <div className="mt-4 space-y-4">
              <Field label="ส่งต่อไปที่ *">
                <Combobox selectedKey={to || null} onSelectionChange={(key) => setTo(key === null ? "" : String(key))} isDisabled={action !== "forward"} aria-label="ส่งต่อไปที่">
                  <ComboboxInputWrapper>
                    <ComboboxInput placeholder="เลือกแผนกปลายทาง" />
                    <ComboboxTrigger />
                  </ComboboxInputWrapper>
                  <ComboboxContent>
                    <ComboboxList emptyMessage="ไม่พบแผนกปลายทาง">
                      {forwardTo.map((department) => (
                        <ComboboxItem key={department} id={department}>{department}</ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
              <Field label="เหตุผลที่ส่งต่อ *">
                <textarea rows={3} className="input" value={forwardReason} onChange={(event) => setForwardReason(event.target.value)}
                  placeholder="เช่น เป็นงานรายงาน แผนกข้อมูลรับผิดชอบโดยตรง" disabled={action !== "forward"} required={action === "forward"} />
              </Field>
            </div>
          </Card>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onPress={() => router.push(backHref)}>ยกเลิก</Button>
            <Button variant="danger" disabled={!canSubmit} onPress={confirm}>ยืนยัน</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
