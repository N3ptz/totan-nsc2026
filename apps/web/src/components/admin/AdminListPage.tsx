"use client";

// Shell กลางของหน้ารายการแอดมิน (doctors / parents / scans) — auth guard,
// search + filter pills, empty/no-result states, ตาราง desktop + card mobile
// อยู่ที่นี่ที่เดียว แต่ละหน้าเหลือแค่ config + วิธี render cell ของตัวเอง

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { PatientsSkeleton } from "@/components/Skeleton";
import { ScrollFade } from "@/components/ScrollFade";
import { MascotBot } from "@/components/MascotBot";

export type L = { th: string; en: string };

export function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// สถานะบัญชีผู้ใช้ (doctors + parents ใช้ชุดเดียวกัน)
export const USER_STATUS_STYLE: Record<string, { cls: string; th: string; en: string }> = {
  active:     { cls: "bg-success/10 text-success", th: "ใช้งานอยู่",   en: "Active" },
  unverified: { cls: "bg-muted/10 text-muted",      th: "ยังไม่ยืนยัน", en: "Unverified" },
  pending:    { cls: "bg-warning/10 text-warning",  th: "รออนุมัติ",   en: "Pending" },
  inactive:   { cls: "bg-danger/10 text-danger",    th: "ระงับการใช้งาน", en: "Suspended" },
};

export const USER_STATUS_FILTERS: readonly (readonly [string, L])[] = [
  ["all",        { th: "ทั้งหมด",      en: "All" }],
  ["active",     { th: "ใช้งานอยู่",   en: "Active" }],
  ["unverified", { th: "ยังไม่ยืนยัน", en: "Unverified" }],
  ["pending",    { th: "รออนุมัติ",    en: "Pending" }],
  ["inactive",   { th: "ระงับ",        en: "Suspended" }],
];

export function StatusPill({ style, th }: { style: { cls: string; th: string; en: string }; th: boolean }) {
  return (
    <span className={`inline-flex w-fit items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${style.cls}`}>
      {th ? style.th : style.en}
    </span>
  );
}

export function AdminListPage<T extends { id: string }>({
  title, countUnit, aurora, gradient,
  fetcher, searchPlaceholder, searchText,
  filters, statusOf,
  gridCols, headers,
  emptyMessage, emptyTitle, notFoundTitle,
  renderDesktopCells, renderMobile,
}: {
  title: L;
  countUnit: L;                         // "คน" / "รายการ"
  aurora: string;                       // สี blob พื้นหลัง เช่น "rgb(var(--aurora-1))"
  gradient: string;                     // gradient ของ filter pill ที่ active
  fetcher: () => Promise<{ data: T[] }>;
  searchPlaceholder: L;
  searchText: (row: T) => string;       // ข้อความที่ใช้ match กับช่องค้นหา
  filters: readonly (readonly [string, L])[];
  statusOf: (row: T) => string;
  gridCols: string;                     // tailwind grid-cols-[...] เต็ม ๆ (JIT ต้องเห็น class ตรง ๆ จากผู้เรียก)
  headers: L[];
  emptyMessage: L;                      // ข้อความ mascot ตอนไม่มีข้อมูลเลย
  emptyTitle: L;
  notFoundTitle: L;                     // ตอน filter แล้วว่าง
  renderDesktopCells: (row: T, th: boolean) => ReactNode; // ทุก cell หลังคอลัมน์ #
  renderMobile: (row: T, th: boolean) => ReactNode;
}) {
  const router = useRouter();
  const { lang } = useI18n();
  const th = lang === "th";
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // role มาจาก context ของ layout — list endpoint มี admin guard ฝั่ง server อยู่แล้ว
  // (ผูกกับ role ไม่ใช่ object user — กันยิง fetch ซ้ำตอน cache→ของจริง)
  const { user } = useUser();
  const role = user?.role;
  useEffect(() => {
    if (!role) return;
    if (role !== "admin") { router.replace("/dashboard"); return; }
    (async () => {
      try {
        const { data } = await fetcher();
        setRows(data);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
    // fetcher เป็น config คงที่ต่อหน้า — ไม่ใส่ใน deps เพื่อไม่ refetch ทุก render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, router]);

  if (loading) return <PatientsSkeleton />;

  const filtered = rows.filter(r => {
    const matchSearch = searchText(r).toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || statusOf(r) === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-6%] w-[560px] h-[560px] rounded-full blur-[150px] opacity-[0.12] animate-aurora pointer-events-none"
        style={{ background: aurora }} />

      <header className="sticky top-0 z-30 pl-16 lg:pl-8 pr-8 py-5 glass border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/admin"
              className="inline-flex items-center gap-1.5 text-xs font-body font-semibold text-muted hover:text-ink transition-colors mb-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {th ? "แผงควบคุมผู้ดูแลระบบ" : "Admin Dashboard"}
            </Link>
            <h1 className="font-display text-xl font-bold text-ink">{th ? title.th : title.en}</h1>
            <p className="text-xs text-muted mt-0.5">{rows.length} {th ? `${countUnit.th}ทั้งหมด` : "total"}</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 p-8 space-y-5">
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] group">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none transition-colors group-focus-within:text-primary"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder={th ? searchPlaceholder.th : searchPlaceholder.en}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg2/60 text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-surface"
              style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem", paddingLeft: "2.25rem", paddingRight: "1rem" }}
            />
          </div>

          <div className="w-px h-6 bg-border/60 hidden sm:block" />

          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg2/60 border border-border/50 flex-wrap">
            {filters.map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all ${
                  filter === v ? "text-white shadow-sm" : "text-muted hover:text-ink"
                }`}
                style={filter === v ? { background: gradient } : undefined}>
                {th ? label.th : label.en}
              </button>
            ))}
          </div>

          <span className="text-xs font-body text-muted ml-auto whitespace-nowrap">
            {th ? `${filtered.length} / ${rows.length} ${countUnit.th}` : `${filtered.length} of ${rows.length}`}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="glass rounded-2xl py-20 px-8 text-center flex flex-col items-center gap-6">
            <MascotBot variant="idle" size="lg" message={th ? emptyMessage.th : emptyMessage.en} />
            <p className="font-display font-bold text-ink text-xl">{th ? emptyTitle.th : emptyTitle.en}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <p className="font-display font-bold text-ink text-base">{th ? notFoundTitle.th : notFoundTitle.en}</p>
            <p className="text-sm text-muted mt-1">{th ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "Try a different search or filter"}</p>
            <button onClick={() => { setSearch(""); setFilter("all"); }}
              className="mt-3 text-xs font-body font-semibold text-primary underline underline-offset-2 hover:text-primary/70 transition-colors">
              {th ? "ล้างตัวกรองทั้งหมด" : "Clear all filters"}
            </button>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className={`hidden lg:grid ${gridCols} gap-4 px-6 py-3 bg-bg2/40 border-b border-border/50 text-[11px] font-semibold text-muted uppercase tracking-wide`}>
                <span>#</span>
                {headers.map((h, i) => <span key={i}>{th ? h.th : h.en}</span>)}
              </div>

              <ScrollFade enabled={filtered.length > 5} maxHeight={420}>
                <div className="divide-y divide-border/40">
                  {filtered.map((row, i) => (
                    <div key={row.id}>
                      {/* Desktop row */}
                      <div className={`hidden lg:grid ${gridCols} gap-4 items-center px-6 py-3.5 hover:bg-primary/[0.04] transition-colors duration-150`}>
                        <span className="text-xs text-muted/60 w-5">{i + 1}</span>
                        {renderDesktopCells(row, th)}
                      </div>

                      {/* Mobile card */}
                      <div className="flex lg:hidden items-center gap-3 px-4 py-3.5">
                        {renderMobile(row, th)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollFade>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
