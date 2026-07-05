"use client";

/**
 * AiPipeline — scroll-driven AI storytelling.
 *
 * The section is tall (steps+1 × 100svh). A sticky inner panel holds the split
 * layout: left = step text that transitions as the user scrolls; right = the
 * R3F holographic hand that reacts to the active step via shader uniforms.
 *
 * Scroll math:
 *   progress = (-containerRect.top) / (containerH - viewportH)   [0 → 1]
 *   step     = clamp(floor(progress × n), 0, n-1)
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// ── 3D model (WebGL only) ────────────────────────────────────────────────────
const AiHandModel = dynamic(() => import("./three/AiHandModel"), {
  ssr: false,
  loading: () => <ModelSkeleton />,
});

function ModelSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="w-40 h-40 rounded-full blur-[60px] opacity-40 animate-pulse"
        style={{ background: "radial-gradient(circle, #38BDF8, transparent 70%)" }} />
    </div>
  );
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

// ── 2D fallback when WebGL is unavailable ────────────────────────────────────
const ROIS = [
  { l: "20%", t: "8%",  w: "62%", h: "42%", c: "#38BDF8" },
  { l: "16%", t: "48%", w: "60%", h: "26%", c: "#34D399" },
  { l: "30%", t: "74%", w: "40%", h: "22%", c: "#FB923C" },
];
const GRADCAM = "radial-gradient(circle at 40% 28%, rgba(255,64,32,0.92), transparent 22%), radial-gradient(circle at 58% 22%, rgba(255,150,40,0.88), transparent 18%), radial-gradient(circle at 46% 58%, rgba(255,90,40,0.8), transparent 26%)";

function ModelFallback({ step, th }: { step: number; th: boolean }) {
  return (
    <div className="absolute inset-0">
      <img src="/Hand-nobg.png" alt={th ? "ภาพถ่ายรังสีมือ" : "Hand X-ray"}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: "sepia(0.5) hue-rotate(160deg) saturate(2.4) brightness(1.12) drop-shadow(0 0 18px rgba(56,189,248,0.4))" }} />
      {step === 4 && (
        <div className="absolute inset-0 animate-glow" style={{ mixBlendMode: "screen", opacity: 0.78, background: GRADCAM }} />
      )}
      {step === 1 && ROIS.map((b, i) => (
        <div key={i} className="absolute rounded"
          style={{ left: b.l, top: b.t, width: b.w, height: b.h, border: `1.5px dashed ${b.c}`, boxShadow: `0 0 12px ${b.c}55` }} />
      ))}
    </div>
  );
}

// ── Per-step supporting data chips/metrics ────────────────────────────────────
function StepData({ i, th }: { i: number; th: boolean }) {
  const chip = (t: string, c = "#7dd3fc") => (
    <span key={t} className="font-mono text-[11px] px-2.5 py-1 rounded-lg"
      style={{ background: "rgba(56,189,248,0.1)", color: c, border: `1px solid ${c}33` }}>{t}</span>
  );

  if (i === 0) return (
    <div className="flex flex-wrap gap-2">
      {["512×512", "grayscale", th ? "ลบพื้นหลัง ✓" : "bg removed ✓"].map((t) => chip(t))}
    </div>
  );

  if (i === 1) return (
    <div className="flex flex-wrap gap-2">
      {[{ t: "Phalanges", c: "#38BDF8" }, { t: "Carpals", c: "#34D399" }, { t: "Radius/Ulna", c: "#FB923C" }].map((r) => chip(r.t, r.c))}
    </div>
  );

  if (i === 2) return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl"
      style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(56,189,248,0.25)" }}>
      <div>
        <p className="font-mono text-[10px]" style={{ color: "rgba(148,163,184,0.9)" }}>bone age</p>
        <p className="font-display font-bold text-white text-xl tabular-nums leading-none">
          100<span className="text-xs font-mono"> mo</span>
        </p>
      </div>
      <div className="h-8 w-px" style={{ background: "rgba(56,189,248,0.25)" }} />
      <p className="font-display font-semibold text-sm" style={{ color: "#6ee7b7" }}>
        = 8y 4m<br /><span className="font-mono text-[11px] text-white/70">conf 96%</span>
      </p>
    </div>
  );

  if (i === 3) {
    const groups = [
      { n: th ? "เอเชีย"    : "Asia",       v: "6.5", c: "#38BDF8" },
      { n: th ? "ยุโรป"     : "Europe",     v: "6.6", c: "#34D399" },
      { n: th ? "แอฟ."      : "Africa",     v: "6.4", c: "#FB923C" },
      { n: th ? "อเมใต้"   : "S.Am.",      v: "6.5", c: "#A78BFA" },
    ];
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-display font-bold"
          style={{ background: "rgba(52,211,153,0.18)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.4)" }}>
          ✓ {th ? "MAE สมดุลทุกกลุ่ม" : "balanced MAE"}
        </span>
        {groups.map((g) => (
          <span key={g.n} className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-lg"
            style={{ background: "rgba(56,189,248,0.1)", border: `1px solid ${g.c}33` }}>
            <span style={{ color: "rgba(148,163,184,0.9)" }}>{g.n}</span>
            <span className="tabular-nums" style={{ color: g.c }}>{g.v}</span>
          </span>
        ))}
      </div>
    );
  }

  // i === 4 — growth stats
  const stats = th
    ? [{ k: "ส่วนสูงคาด", v: "172 cm" }, { k: "เป้าหมาย", v: "170 cm" }, { k: "สูง P", v: "P60" }, { k: "หนัก P", v: "P55" }, { k: "BMI", v: "16.8" }, { k: "ภาวะ", v: "Normal" }]
    : [{ k: "Adult ht.", v: "172 cm" }, { k: "Target", v: "170 cm" }, { k: "Height P", v: "P60" }, { k: "Weight P", v: "P55" }, { k: "BMI", v: "16.8" }, { k: "Status", v: "Normal" }];
  return (
    <div className="grid grid-cols-3 gap-2 max-w-xs">
      {stats.map((s) => (
        <div key={s.k} className="rounded-lg px-2.5 py-1.5"
          style={{ background: "rgba(8,20,34,0.5)", border: "1px solid rgba(56,189,248,0.16)" }}>
          <p className="font-mono text-[8px] truncate" style={{ color: "rgba(148,163,184,0.85)" }}>{s.k}</p>
          <p className="font-display font-bold text-white text-[13px] tabular-nums">{s.v}</p>
        </div>
      ))}
    </div>
  );
}

// ── Progress dot strip ────────────────────────────────────────────────────────
function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="rounded-full transition-all duration-500"
          style={{
            width: i === active ? 28 : 8, height: 8,
            background: i === active ? "rgb(var(--aurora-1))" : "rgba(56,189,248,0.22)",
          }} />
      ))}
    </div>
  );
}

// ── Final output strip (shown at the end of the scroll journey) ───────────────
function FinalOutput({ th, visible }: { th: boolean; visible: boolean }) {
  const output = th
    ? [{ k: "อายุกระดูก", v: "8y4m" }, { k: "มั่นใจ", v: "96%" }, { k: "FAH", v: "172cm" }, { k: "pct", v: "P60" }, { k: "ภาวะ", v: "ปกติ" }, { k: "fair", v: "✓" }]
    : [{ k: "bone age", v: "8y4m" }, { k: "conf", v: "96%" }, { k: "FAH", v: "172cm" }, { k: "pct", v: "P60" }, { k: "status", v: "Normal" }, { k: "fair", v: "✓" }];

  return (
    <div className="transition-all duration-700" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}>
      <div className="rounded-2xl px-4 py-3"
        style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(52,211,153,0.28)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399" }} />
          <span className="font-display font-bold text-[10px] tracking-widest uppercase" style={{ color: "#6ee7b7" }}>
            {th ? "ผลลัพธ์สุดท้าย" : "Final Output"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {output.map((o) => (
            <span key={o.k} className="inline-flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ background: "rgba(8,20,34,0.5)", border: "1px solid rgba(56,189,248,0.16)" }}>
              <span className="font-body text-[9px]" style={{ color: "rgba(148,163,184,0.85)" }}>{o.k}</span>
              <span className="font-display font-bold text-white text-[11px] tabular-nums">{o.v}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AiPipeline({ lang }: { lang: string }) {
  const th = lang === "th";

  const steps = th ? [
    { model: "DeepLabV3",                       title: "แยกมือออกจากพื้นหลัง",           body: "ปรับภาพเป็น 512×512 เกรย์สเกล แล้วลบพื้นหลังให้เหลือเฉพาะโครงสร้างมือ ลดสัญญาณรบกวนก่อนวิเคราะห์" },
    { model: "YOLOv11",                         title: "ดึง 3 พื้นที่กระดูกสำคัญ",         body: "ครอบตัดกระดูกข้อมือ (Carpals), กระดูกนิ้ว (Phalanges) และรอยต่อปลายแขน (Radius/Ulna) อย่างแม่นยำ" },
    { model: "ConvNeXt Tiny",                   title: "ประเมินอายุกระดูก",               body: "รับ 3 ภาพ ROI + เพศ ผ่าน pre-train บน RSNA และ fine-tune บน Digital Hand Atlas คืนค่าอายุกระดูกเป็นเดือน" },
    { model: "Variance Reg. + Balanced Sampling", title: "ลดอคติ เที่ยงตรงทุกเชื้อชาติ", body: "Partial fine-tuning พร้อมลงโทษโมเดลเมื่อ error ของเชื้อชาติใดต่างจากกลุ่มอื่น บังคับให้ค่าความคลาดเคลื่อนใกล้กันทุกกลุ่ม" },
    { model: "Grad-CAM · Bayley-Pinneau",        title: "อธิบายผล + พยากรณ์ส่วนสูง",       body: "สร้างแผนที่ความร้อนชี้จุดที่โมเดลใช้ตัดสินใจ และพยากรณ์ส่วนสูงเมื่อโตเต็มวัยด้วยวิธี Bayley-Pinneau เทียบเกณฑ์เด็กไทย" },
  ] : [
    { model: "DeepLabV3",                       title: "Isolate the hand",               body: "Resize to 512×512 grayscale and strip the background to the hand structure only, cutting noise before analysis." },
    { model: "YOLOv11",                         title: "Extract 3 bone regions",         body: "Precisely crop the wrist (Carpals), fingers (Phalanges), and forearm joint (Radius/Ulna)." },
    { model: "ConvNeXt Tiny",                   title: "Assess bone age",                body: "Takes the 3 ROIs + sex, pre-trained on RSNA and fine-tuned on the Digital Hand Atlas, returns bone age in months." },
    { model: "Variance Reg. + Balanced Sampling", title: "Debias across ethnicities",    body: "Partial fine-tuning that penalizes the model when any ethnicity's error drifts from the rest, forcing equal accuracy across all groups." },
    { model: "Grad-CAM · Bayley-Pinneau",        title: "Explain + forecast height",      body: "Builds a heatmap of exactly where the model looked, then forecasts adult height via the Bayley-Pinneau method against Thai growth standards." },
  ];

  const n = steps.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [step,      setStep]    = useState(0);
  const [progress,  setProgress] = useState(0);
  const [mounted,   setMounted]  = useState(false);
  const [webgl,     setWebgl]    = useState(true);

  useEffect(() => {
    setMounted(true);
    // Only render the WebGL hand on large screens; mobile uses the 2D fallback,
    // avoiding a second WebGL context below the fold.
    const big = window.matchMedia("(min-width: 1024px)").matches;
    setWebgl(hasWebGL() && big);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect      = el.getBoundingClientRect();
      const scrollable = el.clientHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const scrolled = Math.max(0, -rect.top);
      const p = Math.min(1, scrolled / scrollable);
      setProgress(p);
      setStep(Math.min(n - 1, Math.floor(p * n)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [n]);

  const showFinal = progress > 0.88;

  return (
    <section id="ai" aria-labelledby="ai-heading">
      {/* Outer scrollable container — each step gets 1 viewport of scroll travel */}
      <div ref={containerRef} style={{ height: `calc(100svh * ${n + 1})` }}>

        {/* Sticky viewport — stays pinned for the entire scroll journey */}
        <div style={{ position: "sticky", top: 0, height: "100svh", overflow: "hidden", zIndex: 10 }}
          className="relative flex flex-col lg:grid lg:grid-cols-2">

          {/* ── Dark background always — holographic 3D reads best on dark ── */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, #05111f 0%, #071828 60%, #05111f 100%)" }} />

          {/* Subtle dot grid */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.045]"
            style={{ backgroundImage: "radial-gradient(circle, #38BDF8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

          {/* Ambient glow blobs */}
          <div className="absolute top-[5%] -right-48 w-[520px] h-[520px] rounded-full blur-[160px] pointer-events-none"
            style={{ background: "#0EA5E9", opacity: 0.12 }} />
          <div className="absolute bottom-[5%] -left-48 w-[480px] h-[480px] rounded-full blur-[160px] pointer-events-none"
            style={{ background: "#7C3AED", opacity: 0.10 }} />

          {/* ── Left: step narrative ───────────────────────────────────────── */}
          <div className="relative z-10 flex flex-col justify-center
                          px-7 py-10 lg:px-12 xl:px-16
                          order-2 lg:order-1
                          overflow-y-auto lg:overflow-visible">

            {/* Section heading — always visible */}
            <div className="mb-8 lg:mb-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4
                               font-display font-bold text-[10px] tracking-[0.16em] uppercase"
                style={{ background: "rgba(56,189,248,0.12)", color: "#7dd3fc", border: "1px solid rgba(56,189,248,0.25)" }}>
                Explainable · Fair · Deep Learning
              </span>
              <h2 id="ai-heading" className="font-display font-bold text-white"
                style={{ fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)", letterSpacing: "-0.025em" }}>
                {th ? "AI คิดอะไรอยู่กันแน่" : "What the AI actually does"}
              </h2>
            </div>

            {/* Animated step card — key forces remount & re-animate on step change */}
            <div key={step} className="animate-step-in flex flex-col gap-5">

              {/* Step number + model badge */}
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full grid place-items-center
                                 font-display font-bold text-white text-[15px] shrink-0"
                  style={{ background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--aurora-2)))",
                           boxShadow: "0 6px 20px rgba(14,165,233,0.4)" }}>
                  {step + 1}
                </span>
                <span className="font-mono text-[10px] px-2.5 py-1 rounded-lg"
                  style={{ background: "rgba(56,189,248,0.10)", color: "#7dd3fc", border: "1px solid rgba(56,189,248,0.22)" }}>
                  {steps[step].model}
                </span>
              </div>

              {/* Step title */}
              <h3 className="font-display font-bold text-white"
                style={{ fontSize: "clamp(1.3rem, 2.4vw, 1.85rem)", letterSpacing: "-0.02em", lineHeight: 1.22 }}>
                {steps[step].title}
              </h3>

              {/* Step body */}
              <p className="font-body leading-relaxed"
                style={{ color: "rgba(203,213,225,0.85)", fontSize: "clamp(0.9rem, 1.2vw, 1.0625rem)", maxWidth: "46ch" }}>
                {steps[step].body}
              </p>

              {/* Step-specific data */}
              <StepData i={step} th={th} />
            </div>

            {/* Progress dots + label */}
            <div className="flex items-center gap-4 mt-10">
              <ProgressDots total={n} active={step} />
              <span className="font-body text-xs" style={{ color: "rgba(148,163,184,0.65)" }}>
                {th ? "เลื่อนลงเพื่อดูต่อ" : "Scroll to advance"}
              </span>
            </div>

            {/* Final output — fades in at end of scroll journey */}
            <div className="mt-6">
              <FinalOutput th={th} visible={showFinal} />
            </div>
          </div>

          {/* ── Right: 3D canvas ───────────────────────────────────────────── */}
          <div className="relative order-1 lg:order-2" style={{ minHeight: "40svh" }}>
            {mounted && webgl
              ? <AiHandModel step={step} interactive={false} th={th} />
              : mounted
                ? <ModelFallback step={step} th={th} />
                : <ModelSkeleton />
            }
            <p className="absolute bottom-3 left-0 right-0 text-center font-body"
              style={{ fontSize: "11px", color: "rgba(148,163,184,0.4)", pointerEvents: "none" }}>
              {th ? "เลื่อนเพื่อดูขั้นตอนถัดไป ↓" : "Scroll to advance steps ↓"}
            </p>
          </div>

          {/* Scroll progress line — thin primary-coloured strip at top */}
          <div className="absolute top-0 left-0 h-[2px] bg-primary/80 transition-none pointer-events-none z-20"
            style={{ width: `${progress * 100}%`, transition: "width 0.1s linear" }} />
        </div>
      </div>
    </section>
  );
}
