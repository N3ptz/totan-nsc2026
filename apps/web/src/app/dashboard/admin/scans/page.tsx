"use client";

import { adminApi, type AdminScanRow } from "@/lib/api";
import { fmtYearsMonths } from "@/components/patient/utils";
import { AdminListPage, StatusPill } from "@/components/admin/AdminListPage";

const SCAN_STATUS_STYLE: Record<AdminScanRow["status"], { cls: string; th: string; en: string }> = {
  pending:    { cls: "bg-muted/10 text-muted",     th: "รอประมวลผล",   en: "Pending" },
  processing: { cls: "bg-warning/10 text-warning", th: "กำลังประมวลผล", en: "Processing" },
  completed:  { cls: "bg-success/10 text-success", th: "เสร็จสิ้น",     en: "Completed" },
  failed:     { cls: "bg-danger/10 text-danger",   th: "ผิดพลาด",       en: "Failed" },
};

const boneAgeText = (row: AdminScanRow, th: boolean) =>
  row.boneAgeMonths != null ? fmtYearsMonths(row.boneAgeMonths, th) : "—";

export default function AdminScansPage() {
  return (
    <AdminListPage<AdminScanRow>
      title={{ th: "การสแกนทั้งหมด", en: "All Scans" }}
      countUnit={{ th: "รายการ", en: "scans" }}
      aurora="rgb(var(--primary))"
      gradient="linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))"
      fetcher={adminApi.listScans}
      searchPlaceholder={{ th: "ค้นหาชื่อเด็กหรือแพทย์...", en: "Search child or doctor..." }}
      searchText={r => `${r.childName ?? ""} ${r.doctorName ?? ""}`}
      filters={[
        ["all",        { th: "ทั้งหมด",      en: "All" }],
        ["pending",    { th: "รอประมวลผล",  en: "Pending" }],
        ["processing", { th: "กำลังทำ",      en: "Processing" }],
        ["completed",  { th: "เสร็จสิ้น",    en: "Completed" }],
        ["failed",     { th: "ผิดพลาด",      en: "Failed" }],
      ]}
      statusOf={r => r.status}
      gridCols="grid-cols-[auto_1fr_1fr_110px_120px_120px]"
      headers={[
        { th: "ผู้ป่วย", en: "Patient" },
        { th: "แพทย์", en: "Doctor" },
        { th: "อายุกระดูก", en: "Bone Age" },
        { th: "สถานะ", en: "Status" },
        { th: "วันที่", en: "Date" },
      ]}
      emptyMessage={{ th: "ยังไม่มีการสแกนในระบบ", en: "No scans yet" }}
      emptyTitle={{ th: "ยังไม่มีการประเมินในระบบ", en: "No assessments yet" }}
      notFoundTitle={{ th: "ไม่พบรายการ", en: "No scans found" }}
      renderDesktopCells={(row, th) => (
        <>
          <div className="min-w-0">
            <p className="font-semibold text-ink text-sm truncate">{row.childName ?? "—"}</p>
            {row.isMock && (
              <span className="text-[10px] font-semibold text-warning">{th ? "ผลจำลอง" : "Simulated"}</span>
            )}
          </div>
          <span className="text-sm text-muted truncate">{row.doctorName ?? "—"}</span>
          <span className="text-sm text-ink font-medium">{boneAgeText(row, th)}</span>
          <StatusPill style={SCAN_STATUS_STYLE[row.status]} th={th} />
          <span className="text-sm text-muted">
            {new Date(row.createdAt).toLocaleDateString(th ? "th-TH" : "en-US")}
          </span>
        </>
      )}
      renderMobile={(row, th) => (
        <>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm truncate">{row.childName ?? "—"}</p>
            <p className="text-[11px] text-muted truncate">{row.doctorName ?? "—"} · {boneAgeText(row, th)}</p>
          </div>
          <StatusPill style={SCAN_STATUS_STYLE[row.status]} th={th} />
        </>
      )}
    />
  );
}
