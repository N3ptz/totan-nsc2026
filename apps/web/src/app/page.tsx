"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { NavSkeleton, HeroSkeleton, FeaturesSkeleton } from "@/components/Skeleton";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Session { name: string; role: string }

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
function useCountUp(target: number, duration = 1400) {
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
          setVal(Math.round(eased * target));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(node);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [target, duration]);
  return { ref, val };
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function Home() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useReveal(mounted);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.75;
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
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

  // Mouse parallax on hero glow layers
  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--mx", `${x * 26}px`);
      el.style.setProperty("--my", `${y * 26}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const th = lang === "th";

  if (!mounted) return (
    <div className="min-h-screen bg-[#04293f] overflow-x-hidden">
      <NavSkeleton />
      <HeroSkeleton />
      <FeaturesSkeleton />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg overflow-x-hidden">

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
          <button onClick={toggleLang} aria-label="Toggle language"
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
          <Link href={session ? "/dashboard" : "/login"}
            className={`group relative overflow-hidden h-8 px-4 flex items-center gap-1.5 rounded-lg text-sm font-body font-semibold transition-all active:scale-95 ${
              scrolled
                ? "text-white shadow-lg shadow-primary/25"
                : "bg-white text-primary-dark hover:bg-white/90"
            }`}
            style={scrolled ? { background: "linear-gradient(120deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" } : undefined}>
            <span className="shine relative z-10">{session ? "Dashboard" : (th ? "เริ่มใช้งาน" : "Get Started")}</span>
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section
          ref={heroRef}
          aria-labelledby="hero-heading"
          className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden"
          style={{ background: "linear-gradient(165deg, #04293f 0%, #075985 35%, #0EA5E9 75%, #38BDF8 100%)" }}
        >
          {/* Video background */}
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0, willChange: "transform", filter: "blur(0px)" }}
          >
            <source src="/LandPageVid1.mp4" type="video/mp4" />
          </video>
          {/* Dark overlay to ensure readability */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(165deg, rgba(2,20,35,0.95) 0%, rgba(4,55,90,0.92) 35%, rgba(10,110,160,0.82) 75%, rgba(30,140,190,0.75) 100%)", zIndex: 1 }} />
          <AuroraField />

          {/* Floating particles */}
          <Particles />

          <div className="relative z-10 max-w-4xl mx-auto space-y-8 pt-24 pb-20">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-body font-semibold text-white/90 animate-fade-up"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(10px)" }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              AI-Powered · Greulich &amp; Pyle Standard
            </div>

            {/* Heading */}
            <h1 id="hero-heading"
              className="font-display font-bold text-white leading-[1.05] animate-fade-up animate-delay-100"
              style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)", textWrap: "balance", letterSpacing: "-0.03em" }}>
              {th ? (
                <>ประเมินอายุกระดูก<br />
                <span className="text-gradient" style={{ filter: "brightness(1.25)" }}>ด้วย AI</span>{" "}
                สำหรับเด็กไทย</>
              ) : (
                <>Bone Age Assessment<br />
                <span className="text-gradient" style={{ filter: "brightness(1.25)" }}>Powered by AI</span>{" "}
                for Thai Children</>
              )}
            </h1>

            <p className="font-body text-white/75 mx-auto animate-fade-up animate-delay-200"
              style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", maxWidth: "52ch", lineHeight: 1.7 }}>
              {th
                ? "แพทย์อัปโหลด X-ray มือซ้าย AI วิเคราะห์ตามมาตรฐาน Greulich & Pyle ส่งผลและ recommendation ถึงผู้ปกครองได้ใน 2 นาที"
                : "Upload a left-hand X-ray. AI analyzes against the Greulich & Pyle atlas. Send results and a recommendation to parents within 2 minutes."}
            </p>

            {/* CTA */}
            <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-up animate-delay-300">
              <Link href={session ? "/dashboard" : "/login"}
                className="group relative inline-flex items-center gap-2.5 font-body font-semibold text-white px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5 active:scale-[0.97] overflow-hidden"
                style={{ background: "linear-gradient(120deg,#EA6C49,#F59E0B)", boxShadow: "0 10px 30px rgba(234,108,73,0.45)", fontSize: "1rem" }}>
                <span className="shine relative z-10 flex items-center gap-2.5">
                  {session ? (th ? "กลับสู่ Dashboard" : "Back to Dashboard") : (th ? "เริ่มใช้งานฟรี" : "Start for Free")}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <a href="#how"
                className="inline-flex items-center gap-2 font-body font-medium text-white/85 hover:text-white text-sm transition-colors px-4 py-4 rounded-xl hover:bg-white/10">
                {th ? "ดูวิธีการทำงาน" : "See how it works"}
                <span className="opacity-70 animate-bounce">↓</span>
              </a>
            </div>

            {/* Live X-ray → AI → Result diagram */}
            <div className="relative mx-auto animate-fade-up animate-delay-500" style={{ maxWidth: 620 }}>
              <FlowDiagram lang={lang} />
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="w-5 h-8 rounded-full border-2 border-white/30 flex justify-center pt-1.5">
              <div className="w-1 h-1.5 rounded-full bg-white/70 animate-bounce" />
            </div>
          </div>

          {/* Bottom wave */}
          <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" style={{ height: 70, zIndex: 10 }}>
            <path d="M0 60 C 360 130, 1080 -10, 1440 60 L1440 120 L0 120 Z" fill="rgb(var(--bg))" />
          </svg>
        </section>

        {/* ── Proof strip (marquee) ───────────────────────────────────────── */}
        <section aria-label="Key metrics" className="bg-bg border-b border-border overflow-hidden">
          <div className="max-w-5xl mx-auto px-6 py-9 grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatBlock value={95} suffix="%+" label={th ? "ความแม่นยำ" : "Accuracy"} />
            <StatBlock value={30} prefix="<" suffix="s" label={th ? "เวลาวิเคราะห์" : "Analysis time"} />
            <StaticStat value="G&P" label={th ? "มาตรฐาน Atlas" : "Atlas Standard"} />
            <StaticStat value="RBAC" label={th ? "แยกสิทธิ์" : "Role-based access"} />
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section id="how" aria-labelledby="how-heading" className="relative py-28 px-6 bg-bg overflow-hidden">
          {/* soft aurora behind */}
          <div className="absolute top-1/3 -left-40 w-[480px] h-[480px] rounded-full blur-[130px] opacity-20 animate-aurora-slow pointer-events-none"
            style={{ background: "rgb(var(--aurora-1))" }} />
          <div className="absolute bottom-0 -right-40 w-[480px] h-[480px] rounded-full blur-[130px] opacity-20 animate-aurora pointer-events-none"
            style={{ background: "rgb(var(--aurora-3))" }} />

          <div className="relative max-w-6xl mx-auto">
            <div className="reveal mb-16">
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

            <div className="grid md:grid-cols-3 gap-5">
              {(th ? [
                { n: "01", title: "อัปโหลด X-ray มือซ้าย",    body: "รองรับ JPEG, PNG และ DICOM ระบุข้อมูลพื้นฐาน อายุ เพศ และน้ำหนักส่วนสูงของเด็ก",           icon: <XrayIcon /> },
                { n: "02", title: "AI วิเคราะห์อัตโนมัติ",    body: "Deep learning เปรียบเทียบกับ Greulich & Pyle atlas ให้ bone age, confidence score และ risk flag", icon: <ChipIcon /> },
                { n: "03", title: "ส่ง recommendation",        body: "แพทย์ตรวจสอบผล เขียนคำแนะนำ ระบบสร้าง PDF และแจ้งเตือนผู้ปกครองอัตโนมัติ",                 icon: <ReportIcon /> },
              ] : [
                { n: "01", title: "Upload the X-ray",          body: "Supports JPEG, PNG, and DICOM. Add basic patient data: age, sex, height, and weight.",            icon: <XrayIcon /> },
                { n: "02", title: "AI analyzes automatically", body: "Deep learning compares against the Greulich & Pyle atlas. Returns bone age, confidence, risk flag.", icon: <ChipIcon /> },
                { n: "03", title: "Send the recommendation",   body: "Doctor reviews the result, writes a note. System generates a PDF and notifies the parent.",        icon: <ReportIcon /> },
              ]).map((step, i) => (
                <div key={step.n}
                  className="reveal group relative glass rounded-2xl p-8 flex flex-col gap-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 overflow-hidden"
                  style={{ transitionDelay: `${i * 90}ms` }}>
                  <div className="absolute -top-8 -right-6 font-display font-bold text-7xl text-primary/[0.07] select-none group-hover:text-primary/[0.12] transition-colors">
                    {step.n}
                  </div>
                  <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" }}>
                    {step.icon}
                  </div>
                  <div className="relative">
                    <h3 className="font-display font-semibold text-ink" style={{ fontSize: "1.15rem", letterSpacing: "-0.01em" }}>
                      {step.title}
                    </h3>
                    <p className="font-body text-muted mt-2" style={{ fontSize: "0.9375rem", lineHeight: 1.65 }}>
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who it's for ────────────────────────────────────────────────── */}
        <section id="who" aria-labelledby="who-heading" className="relative py-28 px-6 overflow-hidden"
          style={{ background: "#070d1a" }}>
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, #38BDF8 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
          <div className="absolute top-0 left-1/4 w-[520px] h-[520px] rounded-full blur-[140px] opacity-25 animate-aurora pointer-events-none"
            style={{ background: "#0EA5E9" }} />
          <div className="absolute bottom-0 right-1/4 w-[460px] h-[460px] rounded-full blur-[140px] opacity-20 animate-aurora-slow pointer-events-none"
            style={{ background: "#EA6C49" }} />

          <div className="relative max-w-6xl mx-auto">
            <h2 id="who-heading" className="reveal font-display font-bold text-white mb-12"
              style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", letterSpacing: "-0.025em", textWrap: "balance" }}>
              {th ? "สองมุมมอง ระบบเดียว" : "Two Perspectives, One System"}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Doctor */}
              <div className="reveal group rounded-2xl p-8 flex flex-col gap-6 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative"
                style={{ background: "rgba(14,165,233,0.10)", border: "1px solid rgba(56,189,248,0.22)", backdropFilter: "blur(14px)" }}>
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 transition-opacity group-hover:opacity-50"
                  style={{ background: "#38BDF8" }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.22)" }}>
                    <DoctorIcon className="w-6 h-6 text-[#7dd3fc]" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-white text-base">{th ? "แพทย์เด็ก" : "Pediatrician"}</p>
                    <p className="font-body text-xs" style={{ color: "rgba(125,211,252,0.75)" }}>{th ? "บทบาทหลัก" : "Primary user"}</p>
                  </div>
                </div>
                <ul className="relative space-y-3">
                  {(th ? [
                    "อัปโหลด X-ray และดูผล AI ในหน้าเดียวกัน",
                    "จัดการรายชื่อผู้ป่วยและประวัติการประเมิน",
                    "เขียน recommendation ส่งตรงถึงผู้ปกครอง",
                    "Export PDF รายงานสำหรับแฟ้มผู้ป่วย",
                  ] : [
                    "Upload X-ray and view AI result on one screen",
                    "Manage patient list and assessment history",
                    "Write recommendations sent directly to parents",
                    "Export PDF reports for patient records",
                  ]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 font-body text-white/80" style={{ fontSize: "0.9375rem" }}>
                      <CheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#7dd3fc]" />{item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Parent */}
              <div className="reveal group rounded-2xl p-8 flex flex-col gap-6 transition-all duration-300 hover:-translate-y-1 overflow-hidden relative"
                style={{ background: "rgba(234,108,73,0.10)", border: "1px solid rgba(251,146,60,0.22)", backdropFilter: "blur(14px)", transitionDelay: "90ms" }}>
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 transition-opacity group-hover:opacity-50"
                  style={{ background: "#FB923C" }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(251,146,60,0.22)" }}>
                    <ParentIcon className="w-6 h-6" style={{ color: "#FDBA74" }} />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-white text-base">{th ? "ผู้ปกครอง" : "Parent"}</p>
                    <p className="font-body text-xs" style={{ color: "rgba(253,186,116,0.75)" }}>{th ? "ผู้รับผลการประเมิน" : "Result recipient"}</p>
                  </div>
                </div>
                <ul className="relative space-y-3">
                  {(th ? [
                    "รับแจ้งเตือนทันทีเมื่อมีผลการประเมินใหม่",
                    "ดูผลการเจริญเติบโตของบุตรหลานในรูปแบบที่เข้าใจง่าย",
                    "อ่าน recommendation จากแพทย์ได้ทุกที่",
                    "ไม่ต้องสับสนกับคำศัพท์ทางการแพทย์",
                  ] : [
                    "Receive instant notifications when a new result is ready",
                    "View your child's growth in an easy-to-understand format",
                    "Read doctor recommendations from anywhere",
                    "No confusing medical jargon",
                  ]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 font-body text-white/80" style={{ fontSize: "0.9375rem" }}>
                      <CheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#FDBA74" }} />{item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA close ───────────────────────────────────────────────────── */}
        <section id="about" aria-labelledby="cta-heading" className="relative py-32 px-6 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0284C7 0%, #0EA5E9 55%, #38BDF8 100%)" }}>
          <AuroraField subtle />
          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
            <h2 id="cta-heading" className="reveal font-display font-bold text-white"
              style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)", letterSpacing: "-0.03em", textWrap: "balance", lineHeight: 1.1 }}>
              {th ? "พร้อมเริ่มประเมินอายุกระดูก?" : "Ready to start assessing bone age?"}
            </h2>
            <p className="reveal font-body text-white/75 mx-auto" style={{ fontSize: "1.0625rem", lineHeight: 1.7, maxWidth: "44ch" }}>
              {th
                ? "ระบบใช้งานฟรีสำหรับแพทย์ ลงทะเบียนได้ทันทีโดยไม่ต้องรอการอนุมัติ"
                : "Free for doctors. Sign up immediately with no approval wait."}
            </p>
            <div className="reveal flex flex-wrap items-center justify-center gap-4">
              <Link href={session ? "/dashboard" : "/login"}
                className="group relative inline-flex items-center gap-2.5 font-body font-semibold text-primary-dark bg-white px-10 py-5 rounded-2xl transition-all hover:-translate-y-0.5 active:scale-[0.97] text-lg overflow-hidden"
                style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.22)" }}>
                <span className="shine relative z-10 flex items-center gap-2.5">
                  {session ? (th ? "กลับสู่ Dashboard" : "Back to Dashboard") : (th ? "สมัครใช้งานฟรี" : "Sign Up Free")}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              {session && (
                <p className="font-body text-sm text-white/60">
                  {th ? `เข้าสู่ระบบเป็น ${session.name}` : `Signed in as ${session.name}`}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer role="contentinfo" className="py-9 px-6 border-t border-border bg-bg">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LogoMark scrolled />
            <span className="font-display font-bold text-ink">โตทัน</span>
            <span className="font-body text-xs text-muted">· NSC 2026 · Mahidol University</span>
          </div>
          <p className="font-body text-xs text-muted text-center">
            {th
              ? "ระบบประเมินอายุกระดูกและติดตามการเจริญเติบโตสำหรับเด็กไทย"
              : "Bone age assessment and growth monitoring for Thai children"}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="font-body text-xs font-medium text-muted hover:text-ink transition-colors">
              {th ? "English" : "ภาษาไทย"}
            </button>
            <span className="text-border" aria-hidden>·</span>
            <button onClick={toggleTheme} aria-label="Toggle theme" className="text-muted hover:text-ink transition-colors">
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Aurora field (animated mesh blobs) ──────────────────────────────────────────
function AuroraField({ subtle = false }: { subtle?: boolean }) {
  const o = subtle ? 0.22 : 0.4;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ transform: "translate3d(var(--mx,0),var(--my,0),0)", transition: "transform 0.3s ease-out", zIndex: 2 }}>
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      {/* Blobs */}
      <div className="absolute top-[8%] left-[12%] w-[42vw] h-[42vw] max-w-[560px] max-h-[560px] blur-[90px] animate-blob animate-aurora"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.9), transparent 65%)", opacity: o }} />
      <div className="absolute top-[20%] right-[6%] w-[40vw] h-[40vw] max-w-[520px] max-h-[520px] blur-[100px] animate-blob animate-aurora-slow"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.85), transparent 65%)", opacity: o, animationDelay: "-6s" }} />
      <div className="absolute bottom-[2%] left-[28%] w-[38vw] h-[38vw] max-w-[480px] max-h-[480px] blur-[110px] animate-blob animate-aurora"
        style={{ background: "radial-gradient(circle, rgba(234,108,73,0.8), transparent 65%)", opacity: o * 0.9, animationDelay: "-12s" }} />
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
function StatBlock({ value, prefix = "", suffix = "", label }: { value: number; prefix?: string; suffix?: string; label: string }) {
  const { ref, val } = useCountUp(value);
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

// ── Flow Diagram (animated) ─────────────────────────────────────────────────────
function FlowDiagram({ lang }: { lang: string }) {
  const th = lang === "th";
  return (
    <div className="flex items-center justify-center gap-2.5 md:gap-4 py-4" aria-hidden="true">
      {/* X-ray card with scan line */}
      <div className="relative flex flex-col items-center gap-2.5 rounded-2xl p-4 md:p-5 w-32 md:w-36 animate-float-soft overflow-hidden"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(8px)" }}>
        <div className="absolute left-0 right-0 h-6 pointer-events-none"
          style={{ top: 0, background: "linear-gradient(rgba(56,189,248,0.55), transparent)", animation: "scan-line 3.5s ease-in-out infinite" }} />
        <div className="relative w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
          <XrayIcon className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-white text-xs leading-tight">{th ? "X-ray มือ" : "Hand X-ray"}</p>
          <p className="font-body text-white/55 text-[10px] mt-0.5">{th ? "อัปโหลด" : "Upload"}</p>
        </div>
      </div>

      <FlowArrow />

      {/* AI card with pulse ring */}
      <div className="relative flex flex-col items-center gap-2.5 rounded-2xl p-4 md:p-5 w-32 md:w-36 animate-float overflow-hidden"
        style={{ background: "rgba(255,255,255,0.20)", border: "1px solid rgba(255,255,255,0.34)", backdropFilter: "blur(8px)", boxShadow: "0 0 40px rgba(56,189,248,0.35)" }}>
        <div className="relative w-12 h-12 rounded-xl bg-white/22 flex items-center justify-center">
          <span className="absolute inset-0 rounded-xl border border-white/50 animate-pulse-ring" />
          <ChipIcon className="w-6 h-6 text-white animate-spin-slow" />
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-white text-xs leading-tight">{th ? "AI วิเคราะห์" : "AI Analysis"}</p>
          <p className="font-body text-white/55 text-[10px] mt-0.5">Greulich &amp; Pyle</p>
        </div>
      </div>

      <FlowArrow />

      {/* Result card */}
      <div className="relative flex flex-col items-center gap-2.5 rounded-2xl p-4 md:p-5 w-32 md:w-36 animate-float-soft overflow-hidden"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(8px)", animationDelay: "-2s" }}>
        <div className="relative w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
          <ReportIcon className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-white text-xs leading-tight">{th ? "ผลและรายงาน" : "Result & Report"}</p>
          <p className="font-body text-white/55 text-[10px] mt-0.5">{th ? "PDF พร้อมส่ง" : "PDF ready"}</p>
        </div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-white/70 animate-twinkle" style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function LogoMark({ scrolled = false }: { scrolled?: boolean }) {
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
      style={scrolled
        ? { background: "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))", boxShadow: "0 4px 14px rgba(14,165,233,0.4)" }
        : { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </div>
  );
}

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4-4 4M3 12h18" />
    </svg>
  );
}
function XrayIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="11" width="8" height="9" rx="1" />
      <rect x="4" y="5" width="2" height="7" rx="1" /><rect x="7" y="3" width="2" height="9" rx="1" />
      <rect x="10" y="4" width="2" height="8" rx="1" /><rect x="13" y="6" width="1.5" height="7" rx="0.75" />
      <rect x="3" y="20" width="8" height="1" rx="0.5" />
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
function MoonIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;
}
function SunIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}
