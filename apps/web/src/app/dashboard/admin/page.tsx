"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, apiClient, adminApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// ── Types ──────────────────────────────────────────────────────────────────────
interface User { id: string; email: string; role: string; profile?: { fullName?: string } }

type ServiceStatus = "online" | "degraded" | "offline" | "checking";

interface ServiceHealth {
  name:    string;
  path:    string;
  status:  ServiceStatus;
  latency: number;
}

interface AnalyticsStat {
  key:      string;
  value:    number;
  suffix:   string;
  icon:     string;
  color:    "primary" | "success" | "warning" | "accent";
  label_th: string;
  label_en: string;
  href?:    string;
}

// ── Service health endpoints ───────────────────────────────────────────────────
const SERVICE_DEFS = [
  { name: "Auth Service",    path: "/auth/health"    },
  { name: "Patient Service", path: "/children/health" },
  { name: "AI Service",      path: "/ai/health"       },
  { name: "Notify Service",  path: "/notify/health"   },
];

// ── Platform analytics — real counts fetched from /admin/stats below ───────────
const ANALYTICS_BASE: AnalyticsStat[] = [
  { key: "scans",   value: 0, suffix: "",  icon: "🔬", color: "primary", label_th: "การสแกน AI ทั้งหมด",    label_en: "Total AI Scans",      href: "/dashboard/admin/scans"   },
  { key: "doctors", value: 0, suffix: "",  icon: "👨‍⚕️", color: "success", label_th: "แพทย์ที่ใช้งานอยู่",  label_en: "Active Doctors",      href: "/dashboard/admin/doctors" },
  { key: "parents", value: 0, suffix: "",  icon: "👨‍👩‍👧", color: "accent",  label_th: "ผู้ปกครองที่ลงทะเบียน", label_en: "Registered Parents", href: "/dashboard/admin/parents" },
  { key: "uptime",  value: 0, suffix: "%", icon: "⚡", color: "warning", label_th: "บริการออนไลน์",         label_en: "Services Online"      },
];

// ── Hooks ──────────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target <= 0) { setVal(0); return; }
    let raf = 0;
    const t0 = performance.now();
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

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ id, icon, title, subtitle, badge }: {
  id?: string; icon: string; title: string; subtitle: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: "rgb(var(--primary)/0.10)", border: "1px solid rgb(var(--primary)/0.18)" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 id={id} className="font-display text-base font-bold text-ink">{title}</h2>
          {badge}
        </div>
        <p className="font-body text-xs text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const palette: Record<ServiceStatus, { badge: string; dot: string; label: string }> = {
    online:   { badge: "text-success bg-success/10 border-success/25",  dot: "bg-success animate-pulse", label: "Online"   },
    degraded: { badge: "text-warning bg-warning/10 border-warning/25",  dot: "bg-warning animate-pulse", label: "Degraded" },
    offline:  { badge: "text-danger  bg-danger/10  border-danger/25",   dot: "bg-danger",                label: "Offline"  },
    checking: { badge: "text-muted   bg-muted/10   border-muted/25",    dot: "bg-muted   animate-pulse", label: "…"        },
  };
  const p = palette[service.status];

  return (
    <article className="glass rounded-2xl p-5 group hover:-translate-y-0.5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/8">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgb(var(--primary)/0.10)", border: "1px solid rgb(var(--primary)/0.18)" }}>
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <rect x="2" y="3" width="20" height="7" rx="2" strokeLinecap="round" />
            <rect x="2" y="14" width="20" height="7" rx="2" strokeLinecap="round" />
            <circle cx="6" cy="6.5"  r="1.2" fill="currentColor" stroke="none" />
            <circle cx="6" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-body font-semibold border ${p.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
          {p.label}
        </span>
      </div>

      <p className="font-display font-bold text-sm text-ink">{service.name}</p>
      <p className="font-body text-[11px] text-muted font-mono mt-0.5">{service.path}</p>

      <div className="mt-3">
        <div className="rounded-lg p-2 text-center"
          style={{ background: "rgb(var(--surface)/0.6)", border: "1px solid rgb(var(--border)/0.6)" }}>
          <p className="font-display font-bold text-sm text-ink">
            {service.status === "checking" ? "—" : <>{service.latency}<span className="text-[9px] font-body text-muted ml-0.5">ms</span></>}
          </p>
          <p className="font-body text-[9px] text-muted mt-0.5">Latency</p>
        </div>
      </div>
    </article>
  );
}

function AnalyticsCard({ stat, index, lang }: { stat: AnalyticsStat; index: number; lang: string }) {
  const animated = useCountUp(stat.value);

  const colorMap: Record<AnalyticsStat["color"], { text: string; bg: string; border: string; glow: string }> = {
    primary: { text: "text-primary", bg: "bg-primary/8",  border: "border-primary/18", glow: "hover:shadow-primary/12" },
    success: { text: "text-success", bg: "bg-success/8",  border: "border-success/18", glow: "hover:shadow-success/12" },
    warning: { text: "text-warning", bg: "bg-warning/8",  border: "border-warning/18", glow: "hover:shadow-warning/12" },
    accent:  { text: "text-accent",  bg: "bg-accent/8",   border: "border-accent/18",  glow: "hover:shadow-accent/12"  },
  };
  const c = colorMap[stat.color];

  const card = (
    <article
      className={`glass rounded-2xl p-5 group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl ${c.glow} ${stat.href ? "cursor-pointer" : "cursor-default"}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${c.bg} ${c.border} group-hover:scale-110 transition-transform duration-300`}>
          {stat.icon}
        </div>
        <span className={`font-display font-bold text-3xl tabular-nums ${c.text}`}>
          {animated}{stat.suffix}
        </span>
      </div>
      <p className="font-body text-sm font-semibold text-ink leading-tight">
        {lang === "th" ? stat.label_th : stat.label_en}
      </p>
    </article>
  );

  return stat.href ? <Link href={stat.href} className="block">{card}</Link> : card;
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router  = useRouter();
  const { lang } = useI18n();

  const [user,      setUser]      = useState<User | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [services,  setServices]  = useState<ServiceHealth[]>(
    SERVICE_DEFS.map(s => ({ ...s, status: "checking" as const, latency: 0 }))
  );
  const [analytics, setAnalytics] = useState<AnalyticsStat[]>(ANALYTICS_BASE);

  // RBAC guard — redirect non-admins immediately
  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    authApi.me()
      .then(({ data }) => {
        if (data.role !== "admin") { router.replace("/dashboard"); return; }
        setUser(data);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  // Real service health checks
  useEffect(() => {
    let cancelled = false;
    const checkAll = async () => {
      const results = await Promise.all(
        SERVICE_DEFS.map(async (svc) => {
          const t0 = performance.now();
          try {
            await apiClient.get(svc.path, { timeout: 4000 });
            const latency = Math.round(performance.now() - t0);
            return { ...svc, status: "online" as const, latency };
          } catch (err: any) {
            const latency = Math.round(performance.now() - t0);
            const status: ServiceStatus =
              err?.response ? "degraded" : "offline";
            return { ...svc, status, latency };
          }
        })
      );
      if (!cancelled) {
        setServices(results);
        // Update uptime stat based on online services
        const onlineCount = results.filter(s => s.status === "online").length;
        const uptimePct = Math.round((onlineCount / results.length) * 100);
        setAnalytics(prev =>
          prev.map(s => s.key === "uptime" ? { ...s, value: uptimePct } : s)
        );
      }
    };
    checkAll();
    const interval = setInterval(checkAll, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Fetch admin analytics from API
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    (async () => {
      try {
        const { data } = await adminApi.stats();
        setAnalytics(prev => prev.map(s => {
          if (s.key === "scans")   return { ...s, value: data.totalScans   ?? s.value };
          if (s.key === "doctors") return { ...s, value: data.totalDoctors ?? s.value };
          if (s.key === "parents") return { ...s, value: data.totalParents ?? s.value };
          return s;
        }));
      } catch {
        // /admin/stats request failed (network/server error) — leave stats at their default (0)
        // rather than showing fabricated numbers
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-label="Loading" />
      </div>
    );
  }

  const displayName = user?.profile?.fullName ?? user?.email ?? "";

  return (
    <div className="relative overflow-hidden">
      {/* ── Ambient aurora blobs ───────────────────────── */}
      <div className="fixed top-[-10%] right-[-6%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.12] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--aurora-1))" }} />
      <div className="fixed bottom-[-12%] left-[18%] w-[520px] h-[520px] rounded-full blur-[150px] opacity-[0.09] animate-aurora-slow pointer-events-none"
        style={{ background: "rgb(var(--aurora-3))" }} />
      <div className="fixed top-[40%] left-[-8%] w-[400px] h-[400px] rounded-full blur-[130px] opacity-[0.07] pointer-events-none"
        style={{ background: "rgb(var(--aurora-2))" }} />

      <main className="min-h-screen relative z-10">

        {/* ── Top bar ──────────────────────────────────── */}
        <header className="sticky top-0 z-30 flex items-center justify-between pl-16 lg:pl-8 pr-8 py-4 glass border-b border-border/50">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-xl font-bold text-ink">
                {lang === "th" ? "แผงควบคุมผู้ดูแลระบบ" : "Admin Control Panel"}
              </h1>
              {/* Admin role badge */}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-body font-bold tracking-wider"
                style={{ background: "rgb(var(--primary)/0.12)", color: "rgb(var(--primary))", border: "1px solid rgb(var(--primary)/0.22)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                ADMIN
              </span>
            </div>
            <p className="font-body text-xs text-muted mt-0.5">
              {lang === "th" ? `สวัสดี, ${displayName}` : `Welcome back, ${displayName}`}
            </p>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-body font-semibold text-muted hover:text-ink transition-colors px-3 py-2 rounded-xl hover:bg-ink/5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
        </header>

        <div className="p-6 lg:p-8 space-y-10">

          {/* ══════════════════════════════════════════════
              A. SYSTEM HEALTH STATUS
          ══════════════════════════════════════════════ */}
          <section aria-labelledby="health-heading" data-tour="admin-services">
            <SectionHeader
              id="health-heading"
              icon="🖥️"
              title={lang === "th" ? "สถานะระบบ" : "System Health"}
              subtitle={lang === "th" ? "สถานะ microservices แบบ real-time" : "Real-time microservice status"}
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {services.map(svc => <ServiceCard key={svc.name} service={svc} />)}
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              B. PLATFORM ANALYTICS
          ══════════════════════════════════════════════ */}
          <section aria-labelledby="analytics-heading" data-tour="admin-analytics">
            <SectionHeader
              id="analytics-heading"
              icon="📊"
              title={lang === "th" ? "สถิติแพลตฟอร์ม" : "Platform Analytics"}
              subtitle={lang === "th" ? "ภาพรวมการใช้งานระบบ" : "Overall platform usage overview"}
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {analytics.map((stat, i) => (
                <AnalyticsCard key={stat.key} stat={stat} index={i} lang={lang} />
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
