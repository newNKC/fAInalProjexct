'use client'

// พิจารณาคำขอ (งานของนพรัตน์ เดิม approvalsView/page.tsx + ApprovalDecisionPanel)
// ปรับให้ใช้ข้อมูลจริง: อนุมัติ/ส่งกลับเรียก store (คำขอไปต่อจริง) · ชื่อแผนกปลายทางตามคำขอ (ไม่ fix แผนก IT)
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Check } from "@tailgrids/icons";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Label } from "@/components/tailgrids/core/label";
import { Button, Card, Field, PageHeader } from "@/components/request-ui/RequestUI";
import RequestSummaryCard from "@/components/request-ui/RequestSummaryCard";
import { NoAccess } from "@/components/role-shell";
import { canApprove, findHead, nick } from "@/data/requests";
import { useStore } from "@/data/store";

export default function ApprovalsViewPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const request = store.requests.find((r) => r.id === Number(id));
  // ไม่ใช่คำขอที่รอคนนี้อนุมัติ (หรือพิจารณาไปแล้ว) → แจ้งแทนหน้า 404
  if (!request) return <NoAccess title="ไม่พบคำขอ" text="ไม่มีคำขอนี้ในระบบ หรือลิงก์ไม่ถูกต้อง" />;
  if (!canApprove(store.users, store.user!, request)) {
    return <NoAccess text="คำขอนี้ไม่ได้รอคุณอนุมัติ (อาจถูกพิจารณาไปแล้ว)" />;
  }

  return (
    <>
      <PageHeader title="พิจารณาคำขอ" sub={request.code} back="กลับไปรอการอนุมัติ" backHref="/approvals" />
      <div className="split-layout">
        {/* ฝั่งซ้ายแสดงข้อมูลคำขอ ส่วนฝั่งขวาเป็นปุ่มให้เลือกผลพิจารณา */}
        <RequestSummaryCard r={request} />
        <ApprovalDecisionPanel requestId={request.id} />
      </div>
    </>
  );
}

function ApprovalDecisionPanel({ requestId }: { requestId: number }) {
  const router = useRouter();
  const store = useStore();
  const request = store.requests.find((r) => r.id === requestId)!;
  const head = findHead(store.users, request.targetDept);
  const [isReturning, setIsReturning] = useState(false);
  const [comment, setComment] = useState("");
  // ตรวจในหน้าเอง (ข้อความสีแดงใต้ช่อง แบบเดียวกับหน้าอื่น) แทน bubble ของเบราว์เซอร์
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [checkError, setCheckError] = useState(false);
  const [commentError, setCommentError] = useState(false);

  const approveRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (["confirmDetails", "confirmDepartment", "confirmAttachments"].some((k) => !checks[k])) { setCheckError(true); return; }
    store.approve(requestId);
    store.showToast(`อนุมัติ ${request.code} แล้ว · ส่งต่อให้หัวหน้า${request.targetDept}`);
    router.push("/approvals");
  };

  const returnRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comment.trim()) { setCommentError(true); return; }
    store.returnRequest(requestId, comment.trim());
    store.showToast(`ส่ง ${request.code} กลับให้ ${nick(store.userById(request.requesterId)?.name)} แก้ไขแล้ว`);
    router.push("/approvals");
  };

  return (
    <Card className="h-fit">
      {isReturning ? (
        <form onSubmit={returnRequest} noValidate className="space-y-4">
          <button type="button" onClick={() => setIsReturning(false)} className="page-head__back">‹ กลับไปพิจารณา</button>
          <h3 className="font-semibold">ระบุข้อความที่ต้องการให้แก้ไข</h3>
          <Field label="รายละเอียดที่ต้องแก้ไข *">
            <textarea value={comment} onChange={(event) => { setComment(event.target.value); setCommentError(false); }} rows={4} className="input"
              placeholder="ระบุเหตุผลหรือรายละเอียดที่ต้องแก้ไข" aria-invalid={commentError} aria-describedby={commentError ? "comment-err" : undefined} autoFocus />
            {commentError && <span id="comment-err" className="text-xs text-red-600">กรุณาระบุเหตุผลที่ส่งกลับ</span>}
          </Field>
          <Button type="submit" variant="danger" block>
            <ArrowLeft size={18} aria-hidden="true" />
            ยืนยันส่งกลับให้แก้ไข
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <form onSubmit={approveRequest} noValidate className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">การพิจารณาของหัวหน้าต้นสังกัด</h3>
              <fieldset className="space-y-3">
                <legend className="mb-2 text-xs text-slate-600">ด่าน 1 จาก 2 ไม่ต้องขอผู้บริหารอนุมัติ</legend>
                <h3 className="font-semibold">ตรวจก่อนอนุมัติ</h3>
                {[
                  ["confirmDetails", "รายละเอียดตรงกับที่คุยกันไว้"],
                  ["confirmDepartment", `ส่งถึงแผนกที่ถูกต้อง (${request.targetDept})`],
                  ["confirmAttachments", "แนบไฟล์ที่จำเป็นครบ"],
                ].map(([key, text]) => (
                  <div key={key} className="flex items-start gap-3 rounded-lg border border-line p-3">
                    <Checkbox id={key} name={key} size="md" className="mt-1" checked={!!checks[key]}
                      onChange={(e) => { setChecks((c) => ({ ...c, [key]: e.target.checked })); setCheckError(false); }} />
                    <Label htmlFor={key}>{text}</Label>
                  </div>
                ))}
              </fieldset>
              {checkError && <p role="alert" className="text-xs text-red-600">กรุณาตรวจและติ๊กให้ครบทุกข้อก่อนอนุมัติ</p>}
            </div>
            <Button type="submit" variant="success" block>
              <Check size={18} aria-hidden="true" />
              อนุมัติและส่งต่อ{request.targetDept}
            </Button>
          </form>
          <Button type="button" variant="danger" block onPress={() => setIsReturning(true)}>
            <ArrowLeft size={18} aria-hidden="true" />
            ส่งกลับให้แก้ไข
          </Button>
          <p className="text-xs text-slate-600">อนุมัติแล้วคำขอไปที่หัวหน้า{request.targetDept} ({head ? nick(head.name) : "-"})</p>
        </div>
      )}
    </Card>
  );
}
