"use client";

/**
 * AiPipeline — AI analysis explainer. A real 3D hand model (displaced X-ray
 * relief, see three/AiHandModel) is the centerpiece and reacts to the active
 * step (ROI boxes, Grad-CAM heat). Step through with arrows / dots / keys; the
 * supporting numbers (bone age, per-ethnicity fairness, growth stats) render as
 * HTML beside it. Faithful to Proposal2026_Final.pdf.
 */

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const AiHandModel = dynamic(() => import("./three/AiHandModel"), {
  ssr: false,
  loading: () => <ModelSkeleton />,
});

function ModelSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="w-32 h-32 rounded-full blur-[50px] opacity-50 animate-pulse"
        style={{ background: "radial-gradient(circle, #38BDF8, transparent 70%)" }} />
    </div>
  );
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

const ROIS = [
  { l: "20%", t: "8%", w: "62%", h: "42%", c: "#38BDF8" },
  { l: "16%", t: "48%", w: "60%", h: "26%", c: "#34D399" },
  { l: "30%", t: "74%", w: "40%", h: "22%", c: "#FB923C" },
];

const GRADCAM =
  "radial-gradient(circle at 40% 28%, rgba(255,64,32,0.92), transparent 22%), radial-gradient(circle at 58% 22%, rgba(255,150,40,0.88), transparent 18%), radial-gradient(circle at 46% 58%, rgba(255,90,40,0.8), transparent 26%), radial-gradient(circle at 64% 44%, rgba(255,205,60,0.65), transparent 24%)";

/** 2D fallback when WebGL is unavailable: flat holographic hand + step overlay. */
function ModelFallback({ step, th }: { step: number; th: boolean }) {
  return (
    <div className="absolute inset-0">
      <img src="/Hand-nobg.png" alt={th ? "ภาพถ่ายรังสีมือ" : "Hand X-ray"} className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: "sepia(0.5) hue-rotate(160deg) saturate(2.4) brightness(1.12) drop-shadow(0 0 16px rgba(56,189,248,0.4))" }} />
      {step === 4 && <div className="absolute inset-0 animate-glow" style={{ mixBlendMode: "screen", opacity: 0.78, background: GRADCAM }} />}
      {step === 1 && ROIS.map((b, i) => (
        <div key={i} className="absolute rounded" style={{ left: b.l, top: b.t, width: b.w, height: b.h, border: `1.5px dashed ${b.c}`, boxShadow: `0 0 12px ${b.c}55` }} />
      ))}
    </div>
  );
}

// ── Per-step supporting data (HTML) ─────────────────────────────────────────
function StepData({ i, th }: { i: number; th: boolean }) {
  const chip = (t: string, c = "#7dd3fc") => (
    <span key={t} className="font-mono text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "rgba(56,189,248,0.1)", color: c, border: `1px solid ${c}33` }}>{t}</span>
  );

  if (i === 0) return <div className="flex flex-wrap justify-center gap-2">{["512×512", "grayscale", th ? "ลบพื้นหลัง ✓" : "bg removed ✓"].map((t) => chip(t))}</div>;

  if (i === 1) return (
    <div className="flex flex-wrap justify-center gap-2">
      {[{ t: "Phalanges", c: "#38BDF8" }, { t: "Carpals", c: "#34D399" }, { t: "Radius/Ulna", c: "#FB923C" }].map((r) => chip(r.t, r.c))}
    </div>
  );

  if (i === 2) return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(56,189,248,0.25)" }}>
      <div>
        <p className="font-mono text-[10px]" style={{ color: "rgba(148,163,184,0.9)" }}>bone age</p>
        <p className="font-display font-bold text-white text-xl tabular-nums leading-none">100<span className="text-xs font-mono"> mo</span></p>
      </div>
      <div className="h-8 w-px" style={{ background: "rgba(56,189,248,0.25)" }} />
      <p className="font-display font-semibold text-sm" style={{ color: "#6ee7b7" }}>= 8y 4m<br /><span className="font-mono text-[11px] text-white/70">conf 96%</span></p>
    </div>
  );

  if (i === 3) {
    const groups = [
      { n: th ? "เอเชีย" : "Asia", v: "6.5", c: "#38BDF8" },
      { n: th ? "ยุโรป" : "Europe", v: "6.6", c: "#34D399" },
      { n: th ? "แอฟ." : "Africa", v: "6.4", c: "#FB923C" },
      { n: th ? "อเมใต้" : "S.Am.", v: "6.5", c: "#A78BFA" },
    ];
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-display font-bold" style={{ background: "rgba(52,211,153,0.18)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.4)" }}>✓ {th ? "MAE สมดุลทุกกลุ่ม" : "balanced MAE"}</span>
        {groups.map((g) => (
          <span key={g.n} className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "rgba(56,189,248,0.1)", border: `1px solid ${g.c}33` }}>
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
    <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
      {stats.map((s) => (
        <div key={s.k} className="rounded-lg px-2.5 py-1.5" style={{ background: "rgba(8,20,34,0.5)", border: "1px solid rgba(56,189,248,0.16)" }}>
          <p className="font-mono text-[8px] truncate" style={{ color: "rgba(148,163,184,0.85)" }}>{s.k}</p>
          <p className="font-display font-bold text-white text-[13px] tabular-nums">{s.v}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function AiPipeline({ lang }: { lang: string }) {
  const th = lang === "th";
  const steps = th
    ? [
        { model: "DeepLabV3", title: "แยกมือออกจากพื้นหลัง", body: "ปรับภาพเป็น 512×512 เกรย์สเกล แล้วลบพื้นหลังให้เหลือเฉพาะโครงสร้างมือ ลดสัญญาณรบกวนก่อนวิเคราะห์" },
        { model: "YOLOv11", title: "ดึง 3 พื้นที่กระดูกสำคัญ", body: "ครอบตัดกระดูกข้อมือ (Carpals), กระดูกนิ้ว (Phalanges) และรอยต่อปลายแขน (Radius/Ulna) อย่างแม่นยำ" },
        { model: "ConvNeXt Tiny", title: "ประเมินอายุกระดูก", body: "รับ 3 ภาพ ROI + เพศ ผ่าน pre-train บน RSNA และ fine-tune บน Digital Hand Atlas คืนค่าอายุกระดูกเป็นเดือน" },
        { model: "Variance Reg. + Balanced Sampling", title: "ลดอคติ เที่ยงตรงทุกเชื้อชาติ", body: "Partial fine-tuning พร้อมลงโทษโมเดลเมื่อ error ของเชื้อชาติใดต่างจากกลุ่มอื่น บังคับให้ค่าความคลาดเคลื่อนใกล้กันทุกกลุ่ม" },
        { model: "Grad-CAM · TW3", title: "อธิบายผล + พยากรณ์ส่วนสูง", body: "สร้างแผนที่ความร้อนชี้จุดที่โมเดลใช้ตัดสินใจ และพยากรณ์ส่วนสูงเมื่อโตเต็มวัยด้วย Tanner-Whitehouse 3 เทียบเกณฑ์เด็กไทย" },
      ]
    : [
        { model: "DeepLabV3", title: "Isolate the hand", body: "Resize to 512×512 grayscale and strip the background to the hand structure only, cutting noise before analysis." },
        { model: "YOLOv11", title: "Extract 3 bone regions", body: "Precisely crop the wrist (Carpals), fingers (Phalanges), and forearm joint (Radius/Ulna)." },
        { model: "ConvNeXt Tiny", title: "Assess bone age", body: "Takes the 3 ROIs + sex, pre-trained on RSNA and fine-tuned on the Digital Hand Atlas, returns bone age in months." },
        { model: "Variance Reg. + Balanced Sampling", title: "Debias across ethnicities", body: "Partial fine-tuning that penalizes the model when any ethnicity's error drifts from the rest, forcing error to stay close across all groups." },
        { model: "Grad-CAM · TW3", title: "Explain + forecast height", body: "Builds a heatmap of where the model looked, then forecasts adult height via Tanner-Whitehouse 3 against Thai growth standards." },
      ];

  const n = steps.length;
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const set = (i: number) => setActive(Math.max(0, Math.min(n - 1, i)));
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setWebgl(hasWebGL());
  }, []);

  // Fade only — no scale/transform. The hand fades in as it nears the centre of
  // the viewport and fades out as it leaves (both directions). Rotatable while
  // it's in focus (near full opacity).
  useEffect(() => {
    const el = modelRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1"; return;
    }
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const dist = Math.abs((r.top + r.height / 2) - vh / 2) / vh; // 0 when centred
      const lin = Math.max(0, Math.min(1, 1 - dist / 0.42));        // fade starts right off centre
      el.style.opacity = Math.pow(lin, 1.7).toFixed(3);             // sharper, more pronounced fade
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [mounted]);

  const output = th
    ? [{ k: "อายุกระดูก", v: "8y4m" }, { k: "มั่นใจ", v: "96%" }, { k: "สูงคาด", v: "172cm" }, { k: "เปอร์เซนไทล์", v: "P60" }, { k: "ภาวะ", v: "ปกติ" }, { k: "เที่ยงตรง", v: "✓" }]
    : [{ k: "bone age", v: "8y4m" }, { k: "conf", v: "96%" }, { k: "FAH", v: "172cm" }, { k: "pct", v: "P60" }, { k: "status", v: "Normal" }, { k: "fair", v: "✓" }];

  return (
    <div className="mx-auto max-w-6xl w-full grid lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-10 items-center"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowRight") set(active + 1); if (e.key === "ArrowLeft") set(active - 1); }}
      role="group" aria-roledescription="carousel" aria-label={th ? "ขั้นตอนการวิเคราะห์ของ AI" : "AI analysis steps"}>

      {/* ── Left: 3D model (height-capped so it never overflows) ──── */}
      <div className="flex flex-col items-center min-w-0">
        <div ref={modelRef} data-aihand className="relative w-full" style={{ maxWidth: "min(100%, 91vh)", willChange: "opacity" }}>
          <div className="relative w-full aspect-square">
            {mounted && webgl ? <AiHandModel step={active} interactive th={th} /> : mounted ? <ModelFallback step={active} th={th} /> : <ModelSkeleton />}
          </div>
          <p className="text-center font-body text-[11px] text-white/40 mt-1">{th ? "ลากเพื่อหมุน · ←/→ เปลี่ยนขั้นตอน" : "Drag to rotate · ←/→ to step"}</p>
        </div>
      </div>

      {/* ── Right: vertical pipeline stepper (accordion) ──────────── */}
      <div className="flex flex-col gap-2 min-w-0">
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <button key={i} onClick={() => set(i)} aria-current={on}
              className="group w-full text-left rounded-2xl border transition-all duration-300"
              style={{
                borderColor: on ? "rgba(56,189,248,0.5)" : "rgba(56,189,248,0.14)",
                background: on ? "rgba(56,189,248,0.08)" : "rgba(8,20,34,0.35)",
              }}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="shrink-0 w-7 h-7 rounded-full grid place-items-center font-display font-bold text-[13px] tabular-nums transition-all"
                  style={on
                    ? { background: "linear-gradient(135deg,#0EA5E9,#38BDF8)", color: "#fff", boxShadow: "0 4px 12px rgba(56,189,248,0.4)" }
                    : { border: "1px solid rgba(125,211,252,0.3)", color: "#7dd3fc" }}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(56,189,248,0.12)", color: "#7dd3fc", border: "1px solid rgba(56,189,248,0.22)" }}>{s.model}</span>
                  <h3 className="font-display font-semibold text-white truncate mt-1" style={{ fontSize: "0.98rem", letterSpacing: "-0.01em" }}>{s.title}</h3>
                </div>
                <svg viewBox="0 0 24 24" className={`w-4 h-4 shrink-0 transition-transform duration-300 ${on ? "rotate-90" : ""}`}
                  fill="none" stroke="#7dd3fc" strokeWidth={2.2} style={{ opacity: on ? 1 : 0.4 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                </svg>
              </div>
              {/* expanded detail for the active step */}
              <div className="grid transition-all duration-300" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
                <div className="overflow-hidden">
                  <div className="px-3 pb-3 pl-[3.25rem]">
                    <p className="font-body text-[13px] leading-relaxed" style={{ color: "rgba(203,213,225,0.85)" }}>{s.body}</p>
                    <div className="mt-3"><StepData i={i} th={th} /></div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* ── Final output strip ─────────────────────────────────── */}
        <div className="mt-1 rounded-2xl px-3 py-2.5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(52,211,153,0.25)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34D399" }} />
            <span className="font-display font-bold text-[10px] tracking-wide uppercase" style={{ color: "#6ee7b7" }}>{th ? "ผลลัพธ์สุดท้าย" : "Final Output"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {output.map((o) => (
              <span key={o.k} className="inline-flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: "rgba(8,20,34,0.5)", border: "1px solid rgba(56,189,248,0.16)" }}>
                <span className="font-body text-[9px]" style={{ color: "rgba(148,163,184,0.85)" }}>{o.k}</span>
                <span className="font-display font-bold text-white text-[11px] tabular-nums">{o.v}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
