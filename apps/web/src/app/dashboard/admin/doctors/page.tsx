"use client";

import { adminApi, type AdminUserRow } from "@/lib/api";
import {
  AdminListPage, StatusPill, getInitials, USER_STATUS_STYLE, USER_STATUS_FILTERS,
} from "@/components/admin/AdminListPage";

const AVATAR_GRADIENT = "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))";

export default function AdminDoctorsPage() {
  return (
    <AdminListPage<AdminUserRow>
      title={{ th: "แพทย์ทั้งหมด", en: "All Doctors" }}
      countUnit={{ th: "คน", en: "doctors" }}
      aurora="rgb(var(--aurora-1))"
      gradient="linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))"
      fetcher={adminApi.listDoctors}
      searchPlaceholder={{ th: "ค้นหาชื่อหรืออีเมล...", en: "Search name or email..." }}
      searchText={r => `${r.fullName ?? ""} ${r.email}`}
      filters={USER_STATUS_FILTERS}
      statusOf={r => r.status}
      gridCols="grid-cols-[auto_1fr_140px_120px_120px]"
      headers={[
        { th: "ชื่อ / อีเมล", en: "Name / Email" },
        { th: "เบอร์โทร", en: "Phone" },
        { th: "สถานะ", en: "Status" },
        { th: "สมัครเมื่อ", en: "Joined" },
      ]}
      emptyMessage={{ th: "ยังไม่มีแพทย์ในระบบ", en: "No doctors yet" }}
      emptyTitle={{ th: "ยังไม่มีแพทย์ลงทะเบียน", en: "No doctors registered yet" }}
      notFoundTitle={{ th: "ไม่พบแพทย์", en: "No doctors found" }}
      renderDesktopCells={(row, th) => (
        <>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
              style={{ background: AVATAR_GRADIENT }}>
              {getInitials(row.fullName ?? row.email)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink text-sm truncate">{row.fullName ?? "—"}</p>
              <p className="text-[11px] text-muted truncate">{row.email}</p>
            </div>
          </div>
          <span className="text-sm text-muted">{row.phone ?? "—"}</span>
          <StatusPill style={USER_STATUS_STYLE[row.status]} th={th} />
          <span className="text-sm text-muted">
            {new Date(row.createdAt).toLocaleDateString(th ? "th-TH" : "en-US")}
          </span>
        </>
      )}
      renderMobile={(row, th) => (
        <>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
            style={{ background: AVATAR_GRADIENT }}>
            {getInitials(row.fullName ?? row.email)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-sm truncate">{row.fullName ?? "—"}</p>
            <p className="text-[11px] text-muted truncate">{row.email}</p>
          </div>
          <StatusPill style={USER_STATUS_STYLE[row.status]} th={th} />
        </>
      )}
    />
  );
}
