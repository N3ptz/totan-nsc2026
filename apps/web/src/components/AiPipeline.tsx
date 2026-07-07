"use client";

/**
 * AiPipeline — step-by-step AI walkthrough.
 *
 * A normal-flow section (no scroll hijack): left = step narrative with
 * prev/next controls and clickable progress dots; right = the holographic
 * hand inside a dark "X-ray viewer" panel that reacts to the active step.
 * The viewer stays dark in both themes (radiographs read on dark); the
 * section shell follows the app theme.
 *
 * All steps are rendered stacked in one grid cell (inactive ones
 * visibility:hidden) so the card height equals the tallest step at any
 * width — the controls below never jump when the step changes.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { ContinentMap } from "./ContinentMap";

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

// ── 2D fallback when WebGL is unavailable (and on phones/tablets) ────────────
// Mirrors what the 3D model shows per step, so no step reads as "nothing
// happened" on mobile: scan sweep → ROI boxes → bone-age HUD → fairness
// badges → Grad-CAM heat.
const ROIS = [
  { l: "20%", t: "8%",  w: "62%", h: "42%", c: "#38BDF8", label: "Phalanges" },
  { l: "16%", t: "48%", w: "60%", h: "26%", c: "#34D399", label: "Carpals" },
  { l: "30%", t: "74%", w: "40%", h: "22%", c: "#FB923C", label: "Radius/Ulna" },
];
const GRADCAM = "radial-gradient(circle at 40% 28%, rgba(255,64,32,0.92), transparent 22%), radial-gradient(circle at 58% 22%, rgba(255,150,40,0.88), transparent 18%), radial-gradient(circle at 46% 58%, rgba(255,90,40,0.8), transparent 26%)";

// pulsing dots over the growth-plate joints (same image crop as HeroHand)
const FB_LANDMARKS = [
  { x: "30%", y: "35%", c: "#FB8E5E" }, { x: "42%", y: "29%", c: "#FB8E5E" },
  { x: "54%", y: "28%", c: "#FB8E5E" }, { x: "65%", y: "31%", c: "#FB8E5E" },
  { x: "37%", y: "22%", c: "#67E8F9" }, { x: "49%", y: "18%", c: "#67E8F9" },
  { x: "60%", y: "18%", c: "#67E8F9" }, { x: "44%", y: "60%", c: "#67E8F9" },
];

// fairness badges pinned to the panel corners (values match the 3D overlays)
const FB_REGIONS = [
  { k: "asia",     pos: "top-[4%] left-[3%]",     c: "#38BDF8", v: "6.5", th: "เอเชีย",     en: "Asia" },
  { k: "europe",   pos: "top-[4%] right-[3%]",    c: "#34D399", v: "6.6", th: "ยุโรป",      en: "Europe" },
  { k: "africa",   pos: "bottom-[5%] left-[3%]",  c: "#FB923C", v: "6.4", th: "แอฟริกา",   en: "Africa" },
  { k: "samerica", pos: "bottom-[5%] right-[3%]", c: "#A78BFA", v: "6.5", th: "อเมริกาใต้", en: "S. America" },
];

/** Always-mounted overlay layer that crossfades with the active step. */
function FbLayer({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div aria-hidden={!show} className="absolute inset-0 pointer-events-none transition-opacity duration-500 ease-out"
      style={{ opacity: show ? 1 : 0 }}>
      {children}
    </div>
  );
}

function ModelFallback({ step, th }: { step: number; th: boolean }) {
  return (
    <div className="absolute inset-0">
      <img src="/Hand-nobg.png" alt={th ? "ภาพถ่ายรังสีมือ" : "Hand X-ray"}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: "sepia(0.5) hue-rotate(160deg) saturate(2.4) brightness(1.12) drop-shadow(0 0 18px rgba(56,189,248,0.4))" }} />

      {/* step 0 — DeepLabV3 segmentation: sweeping scan band */}
      <FbLayer show={step === 0}>
        <div className="absolute left-[8%] right-[8%] h-12"
          style={{ background: "linear-gradient(rgba(103,232,249,0.5), transparent)",
                   borderTop: "1px solid rgba(103,232,249,0.9)",
                   boxShadow: "0 0 24px rgba(56,189,248,0.45)",
                   animation: "scan-line 3.6s ease-in-out infinite" }} />
      </FbLayer>

      {/* step 1 — YOLO ROI boxes with labels */}
      <FbLayer show={step === 1}>
        {ROIS.map((b) => (
          <div key={b.label} className="absolute rounded"
            style={{ left: b.l, top: b.t, width: b.w, height: b.h, border: `1.5px dashed ${b.c}`, boxShadow: `0 0 12px ${b.c}55` }}>
            <span className="absolute -top-2.5 left-2 font-mono text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(2,11,22,0.85)", color: b.c, border: `1px solid ${b.c}66` }}>
              {b.label}
            </span>
          </div>
        ))}
      </FbLayer>

      {/* step 2 — joint landmarks + bone-age HUD (mirrors the 3D output panel) */}
      <FbLayer show={step === 2}>
        {FB_LANDMARKS.map((p, i) => (
          <span key={i} className="absolute flex h-2 w-2 -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}>
            <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
              style={{ background: p.c, animationDelay: `${i * 0.25}s` }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: p.c, boxShadow: `0 0 8px ${p.c}` }} />
          </span>
        ))}
        <div className="absolute top-[3%] right-[3%] font-mono rounded-sm"
          style={{ background: "linear-gradient(180deg, rgba(3,15,30,0.95), rgba(2,10,20,0.93))",
                   border: "1px solid rgba(103,232,249,0.55)", boxShadow: "0 0 18px rgba(56,189,248,0.45)",
                   padding: "7px 12px 8px" }}>
          <p className="text-[8px] tracking-[0.18em] font-bold" style={{ color: "rgba(125,211,252,0.85)" }}>BONE AGE · CONVNEXT</p>
          <p className="text-white font-bold leading-none mt-1" style={{ fontSize: 20, textShadow: "0 0 9px rgba(56,189,248,0.9)" }}>
            100<span className="text-[10px]" style={{ color: "#7dd3fc" }}> mo</span>
            <span className="text-[10px] font-normal" style={{ color: "rgba(148,163,184,0.9)" }}> · 8y 4m</span>
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[8px]" style={{ color: "rgba(148,163,184,0.9)" }}>CONF</span>
            <span className="block h-[3px] w-14 rounded overflow-hidden" style={{ background: "rgba(56,189,248,0.18)" }}>
              <span className="block h-full" style={{ width: "96%", background: "linear-gradient(90deg,#22D3EE,#34D399)" }} />
            </span>
            <span className="text-[9px] font-bold" style={{ color: "#6ee7b7" }}>96%</span>
          </div>
        </div>
      </FbLayer>

      {/* step 3 — fairness: continent badges in the panel corners */}
      <FbLayer show={step === 3}>
        {FB_REGIONS.map((g) => (
          <div key={g.k} className={`absolute ${g.pos} text-center rounded-xl px-2.5 pt-1.5 pb-1`}
            style={{ background: "rgba(6,18,32,0.86)", border: `1px solid ${g.c}80`, boxShadow: `0 0 16px ${g.c}45` }}>
            <ContinentMap k={g.k} c={g.c} size={38} />
            <p className="font-display font-bold text-white text-[10px] mt-0.5">{th ? g.th : g.en}</p>
            <p className="font-mono text-[9px] font-bold" style={{ color: g.c }}>
              {g.v} mo <span style={{ color: "#6ee7b7" }}>✓</span>
            </p>
          </div>
        ))}
      </FbLayer>

      {/* step 4 — Grad-CAM heatmap */}
      <FbLayer show={step === 4}>
        <div className="absolute inset-0 animate-glow" style={{ mixBlendMode: "screen", opacity: 0.78, background: GRADCAM }} />
        <span className="absolute top-[3%] right-[3%] font-mono text-[9px] px-2 py-1 rounded"
          style={{ background: "rgba(2,11,22,0.85)", color: "#FDBA74", border: "1px solid rgba(251,146,60,0.5)" }}>
          Grad-CAM
        </span>
      </FbLayer>
    </div>
  );
}

// ── Theme palette — one place for every dark/light pair in this section ──────
interface Pal {
  chipBg: string; chipBorder: string; chipText: string;
  panelBg: string; panelBorder: string;
  cardBg: string; cardBorder: string;
  success: string; successDot: string; successBg: string; successBorder: string;
  arrowFg: string; arrowBg: string; arrowBorder: string;
  dotIdle: string;
  accents: { sky: string; mint: string; coral: string; violet: string };
}

const PALETTE: { dark: Pal; light: Pal } = {
  dark: {
    chipBg: "rgba(56,189,248,0.10)", chipBorder: "rgba(56,189,248,0.25)", chipText: "#7dd3fc",
    panelBg: "rgba(14,165,233,0.12)", panelBorder: "rgba(56,189,248,0.25)",
    cardBg: "rgba(8,20,34,0.5)", cardBorder: "rgba(56,189,248,0.16)",
    success: "#6ee7b7", successDot: "#34D399", successBg: "rgba(52,211,153,0.18)", successBorder: "rgba(52,211,153,0.4)",
    arrowFg: "#E2E8F0", arrowBg: "rgba(56,189,248,0.10)", arrowBorder: "rgba(56,189,248,0.30)",
    dotIdle: "rgba(56,189,248,0.22)",
    accents: { sky: "#38BDF8", mint: "#34D399", coral: "#FB923C", violet: "#A78BFA" },
  },
  light: {
    chipBg: "rgba(2,132,199,0.07)", chipBorder: "rgba(2,132,199,0.25)", chipText: "#0369A1",
    panelBg: "rgba(14,165,233,0.08)", panelBorder: "rgba(2,132,199,0.22)",
    cardBg: "rgba(255,255,255,0.9)", cardBorder: "rgba(2,132,199,0.18)",
    success: "#047857", successDot: "#059669", successBg: "rgba(16,185,129,0.12)", successBorder: "rgba(5,150,105,0.35)",
    arrowFg: "#0369A1", arrowBg: "rgba(2,132,199,0.07)", arrowBorder: "rgba(2,132,199,0.30)",
    dotIdle: "rgba(2,132,199,0.20)",
    accents: { sky: "#0284C7", mint: "#059669", coral: "#C2410C", violet: "#7C3AED" },
  },
};

type AccentKey = keyof Pal["accents"];

// ── Static content (written once; colors resolved from the palette) ──────────
const STEPS = {
  th: [
    { model: "DeepLabV3",                       title: "แยกมือออกจากพื้นหลัง",           body: "ปรับภาพเป็น 512×512 เกรย์สเกล แล้วลบพื้นหลังให้เหลือเฉพาะโครงสร้างมือ ลดสัญญาณรบกวนก่อนวิเคราะห์" },
    { model: "YOLOv11",                         title: "ดึง 3 พื้นที่กระดูกสำคัญ",         body: "ครอบตัดกระดูกข้อมือ (Carpals), กระดูกนิ้ว (Phalanges) และรอยต่อปลายแขน (Radius/Ulna) อย่างแม่นยำ" },
    { model: "ConvNeXt Tiny",                   title: "ประเมินอายุกระดูก",               body: "รับ 3 ภาพ ROI + เพศ ผ่าน pre-train บน RSNA และ fine-tune บน Digital Hand Atlas คืนค่าอายุกระดูกเป็นเดือน" },
    { model: "Variance Reg. + Balanced Sampling", title: "ลดอคติ เที่ยงตรงทุกเชื้อชาติ", body: "Partial fine-tuning พร้อมลงโทษโมเดลเมื่อ error ของเชื้อชาติใดต่างจากกลุ่มอื่น บังคับให้ค่าความคลาดเคลื่อนใกล้กันทุกกลุ่ม" },
    { model: "Grad-CAM · Bayley-Pinneau",        title: "อธิบายผล + พยากรณ์ส่วนสูง",       body: "สร้างแผนที่ความร้อนชี้จุดที่โมเดลใช้ตัดสินใจ และพยากรณ์ส่วนสูงเมื่อโตเต็มวัยด้วยวิธี Bayley-Pinneau เทียบเกณฑ์เด็กไทย" },
  ],
  en: [
    { model: "DeepLabV3",                       title: "Isolate the hand",               body: "Resize to 512×512 grayscale and strip the background to the hand structure only, cutting noise before analysis." },
    { model: "YOLOv11",                         title: "Extract 3 bone regions",         body: "Precisely crop the wrist (Carpals), fingers (Phalanges), and forearm joint (Radius/Ulna)." },
    { model: "ConvNeXt Tiny",                   title: "Assess bone age",                body: "Takes the 3 ROIs + sex, pre-trained on RSNA and fine-tuned on the Digital Hand Atlas, returns bone age in months." },
    { model: "Variance Reg. + Balanced Sampling", title: "Debias across ethnicities",    body: "Partial fine-tuning that penalizes the model when any ethnicity's error drifts from the rest, forcing equal accuracy across all groups." },
    { model: "Grad-CAM · Bayley-Pinneau",        title: "Explain + forecast height",      body: "Builds a heatmap of exactly where the model looked, then forecasts adult height via the Bayley-Pinneau method against Thai growth standards." },
  ],
};

const ROI_CHIPS: { t: string; k: AccentKey }[] = [
  { t: "Phalanges", k: "sky" }, { t: "Carpals", k: "mint" }, { t: "Radius/Ulna", k: "coral" },
];

const FAIR_GROUPS: { th: string; en: string; v: string; k: AccentKey }[] = [
  { th: "เอเชีย",  en: "Asia",   v: "6.5", k: "sky" },
  { th: "ยุโรป",   en: "Europe", v: "6.6", k: "mint" },
  { th: "แอฟ.",    en: "Africa", v: "6.4", k: "coral" },
  { th: "อเมใต้", en: "S.Am.",  v: "6.5", k: "violet" },
];

const GROWTH_STATS = {
  th: [{ k: "ส่วนสูงคาด", v: "172 cm" }, { k: "เป้าหมาย", v: "170 cm" }, { k: "สูง P", v: "P60" }, { k: "หนัก P", v: "P55" }, { k: "BMI", v: "16.8" }, { k: "ภาวะ", v: "Normal" }],
  en: [{ k: "Adult ht.", v: "172 cm" }, { k: "Target", v: "170 cm" }, { k: "Height P", v: "P60" }, { k: "Weight P", v: "P55" }, { k: "BMI", v: "16.8" }, { k: "Status", v: "Normal" }],
};

const FINAL_OUTPUT = {
  th: [{ k: "อายุกระดูก", v: "8y4m" }, { k: "มั่นใจ", v: "96%" }, { k: "FAH", v: "172cm" }, { k: "pct", v: "P60" }, { k: "ภาวะ", v: "ปกติ" }, { k: "fair", v: "✓" }],
  en: [{ k: "bone age", v: "8y4m" }, { k: "conf", v: "96%" }, { k: "FAH", v: "172cm" }, { k: "pct", v: "P60" }, { k: "status", v: "Normal" }, { k: "fair", v: "✓" }],
};

// ── Per-step supporting data chips/metrics ────────────────────────────────────
function StepData({ i, th, pal }: { i: number; th: boolean; pal: Pal }) {
  const chip = (t: string, c: string = pal.chipText) => (
    <span key={t} className="font-mono text-[11px] px-2.5 py-1 rounded-lg"
      style={{ background: pal.chipBg, color: c, border: `1px solid ${c}33` }}>{t}</span>
  );

  if (i === 0) return (
    <div className="flex flex-wrap gap-2">
      {["512×512", "grayscale", th ? "ลบพื้นหลัง ✓" : "bg removed ✓"].map((t) => chip(t))}
    </div>
  );

  if (i === 1) return (
    <div className="flex flex-wrap gap-2">{ROI_CHIPS.map((r) => chip(r.t, pal.accents[r.k]))}</div>
  );

  if (i === 2) return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl self-start"
      style={{ background: pal.panelBg, border: `1px solid ${pal.panelBorder}` }}>
      <div>
        <p className="font-mono text-[10px] text-muted">bone age</p>
        <p className="font-display font-bold text-ink text-xl tabular-nums leading-none">
          100<span className="text-xs font-mono"> mo</span>
        </p>
      </div>
      <div className="h-8 w-px" style={{ background: pal.panelBorder }} />
      <p className="font-display font-semibold text-sm" style={{ color: pal.success }}>
        = 8y 4m<br /><span className="font-mono text-[11px] text-muted">conf 96%</span>
      </p>
    </div>
  );

  if (i === 3) return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-display font-bold"
        style={{ background: pal.successBg, color: pal.success, border: `1px solid ${pal.successBorder}` }}>
        ✓ {th ? "MAE สมดุลทุกกลุ่ม" : "balanced MAE"}
      </span>
      {FAIR_GROUPS.map((g) => (
        <span key={g.en} className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-lg"
          style={{ background: pal.chipBg, border: `1px solid ${pal.accents[g.k]}33` }}>
          <span className="text-muted">{th ? g.th : g.en}</span>
          <span className="tabular-nums" style={{ color: pal.accents[g.k] }}>{g.v}</span>
        </span>
      ))}
    </div>
  );

  // i === 4 — growth stats
  return (
    <div className="grid grid-cols-3 gap-2 max-w-xs">
      {GROWTH_STATS[th ? "th" : "en"].map((s) => (
        <div key={s.k} className="rounded-lg px-2.5 py-1.5"
          style={{ background: pal.cardBg, border: `1px solid ${pal.cardBorder}` }}>
          <p className="font-mono text-[8px] truncate text-muted">{s.k}</p>
          <p className="font-display font-bold text-ink text-[13px] tabular-nums">{s.v}</p>
        </div>
      ))}
    </div>
  );
}

// ── Progress dot strip (clickable, ≥24px hit targets) ─────────────────────────
function ProgressDots({ total, active, pal, th, onSelect }:
  { total: number; active: number; pal: Pal; th: boolean; onSelect: (i: number) => void }) {
  return (
    <div className="flex items-center">
      {Array.from({ length: total }).map((_, i) => (
        <button key={i} onClick={() => onSelect(i)}
          aria-label={th ? `ไปขั้นตอนที่ ${i + 1}` : `Go to step ${i + 1}`}
          aria-current={i === active ? "step" : undefined}
          className="h-6 min-w-6 px-0.5 grid place-items-center cursor-pointer">
          <span className="block rounded-full transition-all duration-500"
            style={{
              width: i === active ? 28 : 10, height: 10,
              background: i === active ? "rgb(var(--primary))" : pal.dotIdle,
            }} />
        </button>
      ))}
    </div>
  );
}

// ── Final output strip (rendered only on the last step) ───────────────────────
function FinalOutput({ th, pal }: { th: boolean; pal: Pal }) {
  return (
    <div className="rounded-2xl px-4 py-3"
      style={{ background: "rgba(16,185,129,0.07)", border: `1px solid ${pal.successBorder}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: pal.successDot }} />
        <span className="font-display font-bold text-[10px] tracking-widest uppercase" style={{ color: pal.success }}>
          {th ? "ผลลัพธ์สุดท้าย" : "Final Output"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {FINAL_OUTPUT[th ? "th" : "en"].map((o) => (
          <span key={o.k} className="inline-flex items-center gap-1 rounded-lg px-2 py-1"
            style={{ background: pal.cardBg, border: `1px solid ${pal.cardBorder}` }}>
            <span className="font-body text-[9px] text-muted">{o.k}</span>
            <span className="font-display font-bold text-ink text-[11px] tabular-nums">{o.v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Prev/Next arrow button ────────────────────────────────────────────────────
// aria-disabled + click guard instead of the native disabled attribute, so
// keyboard focus isn't dropped to <body> when the range end is reached.
function ArrowBtn({ dir, onClick, disabled, pal, label }:
  { dir: "prev" | "next"; onClick: () => void; disabled: boolean; pal: Pal; label: string }) {
  return (
    <button onClick={() => { if (!disabled) onClick(); }} aria-disabled={disabled} aria-label={label}
      className={`w-11 h-11 rounded-full grid place-items-center transition-all duration-200 active:scale-95 ${
        disabled ? "opacity-30 cursor-not-allowed" : "hover:-translate-y-0.5"}`}
      style={{ color: pal.arrowFg, background: pal.arrowBg, border: `1px solid ${pal.arrowBorder}` }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
        {dir === "prev"
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          : <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />}
      </svg>
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AiPipeline({ lang }: { lang: string }) {
  const th = lang === "th";
  const { theme } = useTheme();
  const dark = theme === "dark";
  const pal = dark ? PALETTE.dark : PALETTE.light;

  const steps = STEPS[th ? "th" : "en"];
  const n = steps.length;
  const [step,    setStep]    = useState(0);
  const [mounted, setMounted] = useState(false);
  const [webgl,   setWebgl]   = useState(true);

  useEffect(() => {
    setMounted(true);
    // Only render the WebGL hand on large screens; mobile uses the 2D fallback,
    // avoiding a second WebGL context below the fold. Track the media query
    // live so zoom/resize across the breakpoint swaps the visual too.
    const ok = hasWebGL();
    const mq = window.matchMedia("(min-width: 1024px)");
    const decide = () => setWebgl(ok && mq.matches);
    decide();
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  const prev = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(n - 1, s + 1));

  return (
    <section id="ai" aria-labelledby="ai-heading" className="relative overflow-hidden"
      style={{ background: `linear-gradient(180deg, rgb(var(--bg)) 0%, ${dark ? "#071828" : "#EAF4FC"} 55%, rgb(var(--bg)) 100%)` }}>

      {/* Subtle dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ opacity: dark ? 0.045 : 0.06,
                 backgroundImage: `radial-gradient(circle, ${dark ? "#38BDF8" : "#0EA5E9"} 1px, transparent 1px)`,
                 backgroundSize: "32px 32px" }} />

      {/* Ambient glow blobs */}
      <div className="absolute top-[5%] -right-48 w-[520px] h-[520px] rounded-full blur-[160px] pointer-events-none"
        style={{ background: "#0EA5E9", opacity: dark ? 0.12 : 0.08 }} />
      <div className="absolute bottom-[5%] -left-48 w-[480px] h-[480px] rounded-full blur-[160px] pointer-events-none"
        style={{ background: "#7C3AED", opacity: dark ? 0.10 : 0.06 }} />

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 items-center gap-10 lg:gap-8
                      px-6 lg:px-12 py-16 lg:py-14">

        {/* ── Left: step narrative + controls ──────────────────────────────── */}
        <div className="order-2 lg:order-1 flex flex-col">

          {/* Section heading */}
          <div className="mb-8 lg:mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4
                             font-display font-bold text-[10px] tracking-[0.16em] uppercase"
              style={{ background: pal.chipBg, color: pal.chipText, border: `1px solid ${pal.chipBorder}` }}>
              Explainable · Fair · Deep Learning
            </span>
            <h2 id="ai-heading" className="font-display font-bold text-ink"
              style={{ fontSize: "clamp(1.7rem, 3.2vw, 2.6rem)", letterSpacing: "-0.025em" }}>
              {th ? "AI คิดอะไรอยู่กันแน่" : "What the AI actually does"}
            </h2>
          </div>

          {/* All step panes stacked in one grid cell: the container is as tall
              as the tallest step, so the controls below never jump. aria-live
              announces the newly visible pane after a button press. */}
          <div aria-live="polite" className="grid">
            {steps.map((s, i) => {
              const active = i === step;
              return (
                <div key={i} aria-hidden={!active}
                  className={`col-start-1 row-start-1 flex flex-col gap-5 ${active ? "animate-step-in" : "invisible"}`}>

                  {/* Step number + model badge */}
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full grid place-items-center
                                     font-display font-bold text-white text-[15px] shrink-0"
                      style={{ background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--aurora-2)))",
                               boxShadow: "0 6px 20px rgba(14,165,233,0.4)" }}>
                      {i + 1}
                    </span>
                    <span className="font-mono text-[10px] px-2.5 py-1 rounded-lg"
                      style={{ background: pal.chipBg, color: pal.chipText, border: `1px solid ${pal.chipBorder}` }}>
                      {s.model}
                    </span>
                  </div>

                  {/* Step title */}
                  <h3 className="font-display font-bold text-ink"
                    style={{ fontSize: "clamp(1.3rem, 2.4vw, 1.85rem)", letterSpacing: "-0.02em", lineHeight: 1.22 }}>
                    {s.title}
                  </h3>

                  {/* Step body */}
                  <p className="font-body leading-relaxed text-muted"
                    style={{ fontSize: "clamp(0.9rem, 1.2vw, 1.0625rem)", maxWidth: "46ch" }}>
                    {s.body}
                  </p>

                  {/* Step-specific data */}
                  <StepData i={i} th={th} pal={pal} />
                </div>
              );
            })}
          </div>

          {/* Controls: arrows + dots + counter */}
          <div className="flex items-center gap-4 mt-10">
            <div className="flex items-center gap-2">
              <ArrowBtn dir="prev" onClick={prev} disabled={step === 0} pal={pal}
                label={th ? "ขั้นตอนก่อนหน้า" : "Previous step"} />
              <ArrowBtn dir="next" onClick={next} disabled={step === n - 1} pal={pal}
                label={th ? "ขั้นตอนถัดไป" : "Next step"} />
            </div>
            <ProgressDots total={n} active={step} pal={pal} th={th} onSelect={setStep} />
            <span className="font-mono text-xs tabular-nums text-muted">
              {step + 1} / {n}
            </span>
          </div>

          {/* Final output — only exists on the last step (keeps it out of the
              accessibility tree and out of layout on earlier steps) */}
          {step === n - 1 && (
            <div className="mt-6 animate-rise">
              <FinalOutput th={th} pal={pal} />
            </div>
          )}
        </div>

        {/* ── Right: 3D viewer panel (always dark — X-ray reads on dark) ───── */}
        <div className="order-1 lg:order-2">
          {/* Height ≈ the old full-viewport sticky panel — the hand's on-screen
              size scales with canvas height, so keep it near 100svh on desktop. */}
          <div className="relative rounded-[2rem] overflow-hidden min-h-[46svh] lg:min-h-[86svh]"
            style={{ background: dark
                       ? "linear-gradient(180deg, #05111f 0%, #071828 60%, #05111f 100%)"
                       // light: echo the hero's brand-blue gradient so the panel
                       // reads as intentional on the light page, not a black hole
                       : "linear-gradient(160deg, #04293f 0%, #075985 62%, #0d5c8c 100%)",
                     border: `1px solid ${dark ? "rgba(56,189,248,0.18)" : "rgba(14,165,233,0.40)"}`,
                     boxShadow: dark ? "0 24px 70px rgba(2,10,20,0.55)" : "0 24px 60px rgba(7,89,133,0.30)" }}>

            {/* viewer dot grid + glow */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
              style={{ backgroundImage: "radial-gradient(circle, #38BDF8 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
            <div className="absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full blur-[120px] pointer-events-none"
              style={{ background: "#0EA5E9", opacity: 0.16 }} />

            {/* absolute layer gives the R3F <Canvas> (height:100%) a definite
                size — with only min-height on the panel it collapses. */}
            <div className="absolute inset-0">
              {mounted && webgl
                ? <AiHandModel step={step} th={th} />
                : mounted
                  ? <ModelFallback step={step} th={th} />
                  : <ModelSkeleton />
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
