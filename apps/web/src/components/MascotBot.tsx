"use client";

import { CSSProperties } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export type MascotVariant = "idle" | "thinking" | "scanning" | "success";
export type MascotSize    = "xs" | "sm" | "md" | "lg" | "xl";

interface MascotBotProps {
  variant?:   MascotVariant;
  size?:      MascotSize;
  /** Optional speech-bubble text */
  message?:   string;
  /** CSS colour override — defaults to rgb(var(--primary)) */
  color?:     string;
  className?: string;
  style?:     CSSProperties;
}

const PX: Record<MascotSize, number> = { xs: 36, sm: 52, md: 72, lg: 96, xl: 128 };

// ── Component ──────────────────────────────────────────────────────────────────
export function MascotBot({
  variant   = "idle",
  size      = "md",
  message,
  color,
  className = "",
  style,
}: MascotBotProps) {
  const px  = PX[size];
  const col = color ?? "rgb(var(--primary))";

  const outerAnim: CSSProperties =
    variant === "success"  ? { animation: "mascot-bounce-in 0.65s cubic-bezier(0.16,1,0.3,1) both" } :
    variant === "scanning" ? {}  :
    /* idle | thinking */    { animation: "mascot-float 3s ease-in-out infinite" };

  return (
    <div
      className={`relative inline-flex flex-col items-center gap-2 select-none ${className}`}
      style={{ ...outerAnim, ...style }}
      aria-hidden="true"
    >
      {/* Thinking dots */}
      {variant === "thinking" && (
        <div className="flex items-end gap-1 mb-0.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="rounded-full block"
              style={{
                width:     i === 2 ? 6 : i === 1 ? 5 : 4,
                height:    i === 2 ? 6 : i === 1 ? 5 : 4,
                background: col,
                opacity:   0.7,
                animation: `mascot-think-dot 1.1s ease-in-out ${i * 0.18}s infinite`,
              }} />
          ))}
        </div>
      )}

      {/* Bot wrapper — scan clip region */}
      <div className="relative" style={{ width: px, height: Math.round(px * 1.1) }}>

        {/* Ambient glow behind bot (opacity only — float handled by outer container) */}
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: col,
            filter:     `blur(${Math.round(px * 0.4)}px)`,
            opacity:    variant === "scanning" ? 0.18 : 0.12,
          }} />

        {/* Bot SVG body */}
        {/* TODO: swap <BotSVG> with <Canvas frameloop="demand"><GLBModel /></Canvas> here when .glb is ready */}
        <div style={{ width: px, height: Math.round(px * 1.1) }}>
          <BotSVG size={px} color={col} variant={variant} />
        </div>

        {/* Scan-line overlay — transform only, GPU compositor */}
        {variant === "scanning" && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ borderRadius: Math.round(px * 0.18) }}>
            <div style={{
              position:  "absolute",
              insetInline: 0,
              height:    2,
              background: `linear-gradient(90deg, transparent 0%, ${col} 50%, transparent 100%)`,
              boxShadow:  `0 0 6px ${col}`,
              animation:  "mascot-scan-line 1.4s ease-in-out infinite",
            }} />
          </div>
        )}

        {/* Success badge */}
        {variant === "success" && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgb(var(--success))", boxShadow: "0 2px 8px rgb(var(--success)/0.45)" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5.5 L4 8 L8.5 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Speech bubble */}
      {message && (
        <div className="relative px-3 py-1.5 rounded-xl text-center"
          style={{
            maxWidth:   Math.max(px + 60, 140),
            background: "rgb(var(--surface))",
            border:     `1.5px solid ${col}33`,
            boxShadow:  `0 4px 14px ${col}18`,
          }}>
          {/* Tail */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft:   "6px solid transparent",
              borderRight:  "6px solid transparent",
              borderBottom: `8px solid ${col}33`,
            }} />
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft:   "5px solid transparent",
              borderRight:  "5px solid transparent",
              borderBottom: "7px solid rgb(var(--surface))",
            }} />
          <p className="font-body text-[11px] font-semibold text-ink leading-snug whitespace-nowrap">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}

// ── SVG Robot (viewBox 0 0 64 70) ─────────────────────────────────────────────
function BotSVG({ size, color, variant }: { size: number; color: string; variant: MascotVariant }) {
  const eyeAnim: CSSProperties = {
    transformBox:    "fill-box",
    transformOrigin: "center",
    animation:       "mascot-blink 4s ease-in-out infinite",
  };
  const eye2Anim: CSSProperties = { ...eyeAnim, animationDelay: "0.22s" };

  const mouthPath =
    variant === "success"  ? "M 20 44 Q 32 53 44 44" :
    variant === "scanning" ? "M 22 44 L 42 44"        :
    /* idle | thinking */    "M 23 44 Q 32 50 41 44";

  return (
    <svg width={size} height={Math.round(size * 1.1)} viewBox="0 0 64 70" fill="none"
      xmlns="http://www.w3.org/2000/svg">

      {/* Ground shadow */}
      <ellipse cx="32" cy="68" rx="13" ry="2.5" fill={color} opacity="0.12" />

      {/* Antenna stem */}
      <line x1="32" y1="7" x2="32" y2="15" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {/* Antenna ball — inherits mascot-float from parent */}
      <circle cx="32" cy="4.5" r="3.5" fill={color} />
      <circle cx="32" cy="4.5" r="5.5" fill={color} opacity="0.18" />

      {/* Head */}
      <rect x="9" y="14" width="46" height="40" rx="13" fill={color} fillOpacity="0.1" />
      <rect x="9" y="14" width="46" height="40" rx="13" stroke={color} strokeWidth="2" />

      {/* Left eye white */}
      <circle cx="21.5" cy="30" r="7" fill="white" fillOpacity="0.92" />
      {/* Left pupil — blink via scaleY */}
      <circle cx="21.5" cy="30" r="3.8" fill={color} style={eyeAnim} />
      <circle cx="23.2" cy="28.2" r="1.6" fill="white" />

      {/* Right eye white */}
      <circle cx="42.5" cy="30" r="7" fill="white" fillOpacity="0.92" />
      {/* Right pupil */}
      <circle cx="42.5" cy="30" r="3.8" fill={color} style={eye2Anim} />
      <circle cx="44.2" cy="28.2" r="1.6" fill="white" />

      {/* Mouth */}
      <path d={mouthPath} stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none"
        opacity={variant === "scanning" ? 0.45 : 1} />

      {/* Medical cross on chest */}
      <rect x="28.5" y="17" width="7" height="2.2" rx="1.1" fill={color} fillOpacity="0.5" />
      <rect x="30.9" y="14.8" width="2.2" height="7" rx="1.1" fill={color} fillOpacity="0.5" />

      {/* Side arms */}
      <rect x="4" y="25" width="5" height="14" rx="2.5" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.2" />
      <rect x="55" y="25" width="5" height="14" rx="2.5" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.2" />

      {/* Chest panel divider */}
      <line x1="17" y1="40" x2="47" y2="40" stroke={color} strokeOpacity="0.2" strokeWidth="1" />
      <circle cx="32" cy="40" r="2" fill={color} fillOpacity="0.35" />
    </svg>
  );
}
