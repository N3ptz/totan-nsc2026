"use client";

import {
  createContext, useContext, useState, useEffect, useLayoutEffect,
  useCallback, useRef, ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useI18n, Lang } from "@/lib/i18n";
import { HippoMascot } from "@/components/3d/BotModel";

// ── Types ──────────────────────────────────────────────────────────────────────
interface TourStep {
  selector:   string;
  title:      { th: string; en: string };
  body:       { th: string; en: string };
  placement?: "top" | "bottom" | "left" | "right" | "auto";
}

interface SpotRect { top: number; left: number; width: number; height: number }
type Placement = "top" | "bottom" | "left" | "right";

interface TourCtx {
  start:           () => void;
  stop:            () => void;
  isActive:        boolean;
  isWelcomeActive: boolean;
}

// ── Localized UI strings ───────────────────────────────────────────────────────
const UI: Record<Lang, {
  prev: string; skip: string; next: string; done: string; btn: string; aria: string;
  welcomeEyebrow: string; welcomeTitle: string; welcomeBody: string;
  welcomeSteps: string; welcomeStart: string; welcomeSkip: string; welcomeHint: string;
}> = {
  th: {
    prev: "← ก่อนหน้า", skip: "ข้าม", next: "ถัดไป →", done: "เสร็จสิ้น ✓",
    btn: "คู่มือการใช้", aria: "เริ่ม Tutorial",
    welcomeEyebrow: "เริ่มต้นใช้งาน",
    welcomeTitle:   "ยินดีต้อนรับสู่ โตทัน 👋",
    welcomeBody:    "มาทำความรู้จักกับระบบในเวลาเพียง 1 นาที ทัวร์แบบ interactive จะนำคุณผ่านฟีเจอร์หลักของ Dashboard",
    welcomeSteps:   "5 ขั้นตอน · ประมาณ 1 นาที",
    welcomeStart:   "เริ่มทัวร์ →",
    welcomeSkip:    "ข้ามไปก่อน",
    welcomeHint:    "กด Enter เพื่อเริ่ม · Esc เพื่อข้าม",
  },
  en: {
    prev: "← Back", skip: "Skip", next: "Next →", done: "Finish ✓",
    btn: "Tutorial", aria: "Start Tutorial",
    welcomeEyebrow: "Getting Started",
    welcomeTitle:   "Welcome to โตทัน 👋",
    welcomeBody:    "Get familiar with the system in just 1 minute. An interactive tour will walk you through the key features of your Dashboard.",
    welcomeSteps:   "5 steps · ~1 minute",
    welcomeStart:   "Start Tour →",
    welcomeSkip:    "Skip for now",
    welcomeHint:    "Press Enter to start · Esc to skip",
  },
};

// ── Bilingual step definitions ─────────────────────────────────────────────────
const LANDING_STEPS: TourStep[] = [
  {
    selector: "#hero-heading",
    title: { th: "ยินดีต้อนรับสู่ โตทัน 👋", en: "Welcome to โตทัน 👋" },
    body: {
      th: "ระบบ AI ประเมินอายุกระดูกสำหรับเด็กไทย ตามมาตรฐาน Greulich & Pyle ใช้เวลาเพียง 30 วินาทีต่อเคส",
      en: "AI bone age assessment for Thai children — Greulich & Pyle standard, 30 seconds per case.",
    },
    placement: "bottom",
  },
  {
    selector: "[data-tour='lang-toggle']",
    title: { th: "สลับภาษา", en: "Language Toggle" },
    body: {
      th: "กดปุ่มนี้เพื่อสลับระหว่างภาษาไทยและภาษาอังกฤษ ข้อความทั่วทั้งเว็บจะเปลี่ยนทันที",
      en: "Press this to switch between Thai and English. All text across the site updates instantly.",
    },
    placement: "bottom",
  },
  {
    selector: "[data-tour='nav-cta']",
    title: { th: "เริ่มใช้งานฟรี", en: "Get Started Free" },
    body: {
      th: "คลิกเพื่อเข้าสู่ระบบหรือสมัครสมาชิก รองรับทั้งแพทย์เด็กและผู้ปกครอง ไม่มีค่าใช้จ่าย",
      en: "Click to sign in or register. Available for pediatricians and parents — no cost.",
    },
    placement: "bottom",
  },
  {
    selector: "#how",
    title: { th: "ขั้นตอนการใช้งาน 3 ขั้น", en: "3-Step Workflow" },
    body: {
      th: "อัปโหลด X-ray → AI วิเคราะห์อัตโนมัติ → รับผลและส่งให้ผู้ปกครอง ง่ายและรวดเร็ว",
      en: "Upload X-ray → AI auto-analyzes → receive results and notify parents. Simple and fast.",
    },
    placement: "top",
  },
];

// Shared across every /dashboard* route regardless of role (all live in dashboard/layout.tsx)
const DASHBOARD_SHARED_STEPS: TourStep[] = [
  {
    selector: "[data-tour='logo']",
    title: { th: "โตทัน Dashboard", en: "โตทัน Dashboard" },
    body: {
      th: "คุณอยู่ใน Dashboard ศูนย์กลางจัดการผู้ป่วยและผลประเมิน คลิกโลโก้เพื่อกลับหน้าแรกเสมอ",
      en: "You're in the Dashboard — the hub for patient management and assessments. Click the logo to return home.",
    },
    placement: "right",
  },
  {
    selector: "[data-tour='user-card']",
    title: { th: "โปรไฟล์และบทบาทของคุณ", en: "Your Profile & Role" },
    body: {
      th: "แสดงชื่อและบทบาทของคุณ (แพทย์ ผู้ปกครอง หรือผู้ดูแลระบบ) เมนูและสิทธิ์การเข้าถึงจะปรับตามบทบาทโดยอัตโนมัติ",
      en: "Shows your name and role (Doctor, Parent, or Admin). Menu items and permissions adapt automatically to your role.",
    },
    placement: "right",
  },
  {
    selector: "[data-tour='nav']",
    title: { th: "เมนูนำทางหลัก", en: "Main Navigation" },
    body: {
      th: "เมนูจะปรับตามบทบาท: แพทย์เห็นผู้ป่วยและรายงาน PDF, ผู้ปกครองเห็นบุตรหลานและคำแนะนำ, ผู้ดูแลระบบเห็นภาพรวมระบบทั้งหมด",
      en: "The menu adapts to your role: Doctors see Patients and PDF Reports, Parents see Children and Recommendations, Admins see the full system overview.",
    },
    placement: "right",
  },
];

// Doctor / Parent overview page only (/dashboard)
const DOCTOR_PARENT_STEPS: TourStep[] = [
  {
    selector: "[data-tour='stats']",
    title: { th: "ภาพรวมกิจกรรม", en: "Activity Overview" },
    body: {
      th: "สถิติแบบ real-time: จำนวนผู้ป่วย, การประเมินวันนี้, รายการรอดำเนินการ และคำแนะนำล่าสุด",
      en: "Real-time stats: total patients, today's assessments, pending items, and latest recommendations.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='patient-list']",
    title: { th: "รายชื่อผู้ป่วย / บุตรหลาน", en: "Patient / Children List" },
    body: {
      th: "คลิกชื่อเพื่อดูประวัติ X-ray, ผลประเมินอายุกระดูก, กราฟการเจริญเติบโตเทียบมาตรฐาน WHO และคำแนะนำทางคลินิก",
      en: "Click a name to view X-ray history, bone age results, a WHO growth chart, and clinical guidance.",
    },
    placement: "top",
  },
];

// Admin overview page only (/dashboard/admin)
const ADMIN_STEPS: TourStep[] = [
  {
    selector: "[data-tour='admin-services']",
    title: { th: "สถานะระบบแบบ Real-time", en: "Real-Time System Health" },
    body: {
      th: "ตรวจสอบสถานะจริงของทุก microservice (Auth, Patient, AI, Notify) พร้อมเวลาตอบสนอง อัปเดตอัตโนมัติทุก 30 วินาที",
      en: "Live status for every microservice (Auth, Patient, AI, Notify) with real response latency, auto-refreshed every 30 seconds.",
    },
    placement: "top",
  },
  {
    selector: "[data-tour='admin-analytics']",
    title: { th: "สถิติแพลตฟอร์ม (ข้อมูลจริง)", en: "Platform Analytics (Real Data)" },
    body: {
      th: "ตัวเลขทั้งหมดดึงจากฐานข้อมูลจริง คลิกการ์ด 'การสแกน', 'แพทย์' หรือ 'ผู้ปกครอง' เพื่อดูรายชื่อทั้งหมดแบบละเอียด",
      en: "Every number here is pulled from the live database. Click the Scans, Doctors, or Parents card to view the full detailed list.",
    },
    placement: "top",
  },
];

// ── Context ────────────────────────────────────────────────────────────────────
const TourContext = createContext<TourCtx>({
  start: () => {}, stop: () => {}, isActive: false, isWelcomeActive: false,
});
export function useTour() { return useContext(TourContext); }

// ── Positioning helpers ────────────────────────────────────────────────────────
const TW  = 320;
const TTH = 220;  // increased from 180 to handle longer Thai text
const GAP = 14;
const PAD = 10;

function bestPlacement(r: SpotRect, hint?: TourStep["placement"]): Placement {
  if (hint && hint !== "auto") return hint as Placement;
  const { innerWidth: vw, innerHeight: vh } = window;
  const space: Record<Placement, number> = {
    right:  vw - (r.left + r.width) - PAD,
    left:   r.left - PAD,
    bottom: vh - (r.top + r.height) - PAD,
    top:    r.top - PAD,
  };
  const need: Record<Placement, number> = { right: TW, left: TW, bottom: TTH, top: TTH };
  for (const p of ["right", "bottom", "left", "top"] as Placement[]) {
    if (space[p] >= need[p]) return p;
  }
  return "bottom";
}

function tooltipPos(r: SpotRect, p: Placement): { top: number; left: number } {
  const { innerWidth: vw, innerHeight: vh } = window;
  let t = 0, l = 0;
  switch (p) {
    case "right":  t = r.top + r.height / 2 - TTH / 2; l = r.left + r.width + GAP; break;
    case "left":   t = r.top + r.height / 2 - TTH / 2; l = r.left - TW - GAP;      break;
    case "bottom": t = r.top + r.height + GAP;           l = r.left + r.width / 2 - TW / 2; break;
    case "top":    t = r.top - TTH - GAP;                l = r.left + r.width / 2 - TW / 2; break;
  }
  return {
    top:  Math.max(PAD, Math.min(t, vh - TTH - PAD)),
    left: Math.max(PAD, Math.min(l, vw - TW  - PAD)),
  };
}

// ── WelcomeGate — pre-tour splash modal ───────────────────────────────────────
function WelcomeGate({
  lang, steps, onStart, onSkip,
}: { lang: Lang; steps: TourStep[]; onStart: () => void; onSkip: () => void }) {
  // Mark as seen immediately so intra-session navigation doesn't re-trigger
  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("dashTourSeen", "1");
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStart(); }
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart, onSkip]);

  const ui = UI[lang];

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9998 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px]"
        onClick={onSkip}
        aria-hidden
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ui.welcomeTitle}
        className="relative glass-strong rounded-3xl p-8 shadow-2xl animate-welcome-in"
        style={{
          width: 360,
          zIndex: 9999,
          boxShadow: "0 32px 80px -16px rgb(0 0 0 / 0.55), 0 0 0 1px rgb(var(--primary) / 0.20), inset 0 1px 0 rgb(255 255 255 / 0.12)",
        }}
      >
        {/* Ambient glow behind icon */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-50"
          style={{ background: "radial-gradient(circle, rgb(var(--primary)) 0%, transparent 70%)" }}
        />

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg animate-float"
            style={{
              background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))",
              boxShadow: "0 8px 28px rgb(var(--primary)/0.45)",
            }}
          >
            🤖
          </div>
        </div>

        {/* Eyebrow */}
        <p className="text-center font-body text-[11px] font-semibold tracking-widest uppercase text-primary mb-2">
          {ui.welcomeEyebrow}
        </p>

        {/* Title */}
        <h2 className="text-center font-display font-bold text-[18px] text-ink leading-snug mb-3">
          {ui.welcomeTitle}
        </h2>

        {/* Body */}
        <p className="text-center font-body text-[13px] text-muted leading-relaxed mb-6">
          {ui.welcomeBody}
        </p>

        {/* Step count badge */}
        <div className="flex justify-center mb-5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-body font-semibold"
            style={{ background: "rgb(var(--primary)/0.10)", color: "rgb(var(--primary))" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {ui.welcomeSteps}
          </span>
        </div>

        {/* Progress pill preview */}
        <div className="flex justify-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`inline-block rounded-full ${i === 0 ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border"}`}
            />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onStart}
            className="relative flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl font-body font-semibold text-sm text-white overflow-hidden transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))",
              boxShadow: "0 6px 24px rgb(var(--primary)/0.42)",
            }}
          >
            <span className="shine relative z-10">{ui.welcomeStart}</span>
          </button>
          <button
            onClick={onSkip}
            className="w-full px-5 py-2.5 rounded-xl font-body font-medium text-sm text-muted hover:text-ink hover:bg-ink/[0.06] transition-colors"
          >
            {ui.welcomeSkip}
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center font-body text-[10px] text-muted/60 mt-4">
          {ui.welcomeHint}
        </p>
      </div>
    </div>,
    document.body
  );
}

// ── TourOverlay ────────────────────────────────────────────────────────────────
function TourOverlay({
  steps, stepIndex, lang, onNext, onPrev, onClose,
}: {
  steps:     TourStep[];
  stepIndex: number;
  lang:      Lang;
  onNext:    () => void;
  onPrev:    () => void;
  onClose:   () => void;
}) {
  const step   = steps[stepIndex];
  const ui     = UI[lang];
  const isLast = stepIndex === steps.length - 1;

  const [spot,  setSpot]  = useState<SpotRect | null>(null);
  const [place, setPlace] = useState<Placement>("bottom");
  const [ttPos, setTtPos] = useState({ top: 0, left: 0 });
  const roRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) return;
    const r    = el.getBoundingClientRect();
    const rect = { top: r.top, left: r.left, width: r.width, height: r.height };
    const p    = bestPlacement(rect, step.placement);
    setSpot(rect);
    setPlace(p);
    setTtPos(tooltipPos(rect, p));
  }, [step]);

  useLayoutEffect(() => {
    measure();
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) return;
    roRef.current?.disconnect();
    roRef.current = new ResizeObserver(measure);
    roRef.current.observe(el);
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true, capture: true });
    return () => {
      roRef.current?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
    };
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")                          onClose();
      if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      if (e.key === "ArrowLeft")                       onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onPrev, onClose]);

  const arrowClass: Record<Placement, string> = {
    right:  "right-full top-1/2 -translate-y-1/2",
    left:   "left-full  top-1/2 -translate-y-1/2",
    bottom: "bottom-full left-1/2 -translate-x-1/2",
    top:    "top-full   left-1/2 -translate-x-1/2",
  };
  const arrowBorder: Record<Placement, string> = {
    right:  "border-r-[10px] border-r-transparent border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-l-[10px]",
    left:   "border-l-[10px] border-l-transparent border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent border-r-[10px]",
    bottom: "border-b-[10px] border-b-transparent border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px]",
    top:    "border-t-[10px] border-t-transparent border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[10px]",
  };

  return createPortal(
    <>
      {/* Click-away to close */}
      <div
        className="fixed inset-0 cursor-pointer"
        style={{ zIndex: 9990 }}
        onClick={onClose}
        aria-hidden
      />

      {/* Spotlight with pulsing glow border */}
      {spot && (
        <div
          className="pointer-events-none fixed rounded-xl"
          style={{
            zIndex:     9991,
            top:        spot.top    - 6,
            left:       spot.left   - 6,
            width:      spot.width  + 12,
            height:     spot.height + 12,
            border:     "2px solid rgb(var(--primary))",
            boxShadow:  "0 0 0 9999px rgba(0,0,0,0.72)",
            animation:  "spotlight-glow 2.4s ease-in-out infinite",
            transition: "top 0.3s cubic-bezier(0.16,1,0.3,1), left 0.3s cubic-bezier(0.16,1,0.3,1), width 0.3s cubic-bezier(0.16,1,0.3,1), height 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          {/* Corner accents */}
          <span className="absolute -top-px -left-px  w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-[10px]" />
          <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-[10px]" />
          <span className="absolute -bottom-px -left-px  w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-[10px]" />
          <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-[10px]" />
        </div>
      )}

      {/* Tooltip */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={`${ui.aria}: ${stepIndex + 1} / ${steps.length}`}
        className="fixed glass-strong rounded-2xl p-5 shadow-2xl animate-step-in"
        style={{
          zIndex: 9997,
          width:  TW,
          ...ttPos,
          transition: "top 0.3s cubic-bezier(0.16,1,0.3,1), left 0.3s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 24px 64px -16px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(var(--primary) / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.10)",
        }}
      >
        {/* Directional arrow */}
        <span
          aria-hidden
          className={`absolute pointer-events-none w-0 h-0 ${arrowClass[place]} ${arrowBorder[place]}`}
          style={{
            borderLeftColor:   place === "right"  ? "rgb(var(--glass))" : undefined,
            borderRightColor:  place === "left"   ? "rgb(var(--glass))" : undefined,
            borderTopColor:    place === "bottom" ? "rgb(var(--glass))" : undefined,
            borderBottomColor: place === "top"    ? "rgb(var(--glass))" : undefined,
          }}
        />

        {/* Progress pills */}
        <div className="flex items-center gap-1.5 mb-3.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`inline-block rounded-full transition-all duration-300 ${
                i === stepIndex ? "w-5 h-1.5 bg-primary"
                : i < stepIndex ? "w-1.5 h-1.5 bg-primary/50"
                : "w-1.5 h-1.5 bg-border"
              }`}
            />
          ))}
          <span className="ml-auto font-body text-[10px] text-muted tabular-nums">
            {stepIndex + 1}&thinsp;/&thinsp;{steps.length}
          </span>
        </div>

        {/* Content */}
        <h3 className="font-display font-bold text-[13px] text-ink leading-snug mb-1.5">
          {step.title[lang]}
        </h3>
        <p className="font-body text-xs text-muted leading-relaxed mb-4">
          {step.body[lang]}
        </p>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button
              onClick={onPrev}
              className="flex-none px-3 py-1.5 rounded-lg text-xs font-body font-semibold text-muted hover:text-ink hover:bg-ink/8 transition-colors"
            >
              {ui.prev}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="flex-none px-3 py-1.5 rounded-lg text-xs font-body font-medium text-muted hover:text-danger transition-colors"
          >
            {ui.skip}
          </button>
          <button
            onClick={onNext}
            className="relative flex-none overflow-hidden flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-body font-semibold text-white transition-all hover:-translate-y-px active:scale-95"
            style={{
              background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))",
              boxShadow:  "0 4px 14px rgb(var(--primary)/0.40)",
            }}
          >
            <span className="shine relative z-10">
              {isLast ? ui.done : ui.next}
            </span>
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── TourButton — global FAB ────────────────────────────────────────────────────
function TourButton() {
  const { start, isActive, isWelcomeActive } = useTour();
  const { lang } = useI18n();
  const ui = UI[lang];
  // Hide when tour or welcome gate is already open
  if (isActive || isWelcomeActive) return null;
  return (
    <button
      onClick={start}
      title={ui.aria}
      aria-label={ui.aria}
      className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-body font-semibold text-white transition-all duration-300 hover:-translate-y-1 active:scale-95"
      style={{
        background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))",
        boxShadow:  "0 8px 28px rgb(var(--primary)/0.42)",
      }}
    >
      <svg
        className="w-4 h-4 flex-shrink-0 transition-transform group-hover:rotate-12"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
      {ui.btn}
    </button>
  );
}

// ── TourProvider ───────────────────────────────────────────────────────────────
// Cached role read (same localStorage shape dashboard/layout.tsx uses) — avoids
// waiting on an async /auth/me call just to pick which tour steps to show.
function getCachedRole(): string | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("user") || "{}").role ?? null; } catch { return null; }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive,     setIsActive]     = useState(false);
  const [stepIndex,    setStepIndex]    = useState(0);
  const [mounted,      setMounted]      = useState(false);
  const [showWelcome,  setShowWelcome]  = useState(false);
  const [role,         setRole]         = useState<string | null>(null);
  const { lang } = useI18n();
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setRole(getCachedRole()); }, [pathname]);

  // Route- and role-aware step set (3 shared steps + 2 role-specific ones = 5 either way)
  const steps = pathname.startsWith("/dashboard")
    ? [...DASHBOARD_SHARED_STEPS, ...(role === "admin" ? ADMIN_STEPS : DOCTOR_PARENT_STEPS)]
    : LANDING_STEPS;

  // Reset tour + welcome gate on navigation
  useEffect(() => {
    setIsActive(false);
    setStepIndex(0);
    setShowWelcome(false);
  }, [pathname]);

  // Auto-show welcome gate on each role's overview page, once per session
  useEffect(() => {
    if (!mounted) return;
    if (pathname !== "/dashboard" && pathname !== "/dashboard/admin") return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("dashTourSeen")) return;
    const timer = setTimeout(() => setShowWelcome(true), 700);
    return () => clearTimeout(timer);
  }, [mounted, pathname]);

  const stop = useCallback(() => {
    setIsActive(false);
    setStepIndex(0);
  }, []);

  const start = useCallback(() => {
    setShowWelcome(false);
    setStepIndex(0);
    setIsActive(true);
  }, []);

  // Skip steps whose target element doesn't exist on the current page
  const advanceOrStop = useCallback((idx: number) => {
    if (idx >= steps.length) { stop(); return; }
    if (!document.querySelector(steps[idx].selector)) { advanceOrStop(idx + 1); return; }
    setStepIndex(idx);
  }, [steps, stop]);

  const next = useCallback(() => advanceOrStop(stepIndex + 1), [stepIndex, advanceOrStop]);
  const prev = useCallback(() => setStepIndex(i => Math.max(0, i - 1)), []);

  return (
    <TourContext.Provider value={{ start, stop, isActive, isWelcomeActive: showWelcome }}>
      {children}

      {/* Mascot + Tutorial button — shared fixed container, mascot above as first sibling
          (ซ่อนบนหน้า login/register — ไม่มี tour ให้เล่นที่นั่น) */}
      {mounted && !isActive && !showWelcome && !pathname.startsWith("/login") && (
        <div
          className="fixed bottom-6 right-6 z-20 flex flex-col items-center gap-0 print:hidden"
        >
          <HippoMascot
            size="sm"
            message={lang === "th" ? "สวัสดีครับ! พร้อมช่วยติดตามการเติบโต" : "Hi! Ready to track growth"}
            className="mb-4"
          />
          <TourButton />
        </div>
      )}

      {mounted && showWelcome && (
        <WelcomeGate
          lang={lang}
          steps={steps}
          onStart={start}
          onSkip={() => setShowWelcome(false)}
        />
      )}

      {mounted && isActive && (
        <TourOverlay
          steps={steps}
          stepIndex={stepIndex}
          lang={lang}
          onNext={next}
          onPrev={prev}
          onClose={stop}
        />
      )}
    </TourContext.Provider>
  );
}
