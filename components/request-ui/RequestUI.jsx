"use client";

// ชุดคอมโพเนนต์หน้าจอของนพรัตน์ (เดิม components/tailgrids/RequestUI.jsx)
// ปรับให้เข้ากับระบบหลัก: ช่องค้นหา + กระดิ่งใช้ของจริงจาก page-header, ตั้งชื่อแท็บเบราว์เซอร์ตามหน้า
import Link from "next/link";
import { useEffect } from "react";
import { GlobalSearch, NotificationBell } from "@/components/page-header";
import { Badge as TailgridsBadge } from "@/components/tailgrids/core/badge";
import { Button as TailgridsButton } from "@/components/tailgrids/core/button";
import { Card as TailgridsCard } from "@/components/tailgrids/core/card";
import { Progress as TailgridsProgress } from "@/components/tailgrids/core/progress";
import { cn } from "@/utils/cn";

const BADGE_COLOR = {
  "ด่วน": "error",
  "ปกติ": "gray",
  "รออนุมัติ": "warning",
  "กำลังดำเนินการ": "primary",
  "รอดำเนินการ": "warning",
  "อนุมัติแล้ว": "success",
  "เสร็จสิ้น": "success",
  "ไม่อนุมัติ": "error",
};

const BUTTON_VARIANTS = {
  primary: { variant: "primary", appearance: "fill" },
  success: { variant: "success", appearance: "fill" },
  outline: { variant: "primary", appearance: "outline" },
  danger: { variant: "danger", appearance: "outline" },
  ghost: { variant: "ghost", appearance: "fill" },
};

const getCompletionHref = (hrefBase, categories, completion) => {
  const params = new URLSearchParams();
  categories.forEach((category) => params.append("category", category));
  if (completion) params.set("completion", completion);
  const query = params.toString();
  return query ? `${hrefBase}?${query}` : hrefBase;
};

export const Badge = ({ children }) => (
  <TailgridsBadge color={BADGE_COLOR[children] || "gray"}>{children}</TailgridsBadge>
);

export const Button = ({ variant = "primary", block = false, className = "", ...props }) => (
  <TailgridsButton
    {...BUTTON_VARIANTS[variant]}
    className={cn(block && "w-full", className)}
    {...props}
  />
);

export const Card = ({ pad = true, className = "", children }) => (
  <TailgridsCard className={cn("gap-0 rounded-xl border border-line bg-white", pad && "p-6", className)}>
    {children}
  </TailgridsCard>
);

export const Field = ({ label, children }) => (
  <label className="block"><span className="field__label">{label}</span>{children}</label>
);

/** @param {{ title: string, sub?: string, actions?: import("react").ReactNode, back?: string, backHref?: string, onBack?: () => void, statusFilter?: { hrefBase: string, selectedCategories: string[], selectedStatus: "unfinished" | "done" | null } }} props */
export const PageHeader = (props) => {
  const { title, sub, back, backHref, onBack, statusFilter, actions } = props;
  useEffect(() => { document.title = `${title} · ระบบจัดการคำขอ`; }, [title]);

  return (
    <div className="page-head">
      {back && (backHref
        ? <Link className="page-head__back" href={backHref}>‹ {back}</Link>
        : <button className="page-head__back" onClick={onBack}>‹ {back}</button>)}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-head__title">{title}</h1>
          {sub && <p className="page-head__sub">{sub}</p>}
        </div>
        <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <NotificationBell />
            {actions}
          </div>
          {statusFilter && (
            <div
              className="flex flex-wrap items-center justify-end gap-2"
              role="group"
              aria-label="กรองตามสถานะ"
            >
              <span className="text-sm font-medium text-slate-600">สถานะ:</span>
              {[
                { value: "unfinished", label: "ยังไม่เสร็จ" },
                { value: "done", label: "เสร็จแล้ว" },
              ].map(({ value, label }) => {
                const isSelected = statusFilter.selectedStatus === value;
                const nextStatus = isSelected ? null : value;
                const isDone = value === "done";

                return (
                  <Link
                    key={value}
                    href={getCompletionHref(
                      statusFilter.hrefBase,
                      statusFilter.selectedCategories,
                      nextStatus,
                    )}
                    aria-current={isSelected ? "page" : undefined}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      isSelected
                        ? isDone
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-brand bg-brand text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Table = ({ cols, children }) => (
  <div className="table-wrap"><div className="overflow-x-auto">
    <table className="table">
      <thead><tr>{cols.map((column, index) => <th key={index}>{column}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div></div>
);

export const Detail = ({ rows, className = "" }) => (
  <dl className={cn("detail", className)}>{rows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
);

export const Progress = ({ value }) => (
  <div>
    <div className="mb-1.5 flex justify-between text-xs" style={{ color: "var(--muted)" }}>
      <span>ความคืบหน้า</span><span>{value}%</span>
    </div>
    <TailgridsProgress progress={value} className="!max-w-full" trackColor="#ede9fe" barColor="var(--brand)" />
  </div>
);

export const Placeholder = ({ title }) => (
  <><PageHeader title={title} /><Card pad={false} className="card--empty">หน้า “{title}” ยังไม่ได้ทำ</Card></>
);
