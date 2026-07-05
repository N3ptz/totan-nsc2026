"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, authApi, type AdminUserRow } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PatientsSkeleton } from "@/components/Skeleton";
import { ScrollFade } from "@/components/ScrollFade";
import { MascotBot } from "@/components/MascotBot";

type StatusFilter = "all" | "active" | "unverified" | "pending" | "inactive";

const STATUS_STYLE: Record<AdminUserRow["status"], { cls: string; th: string; en: string }> = {
  active:     { cls: "bg-success/10 text-success", th: "ใช้งานอยู่",   en: "Active" },
  unverified: { cls: "bg-muted/10 text-muted",      th: "ยังไม่ยืนยัน", en: "Unverified" },
  pending:    { cls: "bg-warning/10 text-warning",  th: "รออนุมัติ",   en: "Pending" },
  inactive:   { cls: "bg-danger/10 text-danger",    th: "ระงับการใช้งาน", en: "Suspended" },
};

const RELATIONSHIP_LABEL: Record<string, { th: string; en: string }> = {
  father:   { th: "บิดา",     en: "Father" },
  mother:   { th: "มารดา",    en: "Mother" },
  guardian: { th: "ผู้ปกครอง", en: "Guardian" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default function AdminParentsPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const th = lang === "th";
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    (async () => {
      try {
        // list endpoint มี admin guard ฝั่ง server อยู่แล้ว — ยิงขนานกับ me() ได้ ลด 1 RTT
        const [{ data: me }, { data }] = await Promise.all([authApi.me(), adminApi.listParents()]);
        if (me.role !== "admin") { router.replace("/dashboard"); return; }
        setRows(data);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <PatientsSkeleton />;

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = (r.fullName ?? "").toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    const matchFilter = filter === "all" || r.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-6%] w-[560px] h-[560px] rounded-full blur-[150px] opacity-[0.12] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--aurora-3))" }} />

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
            <h1 className="font-display text-xl font-bold text-ink">{th ? "ผู้ปกครองทั้งหมด" : "All Parents"}</h1>
            <p className="text-xs text-muted mt-0.5">{rows.length} {th ? "คนทั้งหมด" : "total"}</p>
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
              placeholder={th ? "ค้นหาชื่อหรืออีเมล..." : "Search name or email..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg2/60 text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-surface"
              style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem", paddingLeft: "2.25rem", paddingRight: "1rem" }}
            />
          </div>

          <div className="w-px h-6 bg-border/60 hidden sm:block" />

          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg2/60 border border-border/50 flex-wrap">
            {([
              ["all", th ? "ทั้งหมด" : "All"],
              ["active", th ? "ใช้งานอยู่" : "Active"],
              ["unverified", th ? "ยังไม่ยืนยัน" : "Unverified"],
              ["pending", th ? "รออนุมัติ" : "Pending"],
              ["inactive", th ? "ระงับ" : "Suspended"],
            ] as const).map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all ${
                  filter === v ? "text-white shadow-sm" : "text-muted hover:text-ink"
                }`}
                style={filter === v ? { background: "linear-gradient(120deg, rgb(var(--aurora-3)), rgb(var(--accent)))" } : undefined}>
                {label}
              </button>
            ))}
          </div>

          <span className="text-xs font-body text-muted ml-auto whitespace-nowrap">
            {th ? `${filtered.length} / ${rows.length} คน` : `${filtered.length} of ${rows.length}`}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="glass rounded-2xl py-20 px-8 text-center flex flex-col items-center gap-6">
            <MascotBot variant="idle" size="lg" message={th ? "ยังไม่มีผู้ปกครองในระบบ" : "No parents yet"} />
            <p className="font-display font-bold text-ink text-xl">
              {th ? "ยังไม่มีผู้ปกครองลงทะเบียน" : "No parents registered yet"}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <p className="font-display font-bold text-ink text-base">{th ? "ไม่พบผู้ปกครอง" : "No parents found"}</p>
            <p className="text-sm text-muted mt-1">{th ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "Try a different search or filter"}</p>
            <button onClick={() => { setSearch(""); setFilter("all"); }}
              className="mt-3 text-xs font-body font-semibold text-primary underline underline-offset-2 hover:text-primary/70 transition-colors">
              {th ? "ล้างตัวกรองทั้งหมด" : "Clear all filters"}
            </button>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <div className="hidden lg:grid grid-cols-[auto_1fr_110px_120px_120px_120px] gap-4 px-6 py-3 bg-bg2/40 border-b border-border/50 text-[11px] font-semibold text-muted uppercase tracking-wide">
                <span>#</span>
                <span>{th ? "ชื่อ / อีเมล" : "Name / Email"}</span>
                <span>{th ? "ความสัมพันธ์" : "Relation"}</span>
                <span>{th ? "เบอร์โทร" : "Phone"}</span>
                <span>{th ? "สถานะ" : "Status"}</span>
                <span>{th ? "สมัครเมื่อ" : "Joined"}</span>
              </div>

              <ScrollFade enabled={filtered.length > 5} maxHeight={420}>
                <div className="divide-y divide-border/40">
                  {filtered.map((row, i) => {
                    const st = STATUS_STYLE[row.status];
                    const rel = row.relationship ? RELATIONSHIP_LABEL[row.relationship] : null;
                    return (
                      <div key={row.id}>
                        {/* Desktop row */}
                        <div className="hidden lg:grid grid-cols-[auto_1fr_110px_120px_120px_120px] gap-4 items-center px-6 py-3.5 hover:bg-primary/[0.04] transition-colors duration-150">
                          <span className="text-xs text-muted/60 w-5">{i + 1}</span>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                              style={{ background: "linear-gradient(135deg,rgb(var(--aurora-3)),rgb(var(--accent)))" }}>
                              {getInitials(row.fullName ?? row.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-ink text-sm truncate">{row.fullName ?? "—"}</p>
                              <p className="text-[11px] text-muted truncate">{row.email}</p>
                            </div>
                          </div>
                          <span className="text-sm text-muted">{rel ? (th ? rel.th : rel.en) : "—"}</span>
                          <span className="text-sm text-muted">{row.phone ?? "—"}</span>
                          <span className={`inline-flex w-fit items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>
                            {th ? st.th : st.en}
                          </span>
                          <span className="text-sm text-muted">
                            {new Date(row.createdAt).toLocaleDateString(th ? "th-TH" : "en-US")}
                          </span>
                        </div>

                        {/* Mobile card */}
                        <div className="flex lg:hidden items-center gap-3 px-4 py-3.5">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                            style={{ background: "linear-gradient(135deg,rgb(var(--aurora-3)),rgb(var(--accent)))" }}>
                            {getInitials(row.fullName ?? row.email)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-ink text-sm truncate">{row.fullName ?? "—"}</p>
                            <p className="text-[11px] text-muted truncate">{row.email}</p>
                          </div>
                          <span className={`inline-flex w-fit items-center text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${st.cls}`}>
                            {th ? st.th : st.en}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollFade>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
