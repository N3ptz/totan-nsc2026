"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { childrenApi, authApi, type Child } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PatientsSkeleton } from "@/components/Skeleton";

function calcAge(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() - birth.getMonth() < 0 || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
  return years;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export default function PatientsPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const th = lang === "th";
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "M" | "F">("all");
  const [isDoctor, setIsDoctor] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    // fast path: seed from localStorage; always confirm from API
    try {
      const cached = JSON.parse(localStorage.getItem("user") || "{}");
      if (cached.role) setIsDoctor(cached.role === "doctor");
    } catch {}
    (async () => {
      try {
        const [{ data: me }, { data: kids }] = await Promise.all([
          authApi.me(),
          childrenApi.list(),
        ]);
        setIsDoctor(me.role === "doctor");
        setChildren(kids);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <PatientsSkeleton />;

  const filtered = children.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.sex === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient aurora */}
      <div className="fixed top-[-10%] right-[-6%] w-[560px] h-[560px] rounded-full blur-[150px] opacity-[0.12] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--aurora-1))" }} />
      <div className="fixed bottom-[-12%] left-[26%] w-[480px] h-[480px] rounded-full blur-[150px] opacity-[0.1] animate-aurora-slow pointer-events-none"
        style={{ background: "rgb(var(--aurora-4))" }} />

      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-5 glass border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">
              {th
                ? (isDoctor ? "รายชื่อผู้ป่วย" : "บุตรหลาน")
                : (isDoctor ? "Patients" : "My Children")}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {children.length} {th ? "คนทั้งหมด" : "total"}
            </p>
          </div>
          {isDoctor && (
            <Link href="/dashboard/patients/new"
              className="group relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden"
              style={{ background: "linear-gradient(120deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.35)" }}>
              <span className="shine relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {th ? "เพิ่มผู้ป่วย" : "Add Patient"}
              </span>
            </Link>
          )}
        </div>
      </header>

      <div className="relative z-10 p-8 space-y-5">
        {/* Search & Filter bar */}
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          {/* Search input */}
          <div className="relative flex-1 min-w-[180px] group">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none transition-colors group-focus-within:text-primary"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder={th ? (isDoctor ? "ค้นหาชื่อผู้ป่วย..." : "ค้นหาชื่อบุตรหลาน...") : (isDoctor ? "Search patients..." : "Search children...")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg2/60 text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:bg-surface"
              style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem", paddingLeft: "2.25rem", paddingRight: "1rem" }}
            />
          </div>

          <div className="w-px h-6 bg-border/60 hidden sm:block" />

          {/* Gender filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg2/60 border border-border/50">
            {([["all", th ? "ทั้งหมด" : "All"], ["M", th ? "ชาย" : "Male"], ["F", th ? "หญิง" : "Female"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all ${
                  filter === v ? "text-white shadow-sm" : "text-muted hover:text-ink"
                }`}
                style={filter === v ? { background: "linear-gradient(120deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" } : undefined}>
                {label}
              </button>
            ))}
          </div>

          <span className="text-xs font-body text-muted ml-auto whitespace-nowrap">
            {th ? `${filtered.length} / ${children.length} คน` : `${filtered.length} of ${children.length}`}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">{th ? "กำลังโหลด..." : "Loading..."}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-5xl mb-3 animate-float-soft inline-block">🔍</div>
            <p className="font-semibold text-ink text-sm">
              {th ? (isDoctor ? "ไม่พบผู้ป่วย" : "ไม่พบบุตรหลาน") : (isDoctor ? "No patients found" : "No children found")}
            </p>
            <p className="text-xs text-muted mt-1">{th ? "ลองเปลี่ยนคำค้นหา" : "Try a different search"}</p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_120px_100px_100px_80px] gap-4 px-6 py-3 bg-bg2/40 border-b border-border/50 text-[11px] font-semibold text-muted uppercase tracking-wide">
              <span>#</span>
              <span>{th ? "ชื่อ" : "Name"}</span>
              <span>{th ? "วันเกิด" : "DOB"}</span>
              <span>{th ? "อายุ" : "Age"}</span>
              <span>{th ? "เพศ" : "Sex"}</span>
              <span></span>
            </div>

            <div className="divide-y divide-border/40">
              {filtered.map((child, i) => {
                const age = calcAge(child.dateOfBirth);
                const isM = child.sex === "M";
                return (
                  <Link key={child.id} href={`/dashboard/patients/${child.id}`}
                    className="grid grid-cols-[auto_1fr_120px_100px_100px_80px] gap-4 items-center px-6 py-3.5 hover:bg-primary/[0.04] transition-colors group">
                    <span className="text-xs text-muted/60 w-5">{i + 1}</span>

                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 text-white transition-transform group-hover:scale-105"
                        style={{ background: isM ? "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" : "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))" }}>
                        {getInitials(child.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink text-sm truncate">{child.name}</p>
                        <p className="text-[11px] text-muted">{child.ethnicity ?? ""}</p>
                      </div>
                    </div>

                    <span className="text-sm text-muted">
                      {new Date(child.dateOfBirth).toLocaleDateString(th ? "th-TH" : "en-US")}
                    </span>

                    <span className="text-sm font-medium text-ink">{age} {th ? "ปี" : "yrs"}</span>

                    <span className={`inline-flex w-fit items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      isM ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                    }`}>
                      {isM ? (th ? "♂ ชาย" : "♂ M") : (th ? "♀ หญิง" : "♀ F")}
                    </span>

                    <div className="flex justify-end">
                      <svg className="w-4 h-4 text-muted/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
