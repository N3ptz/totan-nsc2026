"use client";

import { adminApi, type AdminUserRow } from "@/lib/api";
import {
  AdminListPage, StatusPill, getInitials, USER_STATUS_STYLE, USER_STATUS_FILTERS,
} from "@/components/admin/AdminListPage";

const AVATAR_GRADIENT = "linear-gradient(135deg,rgb(var(--aurora-3)),rgb(var(--accent)))";

const RELATIONSHIP_LABEL: Record<string, { th: string; en: string }> = {
  father:   { th: "บิดา",     en: "Father" },
  mother:   { th: "มารดา",    en: "Mother" },
  guardian: { th: "ผู้ปกครอง", en: "Guardian" },
};

export default function AdminParentsPage() {
  return (
    <AdminListPage<AdminUserRow>
      title={{ th: "ผู้ปกครองทั้งหมด", en: "All Parents" }}
      countUnit={{ th: "คน", en: "parents" }}
      aurora="rgb(var(--aurora-3))"
      gradient="linear-gradient(120deg, rgb(var(--aurora-3)), rgb(var(--accent)))"
      fetcher={adminApi.listParents}
      searchPlaceholder={{ th: "ค้นหาชื่อหรืออีเมล...", en: "Search name or email..." }}
      searchText={r => `${r.fullName ?? ""} ${r.email}`}
      filters={USER_STATUS_FILTERS}
      statusOf={r => r.status}
      gridCols="grid-cols-[auto_1fr_110px_120px_120px_120px]"
      headers={[
        { th: "ชื่อ / อีเมล", en: "Name / Email" },
        { th: "ความสัมพันธ์", en: "Relation" },
        { th: "เบอร์โทร", en: "Phone" },
        { th: "สถานะ", en: "Status" },
        { th: "สมัครเมื่อ", en: "Joined" },
      ]}
      emptyMessage={{ th: "ยังไม่มีผู้ปกครองในระบบ", en: "No parents yet" }}
      emptyTitle={{ th: "ยังไม่มีผู้ปกครองลงทะเบียน", en: "No parents registered yet" }}
      notFoundTitle={{ th: "ไม่พบผู้ปกครอง", en: "No parents found" }}
      renderDesktopCells={(row, th) => {
        const rel = row.relationship ? RELATIONSHIP_LABEL[row.relationship] : null;
        return (
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
            <span className="text-sm text-muted">{rel ? (th ? rel.th : rel.en) : "—"}</span>
            <span className="text-sm text-muted">{row.phone ?? "—"}</span>
            <StatusPill style={USER_STATUS_STYLE[row.status]} th={th} />
            <span className="text-sm text-muted">
              {new Date(row.createdAt).toLocaleDateString(th ? "th-TH" : "en-US")}
            </span>
          </>
        );
      }}
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
