"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { NavSkeleton, HeroSkeleton, FeaturesSkeleton } from "@/components/Skeleton";
import HeroHand from "@/components/HeroHand";
import AiPipeline from "@/components/AiPipeline";
import { LogoMark } from "@/components/LogoMark";

const AiHandModelHero = dynamic(
  () => import("@/components/three/AiHandModel"),
  { ssr: false }
);

// ── Types ──────────────────────────────────────────────────────────────────────
interface Session { name: string; role: string }

// #who section background — the CTA wave below it must match its bottom edge,
// so both read from this one constant.
const WHO_BG = { dark: "#070d1a", lightTop: "#eaf2fb", lightBottom: "#f1f6fc" };

// ── Hooks ──────────────────────────────────────────────────────────────────────
/** Reveal-on-scroll: add `.reveal` to an element, it animates in when seen. */
function useReveal(ready = true) {
  useEffect(() => {
    if (!ready) return;
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("shown"); obs.unobserve(e.target); }
      }),
      { threshold: 0.14 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ready]);
}

/** Count-up number animation, triggered when element enters view. */
function useCountUp(target: number, duration = 1400, decimals = 0) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    let raf = 0; let started = false;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min((t - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Number((eased * target).toFixed(decimals)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(node);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [target, duration, decimals]);
  return { ref, val };
}

/** Custom smooth scroll with a controllable (slower) duration. */
function smoothScrollTo(targetY: number, duration = 1200) {
  const html = document.documentElement;
  const startY = window.scrollY;
  const dist = targetY - startY;
  const start = performance.now();
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto"; // bypass CSS smooth so easing is ours
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now: number) => {
    const t = Math.min((now - start) / duration, 1);
    window.scrollTo(0, startY + dist * ease(t));
    if (t < 1) requestAnimationFrame(step);
    else html.style.scrollBehavior = prev;
  };
  requestAnimationFrame(step);
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function Home() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useI18n();
  const [scrolled,   setScrolled]   = useState(false);
  const [session,    setSession]    = useState<Session | null>(null);
  const [mounted,    setMounted]    = useState(false);
  const [heroWebgl,  setHeroWebgl]  = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useReveal(mounted);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    let ok = false;
    try {
      const c = document.createElement("canvas");
      ok = !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch { ok = false; }
    // Only spin up the heavy R3F shader hand on large screens; the polished 2D
    // HeroHand fallback keeps mobile from allocating an extra WebGL context.
    // Follow the media query live — browser zoom moves the effective viewport
    // across the lg: breakpoint, and the mounted visual must switch with it.
    const mq = window.matchMedia("(min-width: 1024px)");
    const decide = () => setHeroWebgl(ok && mq.matches);
    decide();
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, [mounted]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Slow, controlled smooth-scroll for in-page anchor links (e.g. nav → #ai).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      const href = a?.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - 64; // clear fixed navbar
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { window.scrollTo(0, y); return; }
      smoothScrollTo(y, 1400);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      const stored = localStorage.getItem("user");
      if (token && stored) {
        const u = JSON.parse(stored);
        setSession({ name: u.email ?? "", role: u.role ?? "" });
      }
    } catch {}
  }, []);

  // Mouse parallax on hero glow layers — coalesced to one style write per
  // frame (high-Hz mice fire mousemove at 125–1000Hz; each write recalcs
  // style for the whole hero subtree).
  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    let raf = 0;
    let ev: MouseEvent | null = null;
    const onMove = (e: MouseEvent) => {
      ev = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!ev) return;
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - 0.5;
        const y = (ev.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--mx", `${x * 26}px`);
        el.style.setProperty("--my", `${y * 26}px`);
      });
    };
    el.addEventListener("mousemove", onMove, { passive: true });
    return () => { el.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  const th = lang === "th";
  const dark = theme === "dark";

  if (!mounted) return (
    <div className="min-h-screen bg-[#04293f] overflow-x-clip">
      <NavSkeleton />
      <HeroSkeleton />
      <FeaturesSkeleton />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg overflow-x-clip">
      {/* Prerender the login page silently — makes "Get Started" feel instant */}
      <script type="speculationrules" dangerouslySetInnerHTML={{
        __html: JSON.stringify({ prerender: [{ urls: ["/login"] }] })
      }} />

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header
        role="banner"
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 md:px-8 h-16 transition-all duration-500 ${
          scrolled ? "glass-strong rounded-b-2xl" : "bg-transparent border-b border-white/10"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="โตทัน หน้าแรก">
          <LogoMark scrolled={scrolled} />
          <span className={`font-display font-bold text-lg tracking-tight transition-colors ${scrolled ? "text-ink" : "text-white"}`}>
            โตทัน
          </span>
          <span className={`hidden sm:inline text-[10px] font-display font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-full transition-all ${
            scrolled ? "bg-primary/12 text-primary" : "bg-white/15 text-white/85"
          }`}>
            NSC 2026
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
          {[
            { label: th ? "เบื้องหลัง AI" : "The AI",      href: "#ai" },
            { label: th ? "วิธีใช้งาน" : "How It Works", href: "#how" },
            { label: th ? "สำหรับใคร"  : "Who It's For",  href: "#who" },
            { label: th ? "เกี่ยวกับ"  : "About",          href: "#about" },
          ].map(n => (
            <a key={n.href} href={n.href}
              className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all ${
                scrolled ? "text-muted hover:text-ink hover:bg-ink/5" : "text-white/75 hover:text-white hover:bg-white/10"
              }`}>
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={toggleLang} aria-label="Toggle language" data-tour="lang-toggle"
            className={`h-8 px-2.5 rounded-lg text-xs font-display font-semibold transition-all ${
              scrolled ? "border border-border text-muted hover:text-ink hover:border-primary/40" : "border border-white/25 text-white/80 hover:text-white hover:border-white/50"
            }`}>
            {th ? "EN" : "ไทย"}
          </button>
          <button onClick={toggleTheme} aria-label="Toggle theme"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              scrolled ? "border border-border text-muted hover:text-ink" : "border border-white/25 text-white/80 hover:text-white"
            }`}>
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <Link href={session ? "/dashboard" : "/login"} data-tour="nav-cta"
            className={`group relative overflow-hidden h-8 px-4 flex items-center gap-1.5 rounded-lg text-sm font-body font-semibold transition-all active:scale-95 text-white shadow-lg shadow-primary/30`}
            style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))" }}>
            <span className="shine relative z-10">{session ? "Dashboard" : (th ? "เริ่มใช้งาน" : "Get Started")}</span>
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section
          ref={heroRef}
          aria-labelledby="hero-heading"
          className="relative min-h-[100svh] flex items-center px-6 overflow-hidden"
          style={{ background: "linear-gradient(150deg, #04293f 0%, #075985 45%, #0EA5E9 100%)" }}
        >
          {/* Left-weighted overlay keeps the copy readable; the hand glows at right. */}
          <div className="absolute inset-0" style={{ zIndex: 1, background: "linear-gradient(100deg, rgba(3,20,34,0.92) 0%, rgba(3,20,34,0.66) 38%, rgba(3,20,34,0.30) 68%, rgba(3,20,34,0.12) 100%)" }} />
          <div className="absolute inset-0" style={{ zIndex: 1, background: "linear-gradient(180deg, rgba(2,16,28,0.40) 0%, transparent 26%, transparent 70%, rgba(2,16,28,0.50) 100%)" }} />
          <AuroraField />
          <Particles />

          <div className="relative z-10 w-full max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] items-center gap-8 lg:gap-6 pt-24 pb-24">
            {/* ── Left: copy ──────────────────────────────────────── */}
            <div className="text-center lg:text-left space-y-7 max-w-xl mx-auto lg:mx-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-body font-semibold text-white animate-fade-up"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(12px)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                {th ? "AI · มาตรฐาน Greulich & Pyle" : "AI-Powered · Greulich & Pyle Standard"}
              </div>

              {/* Heading — short, punchy, 3-second comprehension */}
              <h1 id="hero-heading"
                className="font-display font-bold text-white leading-[1.05] animate-fade-up animate-delay-100"
                style={{ fontSize: "clamp(2.6rem, 5.4vw, 4.8rem)", letterSpacing: "-0.035em" }}>
                {th ? (
                  <>ติดตามการเจริญเติบโต{" "}
                  <span className="text-gradient" style={{ filter: "brightness(1.3)" }}>ด้วยปัญญา AI</span>
                </>
                ) : (
                  <>Growth Intelligence{" "}
                  <span className="text-gradient" style={{ filter: "brightness(1.3)" }}>Powered by AI</span>
                </>
                )}
              </h1>

              <p className="font-body mx-auto lg:mx-0 animate-fade-up animate-delay-200"
                style={{ fontSize: "clamp(1rem, 1.4vw, 1.125rem)", maxWidth: "48ch", lineHeight: 1.72, color: "rgba(255,255,255,0.88)" }}>
                {th
                  ? "แพทย์อัปโหลด X-ray มือซ้าย AI วิเคราะห์ตามมาตรฐาน Greulich & Pyle ส่งผลและคำแนะนำถึงผู้ปกครองภายใน 2 นาที"
                  : "Upload a left-hand X-ray. AI analyzes against the Greulich & Pyle atlas and sends results to parents in under 2 minutes."}
              </p>

              {/* CTA */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 animate-fade-up animate-delay-300">
                <Link href={session ? "/dashboard" : "/login"}
                  className="group relative inline-flex items-center gap-2.5 font-body font-semibold text-white px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.97] overflow-hidden"
                  style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 10px 32px rgba(14,165,233,0.50)", fontSize: "1rem" }}>
                  <span className="shine relative z-10 flex items-center gap-2.5">
                    {session ? (th ? "กลับสู่ Dashboard" : "Back to Dashboard") : (th ? "เริ่มใช้งานฟรี" : "Start for Free")}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
                <a href="#how"
                  className="inline-flex items-center gap-2 font-body font-medium text-sm transition-colors px-4 py-4 rounded-xl hover:text-white hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.80)" }}>
                  {th ? "ดูวิธีการทำงาน" : "See how it works"}
                  <span className="opacity-70 animate-bounce">↓</span>
                </a>
              </div>

            </div>

            {/* ── Right: 3D holographic hand (R3F) with 2D fallback ── */}
            <div className="relative animate-fade-in animate-delay-500 flex items-center justify-center">
              <div className="relative w-full mx-auto" style={{ maxWidth: 460, aspectRatio: "5 / 6" }}>
                {/* Ambient halo beneath the model */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[72%] h-[22%] rounded-[50%] blur-3xl pointer-events-none"
                  style={{ background: "radial-gradient(ellipse, rgba(56,189,248,0.50), transparent 70%)" }} />
                {mounted && heroWebgl ? (
                  <AiHandModelHero step={0} interactive={true} th={th} fov={40} />
                ) : (
                  <HeroHand lang={lang} />
                )}
              </div>
            </div>
          </div>

          {/* Scroll cue — hides once user scrolls */}
          {!scrolled && (
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 transition-opacity duration-500">
              <div className="w-5 h-8 rounded-full border-2 border-white/30 flex justify-center pt-1.5">
                <div className="w-1 h-1.5 rounded-full bg-white/70 animate-bounce" />
              </div>
            </div>
          )}

          {/* Bottom wave */}
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" style={{ height: 70, zIndex: 10 }}>
            <path d="M0 60 C 360 130, 1080 -10, 1440 60 L1440 120 L0 120 Z" fill="rgb(var(--bg))" />
          </svg>
        </section>

        {/* ── AI Pipeline — stepped walkthrough with prev/next controls ────── */}
        <AiPipeline lang={lang} />

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section id="how" aria-labelledby="how-heading" className="relative min-h-[100svh] flex flex-col justify-center py-12 px-6 bg-bg overflow-hidden">
          {/* soft aurora behind */}
          <div className="absolute top-1/3 -left-40 w-[480px] h-[480px] rounded-full blur-[130px] opacity-20 animate-aurora-slow pointer-events-none"
            style={{ background: "rgb(var(--aurora-1))" }} />
          <div className="absolute bottom-0 -right-40 w-[480px] h-[480px] rounded-full blur-[130px] opacity-20 animate-aurora pointer-events-none"
            style={{ background: "rgb(var(--aurora-3))" }} />

          <div className="relative max-w-6xl mx-auto">
            <div className="reveal mb-8 md:mb-12">
              <span className="inline-block text-xs font-display font-bold tracking-[0.2em] uppercase text-primary mb-3">
                {th ? "ขั้นตอน" : "Process"}
              </span>
              <h2 id="how-heading" className="font-display font-bold text-ink"
                style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", letterSpacing: "-0.025em", textWrap: "balance" }}>
                {th ? "3 ขั้นตอน จาก X-ray สู่คำแนะนำ" : "3 Steps, X-ray to Recommendation"}
              </h2>
              <p className="font-body text-muted mt-3" style={{ fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "52ch" }}>
                {th
                  ? "กระบวนการที่ออกแบบให้สั้นที่สุด เพื่อให้แพทย์มีเวลาสำหรับผู้ป่วย ไม่ใช่สำหรับซอฟต์แวร์"
                  : "A process designed to be as short as possible, so doctors spend time with patients, not software."}
              </p>
            </div>

            <div className="relative grid md:grid-cols-3 gap-6 md:gap-7">
              {/* friendly dotted connectors between steps (desktop) */}
              {[0, 1].map((c) => (
                <svg key={c} width="80" height="30" viewBox="0 0 80 30"
                  className="absolute top-[58px] hidden md:block z-20 pointer-events-none"
                  style={{ left: c === 0 ? "33.33%" : "66.66%", transform: "translateX(-50%)", color: c === 0 ? "rgb(var(--accent))" : "rgb(var(--success))" }}>
                  <path d="M3 15 C 26 1, 52 29, 70 15" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeDasharray="1.5 8" opacity="0.55" className="animate-hf-dash" />
                  <path d="M62 9 L72 15 L62 21" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                </svg>
              ))}

              {(th ? [
                { n: "01", title: "อัปโหลด X-ray มือซ้าย",    body: "รองรับ JPEG, PNG และ DICOM ระบุข้อมูลพื้นฐาน อายุ เพศ และน้ำหนักส่วนสูงของเด็ก",           icon: <XrayIcon className="w-8 h-8" /> },
                { n: "02", title: "AI วิเคราะห์อัตโนมัติ",    body: "Deep learning เปรียบเทียบกับ Greulich & Pyle atlas ให้ bone age, confidence score และ risk flag", icon: <ChipIcon className="w-8 h-8" /> },
                { n: "03", title: "ส่ง recommendation",        body: "แพทย์ตรวจสอบผล เขียนคำแนะนำ ระบบสร้าง PDF และแจ้งเตือนผู้ปกครองอัตโนมัติ",                 icon: <ReportIcon className="w-8 h-8" /> },
              ] : [
                { n: "01", title: "Upload the X-ray",          body: "Supports JPEG, PNG, and DICOM. Add basic patient data: age, sex, height, and weight.",            icon: <XrayIcon className="w-8 h-8" /> },
                { n: "02", title: "AI analyzes automatically", body: "Deep learning compares against the Greulich & Pyle atlas. Returns bone age, confidence, risk flag.", icon: <ChipIcon className="w-8 h-8" /> },
                { n: "03", title: "Send the recommendation",   body: "Doctor reviews the result, writes a note. System generates a PDF and notifies the parent.",        icon: <ReportIcon className="w-8 h-8" /> },
              ]).map((step, i) => {
                const theme = [
                  { tint: "14 165 233", grad: "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-2)))", ring: "rgb(var(--primary))" },
                  { tint: "234 108 73", grad: "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))",    ring: "rgb(var(--accent))" },
                  { tint: "16 185 129", grad: "linear-gradient(135deg,rgb(var(--success)),rgb(var(--aurora-2)))",  ring: "rgb(var(--success))" },
                ][i];
                return (
                <div key={step.n}
                  className="reveal group relative rounded-3xl p-6 md:p-7 flex flex-col gap-4 md:gap-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
                  style={{
                    background: `linear-gradient(165deg, rgb(${theme.tint} / 0.08) 0%, rgb(var(--surface) / 0.7) 58%)`,
                    border: `1px solid rgb(${theme.tint} / 0.24)`,
                    boxShadow: `0 1px 0 rgb(255 255 255 / 0.04) inset`,
                    transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
                    transitionDelay: `${i * 90}ms`,
                  }}>
                  {/* soft corner glow */}
                  <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `rgb(${theme.tint})` }} />

                  {/* friendly step badge */}
                  <span className="absolute top-6 right-6 w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm tabular-nums select-none"
                    style={{ color: theme.ring, background: `rgb(${theme.tint} / 0.14)`, border: `1.5px solid rgb(${theme.tint} / 0.40)` }}>
                    {step.n}
                  </span>

                  {/* animated roadmap scene */}
                  <StepScene i={i} th={th} tint={theme.tint} />

                  <div className="relative flex items-center gap-4">
                    {/* step icon disc */}
                    <div className="relative shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                      style={{ background: theme.grad, boxShadow: `0 8px 18px rgb(${theme.tint} / 0.32)` }}>
                      {step.icon}
                    </div>
                    <h3 className="font-display font-semibold text-ink" style={{ fontSize: "1.2rem", letterSpacing: "-0.01em" }}>
                      {step.title}
                    </h3>
                  </div>

                  <div className="relative">
                    <p className="font-body text-muted" style={{ fontSize: "0.9375rem", lineHeight: 1.7 }}>
                      {step.body}
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Proof strip (marquee) ───────────────────────────────────────── */}
        <section aria-label="Key metrics" className="bg-bg border-b border-border overflow-hidden">
          <div className="max-w-5xl mx-auto px-6 py-9 grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatBlock value={10} prefix="<" suffix="s" label={th ? "เวลาวิเคราะห์" : "Analysis time"} />
            <StatBlock value={6.11} decimals={2} label={th ? "Val MAE (เดือน)" : "Val MAE (months)"} />
            <StatBlock value={4.36} decimals={2} label={th ? "Test MAE (เดือน)" : "Test MAE (months)"} />
            <StaticStat value="Low Bias" label={th ? "ความเอนเอียงของโมเดลต่ำ" : "Minimal model bias"} />
          </div>
        </section>

        {/* ── Who it's for ────────────────────────────────────────────────── */}
        <section id="who" aria-labelledby="who-heading" className="relative min-h-[100svh] flex flex-col justify-center py-12 px-6 overflow-hidden"
          style={{ background: dark ? WHO_BG.dark : `linear-gradient(180deg,${WHO_BG.lightTop} 0%,${WHO_BG.lightBottom} 100%)` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: dark ? 0.06 : 0.08,
            backgroundImage: `radial-gradient(circle, ${dark ? "#38BDF8" : "#0EA5E9"} 1px, transparent 1px)`, backgroundSize: "30px 30px" }} />
          <div className="absolute top-0 left-1/4 w-[520px] h-[520px] rounded-full blur-[140px] animate-aurora pointer-events-none"
            style={{ background: "#0EA5E9", opacity: dark ? 0.25 : 0.16 }} />
          <div className="absolute bottom-0 right-1/4 w-[460px] h-[460px] rounded-full blur-[140px] animate-aurora-slow pointer-events-none"
            style={{ background: "#EA6C49", opacity: dark ? 0.2 : 0.14 }} />

          <div className="relative max-w-6xl mx-auto">
            <h2 id="who-heading" className="reveal font-display font-bold text-ink mb-3"
              style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", letterSpacing: "-0.025em", textWrap: "balance" }}>
              {th ? "สองมุมมอง ระบบเดียว" : "Two Perspectives, One System"}
            </h2>
            <p className="reveal font-body text-muted mb-7 max-w-2xl" style={{ fontSize: "1.0625rem", lineHeight: 1.6 }}>
              {th
                ? "แพทย์วิเคราะห์ X-ray ด้วย AI ในไม่กี่วินาที แล้วส่งผลตรงถึงมือถือผู้ปกครอง — เข้าใจง่าย ไร้ศัพท์แพทย์"
                : "Doctors analyze X-rays with AI in seconds, then send results straight to parents' phones — clear and jargon-free."}
            </p>

            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-5 items-stretch">
              {/* Doctor */}
              <div className="reveal group rounded-2xl p-5 md:p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative"
                style={{ background: "rgba(14,165,233,0.10)", border: "1px solid rgba(56,189,248,0.22)", backdropFilter: "blur(14px)" }}>
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 transition-opacity group-hover:opacity-50"
                  style={{ background: "#38BDF8" }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.22)" }}>
                    <DoctorIcon className="w-6 h-6 text-[#0284C7] dark:text-[#7dd3fc]" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-ink text-base">{th ? "แพทย์เด็ก" : "Pediatrician"}</p>
                    <p className="font-body text-xs" style={{ color: dark ? "rgba(125,211,252,0.75)" : "#0369A1" }}>{th ? "บทบาทหลัก · ผู้วิเคราะห์" : "Primary user · Analyst"}</p>
                  </div>
                </div>
                {/* live product shot — what the doctor really sees */}
                <div className="relative transition-transform duration-300 group-hover:-translate-y-0.5">
                  <DoctorPreview th={th} />
                </div>
                <ul className="relative space-y-1.5">
                  {[
                    { icon: <UploadIcon className="w-[18px] h-[18px] text-[#0284C7] dark:text-[#7dd3fc]" />, th: "อัปโหลด X-ray และดูผล AI ในหน้าเดียวกัน", en: "Upload X-ray and view AI result on one screen" },
                    { icon: <UsersIcon className="w-[18px] h-[18px] text-[#0284C7] dark:text-[#7dd3fc]" />, th: "จัดการรายชื่อผู้ป่วยและประวัติการประเมิน", en: "Manage patient list and assessment history" },
                    { icon: <MessageIcon className="w-[18px] h-[18px] text-[#0284C7] dark:text-[#7dd3fc]" />, th: "เขียน recommendation ส่งตรงถึงผู้ปกครอง", en: "Write recommendations sent directly to parents" },
                    { icon: <ReportIcon className="w-[18px] h-[18px] text-[#0284C7] dark:text-[#7dd3fc]" />, th: "Export PDF รายงานสำหรับแฟ้มผู้ป่วย", en: "Export PDF reports for patient records" },
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      style={{ background: "rgba(56,189,248,0.09)", border: "1px solid rgba(56,189,248,0.18)" }}>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(56,189,248,0.18)" }}>{f.icon}</span>
                      <span className="font-body text-ink/85 leading-snug" style={{ fontSize: "0.875rem" }}>{th ? f.th : f.en}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Center: one shared system */}
              <div className="reveal flex md:flex-col items-center justify-center gap-3 py-1 md:py-0">
                <div className="hidden md:block w-px flex-1" style={{ background: "linear-gradient(to bottom, transparent, rgba(56,189,248,0.5))" }} />
                <div className="relative flex flex-col items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute inset-0 rounded-2xl animate-ping opacity-40"
                      style={{ background: "radial-gradient(circle, rgba(56,189,248,0.5), transparent 70%)" }} />
                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ background: dark ? "linear-gradient(135deg, rgba(56,189,248,0.28), rgba(251,146,60,0.28))" : "linear-gradient(135deg, rgba(2,132,199,0.16), rgba(194,65,12,0.16))", border: `1px solid ${dark ? "rgba(255,255,255,0.22)" : "rgba(2,132,199,0.30)"}`, backdropFilter: "blur(10px)" }}>
                      <CoreIcon className="w-8 h-8 text-ink" />
                    </div>
                  </div>
                  <p className="font-display text-[0.7rem] font-semibold text-ink/70 whitespace-nowrap tracking-wide">{th ? "ระบบเดียว" : "One System"}</p>
                </div>
                <div className="hidden md:block w-px flex-1" style={{ background: "linear-gradient(to top, transparent, rgba(251,146,60,0.5))" }} />
              </div>

              {/* Parent */}
              <div className="reveal group rounded-2xl p-5 md:p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative"
                style={{ background: "rgba(234,108,73,0.10)", border: "1px solid rgba(251,146,60,0.22)", backdropFilter: "blur(14px)", transitionDelay: "90ms" }}>
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 transition-opacity group-hover:opacity-50"
                  style={{ background: "#FB923C" }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(251,146,60,0.22)" }}>
                    <ParentIcon className="w-6 h-6" style={{ color: dark ? "#FDBA74" : "#C2410C" }} />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-ink text-base">{th ? "ผู้ปกครอง" : "Parent"}</p>
                    <p className="font-body text-xs" style={{ color: dark ? "rgba(253,186,116,0.75)" : "#C2410C" }}>{th ? "ผู้รับผลการประเมิน" : "Result recipient"}</p>
                  </div>
                </div>
                {/* live product shot — what the parent receives on their phone */}
                <div className="relative flex justify-center transition-transform duration-300 group-hover:-translate-y-0.5">
                  <div className="animate-float-soft"><ParentPreview th={th} /></div>
                </div>
                <ul className="relative space-y-1.5">
                  {[
                    { icon: <BellIcon className="w-[18px] h-[18px]" style={{ color: dark ? "#FDBA74" : "#C2410C" }} />, th: "รับแจ้งเตือนทันทีเมื่อมีผลการประเมินใหม่", en: "Receive instant notifications when a new result is ready" },
                    { icon: <TrendIcon className="w-[18px] h-[18px]" style={{ color: dark ? "#FDBA74" : "#C2410C" }} />, th: "ดูผลการเจริญเติบโตของบุตรหลานในรูปแบบที่เข้าใจง่าย", en: "View your child's growth in an easy-to-understand format" },
                    { icon: <BookIcon className="w-[18px] h-[18px]" style={{ color: dark ? "#FDBA74" : "#C2410C" }} />, th: "อ่าน recommendation จากแพทย์ได้ทุกที่", en: "Read doctor recommendations from anywhere" },
                    { icon: <SparkleIcon className="w-[18px] h-[18px]" style={{ color: dark ? "#FDBA74" : "#C2410C" }} />, th: "ไม่ต้องสับสนกับคำศัพท์ทางการแพทย์", en: "No confusing medical jargon" },
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      style={{ background: "rgba(251,146,60,0.10)", border: "1px solid rgba(251,146,60,0.20)" }}>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(251,146,60,0.18)" }}>{f.icon}</span>
                      <span className="font-body text-ink/85 leading-snug" style={{ fontSize: "0.875rem" }}>{th ? f.th : f.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA close ───────────────────────────────────────────────────── */}
        <section id="about" aria-labelledby="cta-heading" className="relative min-h-[100svh] flex items-center justify-center py-20 px-6 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0284C7 0%, #0EA5E9 55%, #38BDF8 100%)" }}>
          {/* wave transition from the #who section above — fill tied to WHO_BG */}
          <svg className="absolute top-0 left-0 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: 70, zIndex: 4 }}>
            <path d="M0 0 L1440 0 L1440 56 C1080 128, 360 -8, 0 56 Z" fill={dark ? WHO_BG.dark : WHO_BG.lightBottom} />
          </svg>
          {/* spotlight + vignette for depth */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 75% at 50% 4%, rgba(255,255,255,0.20), transparent 58%)", zIndex: 1 }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(90% 60% at 50% 120%, rgba(3,18,32,0.55), transparent 60%)", zIndex: 1 }} />
          {/* faint X-ray hand watermark */}
          <img src="/Hand-nobg.png" alt="" aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none animate-float-soft"
            style={{ width: "min(56vw, 440px)", opacity: 0.06, filter: "brightness(0) invert(1) blur(1px)", zIndex: 1 }} />
          <AuroraField subtle />
          <Particles />

          <div className="relative z-10 max-w-xl mx-auto text-center flex flex-col items-center gap-5">
            {/* eyebrow */}
            <div className="reveal inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-body font-semibold text-white/95"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(10px)" }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              {th ? "เปิดให้ใช้งานแล้ว · ฟรีสำหรับแพทย์" : "Now open · Free for doctors"}
            </div>

            <h2 id="cta-heading" className="reveal font-display font-bold text-white"
              style={{ fontSize: "clamp(2.1rem, 5.4vw, 3.9rem)", letterSpacing: "-0.03em", textWrap: "balance", lineHeight: 1.08, textShadow: "0 2px 30px rgba(2,16,28,0.25)" }}>
              {th ? (<>พร้อมเริ่ม<span style={{ background: "linear-gradient(110deg,#FFFFFF,#FDE68A 55%,#FDBA74)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>ประเมินอายุกระดูก</span>?</>)
                  : (<>Ready to start <span style={{ background: "linear-gradient(110deg,#FFFFFF,#FDE68A 55%,#FDBA74)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>assessing bone age</span>?</>)}
            </h2>

            <p className="reveal font-body text-white/80 mx-auto" style={{ fontSize: "1.0625rem", lineHeight: 1.65, maxWidth: "40ch" }}>
              {th
                ? "ระบบใช้งานฟรีสำหรับแพทย์ ลงทะเบียนได้ทันทีโดยไม่ต้องรอการอนุมัติ"
                : "Free for doctors. Sign up immediately with no approval wait."}
            </p>

            <div className="reveal flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              <Link href={session ? "/dashboard" : "/login"}
                className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2.5 font-body font-bold text-primary-dark bg-white px-9 py-4 sm:py-5 rounded-2xl transition-all hover:-translate-y-0.5 active:scale-[0.97] text-lg overflow-hidden"
                style={{ boxShadow: "0 14px 44px rgba(0,0,0,0.28), 0 0 0 6px rgba(255,255,255,0.10)" }}>
                <span className="shine relative z-10 flex items-center gap-2.5">
                  {session ? (th ? "กลับสู่ Dashboard" : "Back to Dashboard") : (th ? "สมัครใช้งานฟรี" : "Sign Up Free")}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <a href="#how"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 font-body font-semibold text-white px-7 py-4 sm:py-5 rounded-2xl text-base transition-all hover:-translate-y-0.5 active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.30)", backdropFilter: "blur(8px)" }}>
                {th ? "ดูวิธีการทำงาน" : "See how it works"}
              </a>
            </div>

            {/* trust badges */}
            <div className="reveal flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-1">
              {(th
                ? ["ไม่ต้องใช้บัตรเครดิต", "ลงทะเบียนใน 1 นาที", "ข้อมูลเข้ารหัสปลอดภัย"]
                : ["No credit card", "1-minute signup", "Encrypted & secure"]
              ).map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 font-body text-sm text-white/75">
                  <CheckIcon className="w-4 h-4 text-emerald-300" />{t}
                </span>
              ))}
            </div>

            {session && (
              <p className="font-body text-sm text-white/60">
                {th ? `เข้าสู่ระบบเป็น ${session.name}` : `Signed in as ${session.name}`}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Aurora field (animated mesh blobs) ──────────────────────────────────────────
function AuroraField({ subtle = false }: { subtle?: boolean }) {
  const o = subtle ? 0.15 : 0.25;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ transform: "translate3d(var(--mx,0),var(--my,0),0)", transition: "transform 0.3s ease-out", zIndex: 2 }}>
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      {/* Blobs — transform-only drift (animate-aurora). The border-radius morph
          (animate-blob) is intentionally omitted: under a 90–110px blur it is
          invisible, yet it forces a full-layer repaint every frame and drops the
          whole element off the GPU compositor fast-path. */}
      <div className="absolute top-[8%] left-[12%] w-[42vw] h-[42vw] max-w-[560px] max-h-[560px] blur-[90px] animate-aurora"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.9), transparent 65%)", opacity: o, willChange: "transform" }} />
      <div className="absolute top-[20%] right-[6%] w-[40vw] h-[40vw] max-w-[520px] max-h-[520px] blur-[100px] animate-aurora-slow"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.85), transparent 65%)", opacity: o, animationDelay: "-6s", willChange: "transform" }} />
      <div className="absolute bottom-[2%] left-[28%] w-[38vw] h-[38vw] max-w-[480px] max-h-[480px] blur-[110px] animate-aurora"
        style={{ background: "radial-gradient(circle, rgba(234,108,73,0.8), transparent 65%)", opacity: o * 0.9, animationDelay: "-12s", willChange: "transform" }} />
    </div>
  );
}

// ── Floating particles ──────────────────────────────────────────────────────────
function Particles() {
  const dots = [
    { l: "12%", t: "22%", s: 4, d: "0s" }, { l: "82%", t: "30%", s: 3, d: "0.6s" },
    { l: "26%", t: "68%", s: 5, d: "1.2s" }, { l: "70%", t: "72%", s: 3, d: "1.8s" },
    { l: "48%", t: "16%", s: 3, d: "0.9s" }, { l: "90%", t: "58%", s: 4, d: "1.5s" },
    { l: "6%", t: "52%", s: 3, d: "2.1s" }, { l: "58%", t: "84%", s: 4, d: "0.3s" },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
      {dots.map((d, i) => (
        <span key={i} className="absolute rounded-full bg-white animate-twinkle"
          style={{ left: d.l, top: d.t, width: d.s, height: d.s, animationDelay: d.d }} />
      ))}
    </div>
  );
}

// ── Stat blocks ─────────────────────────────────────────────────────────────────
function StatBlock({ value, prefix = "", suffix = "", label, decimals = 0 }: { value: number; prefix?: string; suffix?: string; label: string; decimals?: number }) {
  const { ref, val } = useCountUp(value, 1400, decimals);
  return (
    <div className="text-center sm:text-left">
      <div className="font-display font-bold text-ink tabular-nums" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>
        {prefix}<span ref={ref}>{val}</span>{suffix}
      </div>
      <div className="font-body text-sm text-muted mt-0.5">{label}</div>
    </div>
  );
}
function StaticStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="font-display font-bold text-gradient" style={{ fontSize: "2rem", letterSpacing: "-0.02em" }}>{value}</div>
      <div className="font-body text-sm text-muted mt-0.5">{label}</div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4-4 4M3 12h18" />
    </svg>
  );
}
/**
 * A real hand-shaped Grad-CAM heatmap: faint X-ray bones underneath, with the
 * heat gradient clipped to the hand silhouette (via PNG alpha mask) and hot
 * spots at the wrist / growth-plate joints — like the actual model output,
 * not a generic blob.
 */
function HandHeatmap({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const mask: React.CSSProperties = {
    WebkitMaskImage: "url(/Hand-nobg.png)", maskImage: "url(/Hand-nobg.png)",
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    WebkitMaskSize: "contain", maskSize: "contain",
    WebkitMaskPosition: "center", maskPosition: "center",
  };
  return (
    <div className={`relative ${className}`} style={style} aria-hidden>
      {/* faint bones underneath */}
      <img src="/Hand-nobg.png" alt="" className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: "grayscale(1) brightness(1.5) contrast(1.1)", opacity: 0.45 }} />
      {/* Grad-CAM heat, clipped to the hand shape */}
      <div className="absolute inset-0 animate-glow" style={{
        ...mask,
        mixBlendMode: "screen",
        background: `
          radial-gradient(circle at 47% 66%, rgba(255,42,28,0.96), rgba(255,42,28,0) 23%),
          radial-gradient(circle at 56% 45%, rgba(255,156,28,0.9), rgba(255,156,28,0) 19%),
          radial-gradient(circle at 41% 33%, rgba(255,232,66,0.72), rgba(255,232,66,0) 17%),
          radial-gradient(circle at 60% 60%, rgba(80,220,255,0.5), rgba(80,220,255,0) 30%),
          linear-gradient(180deg, rgba(30,90,255,0.42), rgba(20,190,150,0.4))
        `,
      }} />
    </div>
  );
}

/**
 * Animated mini-mockup of the actual app panel for each how-it-works step —
 * mirrors the real UI (New Assessment slide-over, Assessment Detail, Notify
 * Parent) so the roadmap shows users the screens they will really see.
 */
function StepScene({ i, th, tint }: { i: number; th: boolean; tint: string }) {
  const win = "relative h-56 rounded-2xl overflow-hidden flex flex-col";
  const winStyle: React.CSSProperties = {
    background: "rgb(var(--surface))",
    border: `1px solid rgb(${tint} / 0.28)`,
    boxShadow: `0 18px 40px rgb(${tint} / 0.14), 0 1px 0 rgb(255 255 255 / 0.05) inset`,
  };
  // Drawer header matching the real slide-over panels: close-X, title, subtitle.
  const TitleBar = ({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) => (
    <div className="flex items-center gap-2 px-2.5 py-2 border-b shrink-0" style={{ borderColor: "rgb(var(--border) / 0.6)" }}>
      <span className="w-5 h-5 rounded-lg grid place-items-center border shrink-0" style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </span>
      <div className="min-w-0">
        <p className="font-display font-bold text-ink leading-none truncate" style={{ fontSize: 10.5 }}>{title}</p>
        {sub && <p className="font-body text-muted leading-none truncate mt-0.5" style={{ fontSize: 7.5 }}>{sub}</p>}
      </div>
      {right && <span className="ml-auto shrink-0">{right}</span>}
    </div>
  );
  const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <p className="font-body font-semibold uppercase text-muted mb-1" style={{ fontSize: 7, letterSpacing: "0.06em" }}>
      {children}{req && <span style={{ color: "rgb(var(--danger))" }}> *</span>}
    </p>
  );
  const Field = ({ value }: { value: string }) => (
    <div className="rounded-md border flex items-center px-2" style={{ height: 18, borderColor: "rgb(var(--border))", background: "rgb(var(--bg))" }}>
      <span className="font-body text-ink/70" style={{ fontSize: 8 }}>{value}</span>
    </div>
  );

  // ── 1) New Assessment panel — upload the X-ray ─────────────────────────
  if (i === 0) {
    return (
      <div className={win} style={winStyle} aria-hidden>
        <TitleBar title={th ? "สร้างการประเมินใหม่" : "New Assessment"} sub={th ? "ด.ช. สมชาย ใจดี" : "Somchai J."} />
        <div className="flex-1 p-2.5 flex flex-col gap-1.5 min-h-0">
          <div><Label req>{th ? "ภาพ X-ray มือซ้าย" : "Left Hand X-ray"}</Label>
            {/* X-ray dropzone (filled preview) */}
            <div className="rounded-lg border-2 border-dashed grid place-items-center overflow-hidden relative"
              style={{ borderColor: `rgb(${tint} / 0.45)`, background: "rgb(0 0 0 / 0.8)", height: 78 }}>
              <img src="/Hand-nobg.png" alt="" className="h-[60px] animate-hf-drop" style={{ filter: "brightness(1.18) contrast(1.05)" }} />
              <span className="absolute bottom-1 font-body text-white/45" style={{ fontSize: 7.5 }}>JPEG · PNG · DICOM</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{th ? "ส่วนสูง (ซม.)" : "Height (cm)"}</Label><Field value="120.0" /></div>
            <div><Label>{th ? "น้ำหนัก (กก.)" : "Weight (kg)"}</Label><Field value="25.0" /></div>
          </div>
          {/* Submit button with light sweep */}
          <div className="relative mt-auto h-7 rounded-lg grid place-items-center overflow-hidden text-white font-body font-semibold shrink-0"
            style={{ fontSize: 9.5, background: "linear-gradient(120deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))", boxShadow: `0 5px 14px rgb(${tint} / 0.4)` }}>
            {th ? "ส่งประเมิน AI →" : "Submit for AI Analysis →"}
            <span className="absolute top-0 bottom-0 w-8 -skew-x-12"
              style={{ background: "linear-gradient(90deg, transparent, rgb(255 255 255 / 0.5), transparent)", animation: "shine-sweep 3.2s ease-in-out infinite" }} />
          </div>
        </div>
      </div>
    );
  }

  // ── 2) Assessment Detail panel — AI analysis result ────────────────────
  if (i === 1) {
    const metrics = th
      ? [{ k: "อายุกระดูก", v: "8 ปี 4 ด.", hl: true }, { k: "ความมั่นใจ AI", v: "96%" }, { k: "ส่วนสูงคาด (FAH)", v: "172 cm", hl: true }]
      : [{ k: "Bone Age", v: "8y 4m", hl: true }, { k: "AI Confidence", v: "96%" }, { k: "Final Adult Ht.", v: "172 cm", hl: true }];
    return (
      <div className={win} style={winStyle} aria-hidden>
        <TitleBar title={th ? "รายละเอียดการประเมิน" : "Assessment Detail"} sub={th ? "16 มิ.ย. 2026" : "Jun 16, 2026"}
          right={<span className="font-body font-semibold px-1.5 py-0.5 rounded-full" style={{ fontSize: 8, background: "rgb(var(--success)/0.14)", color: "rgb(var(--success))" }}>{th ? "ปกติ" : "Normal"}</span>} />
        <div className="flex-1 p-2.5 flex flex-col gap-1.5 min-h-0">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{th ? "ภาพ X-ray" : "X-ray Image"}</Label>
              <div className="rounded-lg overflow-hidden grid place-items-center relative" style={{ background: "rgb(0 0 0 / 0.85)", border: "1px solid rgb(var(--border)/0.4)", height: 58 }}>
                <img src="/Hand-nobg.png" alt="" className="h-12" style={{ filter: "brightness(1.18)" }} />
                <span className="absolute inset-0 animate-hf-scan pointer-events-none">
                  <span className="absolute left-2 right-2 top-0 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, rgb(${tint}), transparent)`, boxShadow: `0 0 10px rgb(${tint})` }} />
                </span>
              </div>
            </div>
            <div><Label>Heatmap (Grad-CAM)</Label>
              <div className="rounded-lg overflow-hidden relative" style={{ background: "rgb(0 0 0 / 0.92)", border: "1px solid rgb(var(--border)/0.4)", height: 58 }}>
                <HandHeatmap className="w-full h-full" />
              </div>
            </div>
          </div>
          {/* metrics table with header — matches the real "Detailed Metrics" card */}
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgb(var(--border)/0.4)" }}>
            <div className="px-2.5 py-1 border-b" style={{ background: "rgb(var(--bg))", borderColor: "rgb(var(--border)/0.4)" }}>
              <p className="font-display font-bold text-ink" style={{ fontSize: 8 }}>{th ? "ข้อมูลเชิงลึก" : "Detailed Metrics"}</p>
            </div>
            {metrics.map((m, k) => (
              <div key={m.k} className="flex items-center justify-between px-2.5 py-[4px]"
                style={{ borderTop: k ? "1px solid rgb(var(--border)/0.3)" : undefined }}>
                <span className="font-body text-muted" style={{ fontSize: 8.5 }}>{m.k}</span>
                <span className="font-body font-semibold tabular-nums" style={{ fontSize: 9, color: m.hl ? "rgb(var(--primary))" : "rgb(var(--ink))" }}>{m.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 3) Notify Parent — recommendation + PDF report ─────────────────────
  return (
    <div className={win} style={winStyle} aria-hidden>
      <TitleBar title={th ? "ส่งผลให้ผู้ปกครอง" : "Notify Parent"} sub={th ? "อีเมลถึงผู้ปกครอง" : "Email to parent"}
        right={<span className="font-mono font-bold px-1.5 py-0.5 rounded-md" style={{ fontSize: 8, background: `rgb(${tint})`, color: "#fff" }}>PDF</span>} />
      <div className="flex-1 p-2.5 flex flex-col gap-1.5 min-h-0 relative">
        <div className="grid grid-cols-2 gap-2">
          <div><Label req>{th ? "วันนัดติดตาม" : "Follow-up date"}</Label><Field value={th ? "12 ส.ค. 2026" : "Aug 12, 2026"} /></div>
          <div><Label>{th ? "เวลา" : "Time"}</Label><Field value="10:30" /></div>
        </div>
        <div className="flex flex-col min-h-0">
          <Label>{th ? "ข้อความถึงผู้ปกครอง" : "Message to parent"}</Label>
          {/* message textarea with lines drawing in */}
          <div className="rounded-md border p-2 flex flex-col gap-1.5" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--bg))", height: 46 }}>
            {[92, 80, 60].map((w, k) => (
              <span key={k} className="h-1 rounded-full animate-hf-draw" style={{ width: `${w}%`, background: "rgb(var(--muted)/0.35)", animationDelay: `${k * 0.2}s` }} />
            ))}
          </div>
        </div>
        {/* "Sent to parent" success state pops over (matches real green confirmation) */}
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg animate-hf-pop"
          style={{ background: "rgb(var(--success)/0.12)", border: "1px solid rgb(var(--success)/0.4)", transformOrigin: "center" }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="rgb(var(--success))" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          <span className="font-body font-semibold" style={{ fontSize: 9.5, color: "rgb(var(--success))" }}>{th ? "ส่งผลให้ผู้ปกครองแล้ว" : "Sent to parent"}</span>
        </div>
      </div>
    </div>
  );
}
/** Mini dashboard preview — what the doctor sees (commercial product shot). */
function DoctorPreview({ th }: { th: boolean }) {
  const heat = "radial-gradient(circle at 50% 40%, rgba(255,80,40,0.92), transparent 38%), radial-gradient(circle at 46% 64%, rgba(255,184,60,0.7), transparent 42%)";
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(56,189,248,0.25)", background: "rgba(3,12,24,0.78)", boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(56,189,248,0.16)" }}>
        <span className="flex gap-1">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: 7, height: 7, borderRadius: "50%", background: c, opacity: 0.85 }} />)}
        </span>
        <span className="font-display text-[10px] text-white/70 ml-1">Totan · {th ? "การประเมิน" : "Assessment"}</span>
        <span className="ml-auto text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.16)", color: "#6ee7b7" }}>{th ? "ปกติ" : "Normal"}</span>
      </div>
      <div className="p-2.5 flex gap-2">
        <div className="rounded-lg overflow-hidden relative grid place-items-center shrink-0" style={{ width: 52, height: 52, background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}>
          <img src="/Hand-nobg.png" alt="" style={{ height: 44, filter: "brightness(1.2)" }} />
          {/* AI scan sweep */}
          <span className="absolute inset-0 animate-hf-scan pointer-events-none">
            <span className="absolute left-1.5 right-1.5 top-0 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, transparent, #38BDF8, transparent)", boxShadow: "0 0 8px #38BDF8" }} />
          </span>
        </div>
        <div className="rounded-lg overflow-hidden relative grid place-items-center shrink-0" style={{ width: 52, height: 52, background: "#000", border: "1px solid rgba(255,255,255,0.08)" }}>
          <img src="/Hand-nobg.png" alt="" style={{ height: 44, filter: "brightness(1.2)" }} />
          <div className="absolute inset-0 animate-glow" style={{ mixBlendMode: "screen", opacity: 0.82, background: heat }} />
        </div>
        <div className="flex-1 flex flex-col justify-center gap-1">
          {[{ k: th ? "อายุกระดูก" : "Bone age", v: "8y4m", c: "#7dd3fc" }, { k: "FAH", v: "172cm", c: "#7dd3fc" }, { k: th ? "มั่นใจ" : "Conf", v: "96%", c: "#fff" }].map((m) => (
            <div key={m.k} className="flex items-center justify-between">
              <span className="font-body text-[9px] text-white/50">{m.k}</span>
              <span className="font-display font-bold text-[10px] tabular-nums" style={{ color: m.c }}>{m.v}</span>
            </div>
          ))}
          {/* confidence bar fills in */}
          <div className="h-1 rounded-full overflow-hidden mt-0.5" style={{ background: "rgba(255,255,255,0.1)" }}>
            <span className="block h-full rounded-full animate-hf-draw" style={{ width: "96%", background: "linear-gradient(90deg,#34D399,#7dd3fc)", transformOrigin: "left" }} />
          </div>
        </div>
      </div>
      <div className="px-2.5 pb-2.5">
        <div className="relative h-6 rounded-lg grid place-items-center text-white font-body font-semibold text-[9px] overflow-hidden" style={{ background: "linear-gradient(120deg,#0EA5E9,#38BDF8)" }}>
          {th ? "ส่งผลให้ผู้ปกครอง →" : "Send to parent →"}
          <span className="absolute top-0 bottom-0 w-8 -skew-x-12" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)", animation: "shine-sweep 3.2s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

/** Mini phone preview — what the parent receives (commercial product shot). */
function ParentPreview({ th }: { th: boolean }) {
  // FAH (predicted adult height) rising vs TH (target height) flat — mirrors the real chart
  const fah: [number, number][] = [[6, 25], [29, 20.5], [52, 16], [75, 11], [94, 7.5]];
  const thY = 13; // target-height dashed line
  const fahLine = fah.map((p) => p.join(",")).join(" ");
  return (
    <div className="mx-auto rounded-[1.5rem] p-2" style={{ width: 158, background: "rgba(3,12,24,0.85)", border: "1px solid rgba(251,146,60,0.3)", boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
      <div className="mx-auto mb-2 rounded-full" style={{ width: 38, height: 4, background: "rgba(255,255,255,0.18)" }} />
      <div className="rounded-2xl p-2.5 space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 animate-hf-drop" style={{ background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.3)" }}>
          <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0 animate-bob" fill="#FDBA74"><path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22zm6-6V11a6 6 0 10-12 0v5l-1.5 1.5V18h15v-.5L18 16z" /></svg>
          <span className="font-body text-[9px] text-white/85 leading-tight">{th ? "ผลการประเมินพร้อมแล้ว" : "Your result is ready"}</span>
          <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#FB923C", boxShadow: "0 0 0 0 rgba(251,146,60,0.6)", animation: "pulse-ring 1.8s ease-out infinite" }} />
        </div>
        <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.28)" }}>
          <div className="text-xl leading-none animate-float-soft">😊</div>
          <p className="font-display font-bold text-white text-[12px] mt-1">{th ? "การเติบโตปกติ" : "Growth on track"}</p>
          <p className="font-body text-[9px] text-white/60 mt-0.5">{th ? "ส่วนสูงคาดการณ์ 172 ซม." : "Predicted height 172 cm"}</p>
        </div>
        <div className="rounded-lg p-2 overflow-hidden" style={{ background: "rgba(56,189,248,0.08)" }}>
          {/* legend */}
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <span className="flex items-center gap-1"><span className="w-3 h-[2px] rounded-full" style={{ background: "#7dd3fc" }} /><span className="font-body font-semibold text-[7px]" style={{ color: "#7dd3fc" }}>FAH</span></span>
            <span className="flex items-center gap-1"><svg width="12" height="3"><line x1="0" y1="1.5" x2="12" y2="1.5" stroke="#FB923C" strokeWidth="2" strokeDasharray="3 2" /></svg><span className="font-body font-semibold text-[7px]" style={{ color: "#FB923C" }}>TH</span></span>
          </div>
          <svg viewBox="0 0 100 32" className="w-full" style={{ height: 30 }}>
            <defs>
              <linearGradient id="fahMini" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* grid */}
            {[4, 12, 20, 28].map((y) => <line key={y} x1="3" y1={y} x2="97" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />)}
            {/* FAH area fill */}
            <path d={`M ${fahLine.split(" ").join(" L ").replace(/,/g, " ")} L 94 31 L 6 31 Z`} fill="url(#fahMini)" />
            {/* TH target — dashed horizontal */}
            <line x1="6" y1={thY} x2="94" y2={thY} stroke="#FB923C" strokeWidth="1.6" strokeDasharray="4 2.5" strokeLinecap="round" />
            <text x="90" y={thY - 2} textAnchor="end" fontSize="6" fontWeight="700" fill="#FB923C">172</text>
            {/* FAH solid line — draws in */}
            <polyline points={fahLine} fill="none" stroke="#7dd3fc" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="120" strokeDashoffset="120" style={{ animation: "draw-line 2.4s ease-out 0.3s forwards" }} />
            {fah.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.7" fill="#7dd3fc" stroke="#0a1626" strokeWidth="0.6" style={{ opacity: 0, animation: `fade-in 0.4s ease-out ${0.5 + i * 0.4}s forwards` }} />)}
            {/* live pulse on latest FAH point */}
            <circle cx={fah[fah.length - 1][0]} cy={fah[fah.length - 1][1]} r="2.6" fill="none" stroke="#7dd3fc" strokeWidth="1.1"
              style={{ transformOrigin: `${fah[fah.length - 1][0]}px ${fah[fah.length - 1][1]}px`, animation: "pulse-ring 1.8s ease-out 2.6s infinite" }} />
          </svg>
          <p className="font-body text-[8px] text-white/45 text-center mt-0.5">{th ? "FAH เทียบส่วนสูงเป้าหมาย" : "FAH vs Target Height"}</p>
        </div>
      </div>
    </div>
  );
}

function XrayIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {/* X-ray film frame */}
      <rect x="3" y="2" width="18" height="20" rx="1.5" />
      {/* Wrist / carpal block */}
      <rect x="7" y="14.5" width="10" height="6" rx="2" />
      {/* Finger bones — index, middle (tallest), ring, pinky */}
      <rect x="7"  y="7.5" width="2" height="8"   rx="1" />
      <rect x="10" y="5.5" width="2" height="10"  rx="1" />
      <rect x="13" y="6"   width="2" height="9.5" rx="1" />
      <rect x="16" y="8.5" width="2" height="7"   rx="1" />
      {/* Thumb — curves out from the wrist toward the lower-left */}
      <path d="M7 19.5 C6 17 4.5 15 5.5 12" />
    </svg>
  );
}
function ChipIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M17 10h3M17 14h3" />
    </svg>
  );
}
function ReportIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 15h4M5 3h9l5 5v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
    </svg>
  );
}
function DoctorIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a3 3 0 100-6 3 3 0 000 6zM5.5 21a6.5 6.5 0 0113 0" />
      <path strokeLinecap="round" d="M15 13h2m0 0h2m-2 0v-2m0 2v2" />
    </svg>
  );
}
function ParentIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function CheckIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function UploadIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
    </svg>
  );
}
function UsersIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 17.5V19M9.5 11a3 3 0 100-6 3 3 0 000 6zM18 19v-1.5a3.5 3.5 0 00-2.5-3.35M15 5.2a3 3 0 010 5.6" />
    </svg>
  );
}
function MessageIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}
function BellIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}
function TrendIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 7-7m0 0h-5m5 0v5" />
    </svg>
  );
}
function BookIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15zM9 7h7M9 11h5" />
    </svg>
  );
}
function SparkleIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </svg>
  );
}
function CoreIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="5" cy="6" r="1.6" /><circle cx="19" cy="6" r="1.6" />
      <circle cx="5" cy="18" r="1.6" /><circle cx="19" cy="18" r="1.6" />
      <path strokeLinecap="round" d="M6.3 7L10 10.4M17.7 7L14 10.4M6.3 17L10 13.6M17.7 17L14 13.6" />
    </svg>
  );
}
function MoonIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;
}
function SunIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}
