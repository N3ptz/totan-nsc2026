"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { childrenApi, assessmentsApi, recommendationsApi, type Child, type Assessment, type Recommendation } from "@/lib/api";
import { useUser } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { DashboardSkeleton } from "@/components/Skeleton";
import { ScrollFade } from "@/components/ScrollFade";
import { MascotBot } from "@/components/MascotBot";

// Count-up for stat values
function useCountUp(target: number, duration = 1100) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target <= 0) { setVal(0); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export default function DashboardPage() {
  const router = useRouter();
  const { lang, t } = useI18n();
  const td = t.dash;

  // ผู้ใช้มาจาก layout (โหลด /auth/me ครั้งเดียว) — ไม่ยิงซ้ำที่นี่แล้ว
  const { user } = useUser();
  // ผูก effect กับ role (string) ไม่ใช่ object user — object เปลี่ยน identity ตอน cache→ของจริง จะยิง fetch ซ้ำ
  const role = user?.role;
  const [children, setChildren] = useState<Child[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role) return; // รอ layout โหลดผู้ใช้ (มี cache ใน localStorage — มาแทบทันที)
    if (role === "admin") { router.replace("/dashboard/admin"); return; }
    (async () => {
      // ยิงขนานทั้ง 3 อย่างในรอบเดียว (เดิมเป็น waterfall 4 ชั้น: me → children → N×assessments → recs)
      const [kidsR, assessR, recsR] = await Promise.allSettled([
        childrenApi.list(),
        assessmentsApi.mine(),
        role === "doctor" ? recommendationsApi.sent() : recommendationsApi.mine(),
      ]);

      const kids = kidsR.status === "fulfilled" ? kidsR.value.data : [];
      setChildren(kids);
      if (recsR.status === "fulfilled") setRecommendations(recsR.value.data);

      if (assessR.status === "fulfilled") {
        setAssessments(assessR.value.data);
      } else if (kids.length > 0) {
        // fallback: backend เก่ายังไม่มี /assessments/mine → กลับไปยิงรายเด็ก (ขนาน)
        const results = await Promise.allSettled(kids.map(k => assessmentsApi.listByChild(k.id)));
        setAssessments(results.flatMap(r => (r.status === "fulfilled" ? r.value.data : [])));
      }
      setLoading(false);
    })();
  }, [role, router]);

  if (loading || !user) return <DashboardSkeleton />;

  const isDoctor = user?.role === "doctor";
  const displayName = user?.profile?.fullName ?? user?.email ?? "";

  const today = new Date().toDateString();
  const todayCount  = assessments.filter(a => new Date(a.createdAt).toDateString() === today).length;
  const pendingCount = assessments.filter(a => a.status === "pending" || a.status === "processing").length;
  const recCount    = isDoctor ? recommendations.length : recommendations.filter(r => !r.isRead).length;

  const bp = (v: number, max: number) => v === 0 ? 0 : Math.max(Math.min((v / max) * 100, 92), 6);

  const stats = [
    { label: isDoctor ? td.statPatients : td.statChildren, value: children.length,
      barPct: bp(children.length, 20),  icon: "👶", color: "primary",
      trend: lang === "th" ? `${children.length} คนทั้งหมด` : `${children.length} total` },
    { label: td.statToday,    value: todayCount,
      barPct: bp(todayCount, 10),       icon: "🔬", color: "success",
      trend: lang === "th" ? "วันนี้" : "today" },
    { label: td.statFollowup, value: pendingCount,
      barPct: bp(pendingCount, Math.max(children.length, 1)), icon: "📅", color: "warning",
      trend: lang === "th" ? "รอดำเนินการ" : "pending" },
    { label: isDoctor ? td.statSentRec : td.statNewRec, value: recCount,
      barPct: bp(recCount, 10),         icon: "💬", color: "accent",
      trend: lang === "th" ? (isDoctor ? "ที่ส่งแล้ว" : "ยังไม่อ่าน") : (isDoctor ? "sent" : "unread") },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed top-[-10%] right-[-6%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.13] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--aurora-1))" }} />
      <div className="fixed bottom-[-12%] left-[20%] w-[520px] h-[520px] rounded-full blur-[150px] opacity-[0.1] animate-aurora-slow pointer-events-none"
        style={{ background: "rgb(var(--aurora-3))" }} />

      <main className="min-h-screen relative z-10">

        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 pl-16 lg:pl-8 pr-4 sm:pr-8 py-4 glass border-b border-border/50">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">
              {td.greeting}, {displayName.split(" ")[0] || displayName} 👋
            </h1>
            <p className="font-body text-xs text-muted mt-0.5">
              {new Date().toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
          {isDoctor && (
            <Link href="/dashboard/patients/new"
              className="group relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden"
              style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 6px 20px rgb(var(--primary)/0.40)" }}>
              <span className="shine relative z-10">{td.addPatient}</span>
            </Link>
          )}
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Stats grid */}
          <div data-tour="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <StatCard key={s.label} {...s} barPct={s.barPct} index={i} />
            ))}
          </div>

          {/* Patient / Children list */}
          <div data-tour="patient-list" className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div>
                <h2 className="font-display text-base font-bold text-ink">
                  {isDoctor ? td.recentPatients : td.myChildren}
                </h2>
                <p className="text-xs font-body text-muted mt-0.5">
                  {children.length} {isDoctor ? (lang === "th" ? "ผู้ป่วย" : "patients") : (lang === "th" ? "คน" : "")}
                </p>
              </div>
              <Link href="/dashboard/patients"
                className="text-xs font-body font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                {td.viewAll}
              </Link>
            </div>

            {children.length === 0 ? (
              <EmptyState
                title={isDoctor ? td.noPatients : td.noChildren}
                desc={isDoctor ? td.addHint : td.contactHint} />
            ) : (
              <ScrollFade enabled={children.length > 5} maxHeight={336}>
              <div className="divide-y divide-border/40">
                {children.slice(0, 8).map((child, i) => (
                  <Link key={child.id} href={`/dashboard/patients/${child.id}`}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-primary/[0.04] transition-colors group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                      style={{ background: child.sex === "M" ? "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" : "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))" }}>
                      {child.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-semibold text-ink text-sm truncate">{child.name}</p>
                      <p className="font-body text-xs text-muted mt-0.5">
                        {calcAge(child.dateOfBirth, td.years)}{" · "}
                        {child.sex === "M" ? (lang === "th" ? "ชาย" : "Male") : (lang === "th" ? "หญิง" : "Female")}
                      </p>
                    </div>
                    <span className="font-body text-[11px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0 bg-success/10 text-success opacity-0 group-hover:opacity-100 transition-opacity">
                      {lang === "th" ? "ดูประวัติ" : "History"}
                    </span>
                    <svg className="w-4 h-4 text-muted/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
              </ScrollFade>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, trend, barPct, index = 0 }: { label: string; value: number; icon: string; color: string; trend: string; barPct: number; index?: number }) {
  const animated = useCountUp(value);
  const colorMap: Record<string, { text: string; bar: string }> = {
    primary: { text: "text-primary", bar: "bg-primary" },
    success: { text: "text-success", bar: "bg-success" },
    warning: { text: "text-warning", bar: "bg-warning" },
    accent:  { text: "text-accent",  bar: "bg-accent"  },
  };
  const c = colorMap[color] ?? colorMap.primary;
  return (
    <div className="group glass rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 cursor-default animate-reveal-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-bg2/60 transition-transform group-hover:scale-110 group-hover:-rotate-6">
          {icon}
        </div>
        <span className={`text-3xl font-bold font-display tabular-nums ${c.text}`}>{animated}</span>
      </div>
      <p className="font-body text-sm font-medium text-ink leading-tight mb-1">{label}</p>
      <p className="font-body text-[11px] text-muted">{trend}</p>
      <div className="mt-3 h-1.5 rounded-full bg-border/50 overflow-hidden">
        <div className={`h-full rounded-full ${c.bar} transition-all duration-1000`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcAge(dob: string, unit: string) {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  return `${years} ${unit}`;
}


function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="py-14 text-center flex flex-col items-center gap-3">
      <MascotBot size="md" variant="idle" />
      <p className="font-body font-semibold text-ink text-sm">{title}</p>
      <p className="font-body text-xs text-muted">{desc}</p>
    </div>
  );
}

