"use client";

/**
 * HeroHand — plain (2D) hero visual: the real hand X-ray styled as a glowing
 * hologram (black background dropped via screen blend on the dark hero), with a
 * sweeping scan line, pulsing growth-plate landmark dots, and floating data
 * callouts. No WebGL — the interactive 3D model now lives in the AI section.
 */

import { useEffect, useRef, useState } from "react";

// landmark dots over the real joints, in % of the image frame (tune visually)
const LANDMARKS = [
  { x: "30%", y: "35%", c: "#FB8E5E" }, { x: "42%", y: "29%", c: "#FB8E5E" },
  { x: "54%", y: "28%", c: "#FB8E5E" }, { x: "65%", y: "31%", c: "#FB8E5E" },
  { x: "37%", y: "22%", c: "#67E8F9" }, { x: "49%", y: "18%", c: "#67E8F9" },
  { x: "60%", y: "18%", c: "#67E8F9" }, { x: "44%", y: "60%", c: "#67E8F9" },
];

export default function HeroHand({ lang }: { lang: string }) {
  const th = lang === "th";
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);

  // Scroll focus: full size when centred in the viewport, shrinks + fades as it
  // scrolls away.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const k = Math.min(1, Math.abs((r.top + r.height / 2) - vh / 2) / vh);
      el.style.transform = `scale(${1 - 0.45 * k})`;
      el.style.opacity = `${Math.max(0, 1 - 1.2 * k)}`;
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [mounted]);

  return (
    <div ref={ref} className="relative w-full mx-auto" style={{ maxWidth: 460, aspectRatio: "5 / 6", willChange: "transform, opacity" }}>
      {/* platform + halo glow */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[8%] w-[78%] h-[24%] rounded-[50%] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(56,189,248,0.45), transparent 70%)" }} />
      <div className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 44%, rgba(56,189,248,0.18), transparent 60%)" }} />

      {/* the X-ray image (black bg dropped via screen blend) */}
      <div className="absolute inset-0 overflow-hidden animate-float-soft">
        <img src="/Hand-nobg.png" alt={th ? "ภาพถ่ายรังสีมือเด็ก" : "Pediatric hand X-ray"}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ filter: "sepia(0.5) hue-rotate(160deg) saturate(2.4) brightness(1.12) drop-shadow(0 0 22px rgba(56,189,248,0.4))" }} />

        {/* sweeping scan line */}
        {mounted && (
          <div className="absolute left-[12%] right-[12%] h-10 pointer-events-none"
            style={{ background: "linear-gradient(rgba(103,232,249,0.55), transparent)", animation: "scan-line 4s ease-in-out infinite", borderTop: "1px solid rgba(103,232,249,0.8)" }} />
        )}

        {/* growth-plate landmark dots */}
        {mounted && LANDMARKS.map((l, i) => (
          <span key={i} className="absolute flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2" style={{ left: l.x, top: l.y }}>
            <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: l.c, animationDelay: `${i * 0.3}s` }} />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: l.c, boxShadow: `0 0 8px ${l.c}` }} />
          </span>
        ))}
      </div>

      {/* floating data callouts */}
      <Callout className="top-[10%] left-[2%]" tone="cyan" delay="0.3s" title={th ? "กำลังสแกน" : "AI scanning"} value={th ? "วิเคราะห์อยู่…" : "analyzing…"} live />
      <Callout className="top-[40%] right-[0%]" tone="sky" delay="0.55s" title={th ? "อายุกระดูก" : "Bone age"} value="8y 4m" />
      <Callout className="bottom-[16%] left-[0%]" tone="coral" delay="0.8s" title={th ? "ความเชื่อมั่น" : "Confidence"} value="96%" />
    </div>
  );
}

function Callout({ className = "", tone, title, value, delay = "0s", live = false }:
  { className?: string; tone: "cyan" | "sky" | "coral"; title: string; value: string; delay?: string; live?: boolean }) {
  const c = {
    cyan: { dot: "#22D3EE", ring: "rgba(34,211,238,0.4)" },
    sky: { dot: "#38BDF8", ring: "rgba(56,189,248,0.4)" },
    coral: { dot: "#FB8E5E", ring: "rgba(251,142,94,0.4)" },
  }[tone];
  return (
    <div className={`absolute ${className} animate-fade-up pointer-events-none select-none`} style={{ animationDelay: delay, animationFillMode: "both" }}>
      <div className="flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 rounded-2xl"
        style={{ background: "rgba(8,20,34,0.62)", border: `1px solid ${c.ring}`, backdropFilter: "blur(12px)", boxShadow: "0 8px 28px rgba(2,12,24,0.4)" }}>
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          {live && <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: c.dot }} />}
          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: c.dot }} />
        </span>
        <div className="leading-tight">
          <p className="font-body text-[10px] text-white/55">{title}</p>
          <p className="font-display font-semibold text-white text-[13px] tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}
