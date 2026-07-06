"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

interface SidebarUser {
  email: string;
  role: string;
  profile?: { fullName?: string; avatarUrl?: string };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang,  toggle: toggleLang,  t } = useI18n();
  const td = t.dash;

  const [user,       setUser]       = useState<SidebarUser | null>(null);
  const [ready,      setReady]      = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  // Sync collapse state from localStorage after hydration
  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebarCollapsed") === "1");
  }, []);

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  };

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    try {
      const cached = JSON.parse(localStorage.getItem("user") || "{}");
      if (cached.role) setUser(cached as SidebarUser);
    } catch {}
    authApi.me()
      .then(({ data }) => { setUser(data); setReady(true); })
      .catch(() => router.replace("/login"));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("dashTourSeen");
    router.push("/login");
  };

  const isDoctor    = user?.role === "doctor";
  const isAdmin     = user?.role === "admin";
  const displayName = user?.profile?.fullName ?? user?.email ?? "";
  const initial     = displayName.charAt(0).toUpperCase() || "?";
  const avatarUrl   = user?.profile?.avatarUrl;

  const isActive = (href: string) =>
    pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");

  const navItems = [
    { href: isAdmin ? "/dashboard/admin" : "/dashboard", label: td.overview, icon: isAdmin ? AdminIcon : HomeIcon },
    ...(!isAdmin ? [{ href: "/dashboard/patients", label: isDoctor ? td.patients : td.children, icon: PatientsIcon }] : []),
    // Growth Report disabled — re-add this line to re-enable:
    // ...(isDoctor  ? [{ href: "/dashboard/growth-report", label: "Growth Report",  icon: GrowthIcon    }] : []),
    ...(!isDoctor && !isAdmin ? [{ href: "/dashboard/recommendations", label: td.recommendations, icon: RecIcon }] : []),
    { href: "/dashboard/settings", label: td.settings, icon: SettingsIcon },
  ];

  // Reusable label-fade class
  const labelCls = `overflow-hidden whitespace-nowrap transition-all duration-300 ${
    collapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100"
  }`;

  return (
    <div className="min-h-screen flex bg-bg">

      {/* ── Mobile: hamburger ──────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl glass-strong border border-border/60 flex items-center justify-center text-ink transition-opacity duration-200 ${
          mobileOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col fixed inset-y-0 left-0 z-40 glass-strong border-r border-border/60 transition-all duration-300 ease-in-out
          w-64 lg:translate-x-0
          ${mobileOpen ? "translate-x-0 z-50" : "-translate-x-full"}
          ${collapsed ? "lg:w-16" : "lg:w-64"}`}
      >

        {/* Desktop collapse toggle — floats on right edge */}
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex absolute -right-3 top-[22px] z-50 w-6 h-6 rounded-full glass-strong border border-border/60 items-center justify-center text-muted hover:text-primary hover:border-primary/40 transition-colors shadow-sm"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* ── Logo ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4 overflow-hidden">
          <Link href="/" data-tour="logo" className="flex items-center gap-2.5 group flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tohtan_bgremover.png"
              alt="โตทัน"
              className="w-9 h-9 object-contain flex-shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-3"
            />
            <div className={`overflow-hidden transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100"}`}>
              <span className="font-display font-bold text-base text-ink tracking-tight whitespace-nowrap">โตทัน</span>
              <span className="block text-[10px] font-body text-muted leading-none whitespace-nowrap">NSC 2026</span>
            </div>
          </Link>
        </div>

        {/* ── User card ────────────────────────────────── */}
        <div className="px-3 pt-3">
          <div data-tour="user-card" className="rounded-2xl glass-tile px-3 py-3 overflow-hidden">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl} alt={displayName}
                  className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                  style={{ boxShadow: "0 2px 8px rgb(0 0 0/0.15)" }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                  title={collapsed ? displayName : undefined}
                  style={{
                    background: isAdmin
                      ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
                      : isDoctor
                        ? "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))"
                        : "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))",
                  }}
                >
                  {initial}
                </div>
              )}
              <div className={`min-w-0 overflow-hidden transition-all duration-300 ${collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"}`}>
                <p className="text-sm font-body font-semibold text-ink truncate whitespace-nowrap">{displayName}</p>
                {user && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-body font-semibold px-1.5 py-0.5 rounded-md mt-0.5 ${
                    isAdmin ? "bg-violet-500/15 text-violet-500" : isDoctor ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                  }`}>
                    <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                    {isAdmin ? (lang === "th" ? "ผู้ดูแลระบบ" : "Admin") : isDoctor ? td.doctor : td.parent}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Nav ──────────────────────────────────────── */}
        <nav data-tour="nav" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-200 ${
                  collapsed ? "justify-center" : ""
                } ${
                  active ? "text-primary" : "text-muted hover:text-ink hover:bg-ink/5"
                }`}
                style={active ? { background: "rgb(var(--primary)/0.1)" } : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
                )}
                <item.icon
                  className="flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ width: 18, height: 18, color: active ? "rgb(var(--primary))" : "rgb(var(--muted))" }}
                />
                <span className={labelCls}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom ───────────────────────────────────── */}
        <div className="px-3 pb-4 space-y-1 border-t border-border/60 pt-3">
          <div className={`flex items-center px-3 py-2 gap-2 ${collapsed ? "justify-center flex-col gap-2.5" : ""}`}>
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="flex items-center gap-1.5 text-xs font-body text-muted hover:text-primary transition-colors"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            {!collapsed && <span className="text-border mx-0.5">·</span>}
            <button
              onClick={toggleLang}
              title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              className={`text-xs font-body font-semibold text-muted hover:text-primary transition-all duration-300 overflow-hidden whitespace-nowrap ${
                collapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[40px] opacity-100"
              }`}
            >
              {lang === "th" ? "EN" : "ไทย"}
            </button>
          </div>
          <button
            onClick={logout}
            title={collapsed ? td.logout : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-colors text-muted hover:text-danger hover:bg-danger/8 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogoutIcon style={{ width: 18, height: 18 }} />
            <span className={labelCls}>{td.logout}</span>
          </button>
        </div>
      </aside>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div className={`flex-1 min-h-screen transition-all duration-300 ease-in-out ml-0 ${
        collapsed ? "lg:ml-16" : "lg:ml-64"
      }`}>
        {children}
      </div>

    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const HomeIcon     = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const AdminIcon    = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
const PatientsIcon = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const AssessIcon   = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4 15.3" /></svg>;
const GrowthIcon   = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>;
const RecIcon      = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>;
const SettingsIcon = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const LogoutIcon   = (p: any) => <svg {...p} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>;
function MoonIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>; }
function SunIcon()  { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>; }
