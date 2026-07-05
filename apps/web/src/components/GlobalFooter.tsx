"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { LogoMark } from "@/components/LogoMark";

// ── Icons ──────────────────────────────────────────────────────────────────────
function ScaleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M12 3v18M3 7l9 4 9-4M3 17l9 4 9-4" />
      <path d="M3 7c0 2.5 2 4.5 4.5 4.5S12 9.5 12 7M12 7c0 2.5 2 4.5 4.5 4.5S21 9.5 21 7" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export function GlobalFooter() {
  const { lang, toggle: toggleLang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const th = lang === "th";

  const disclaimerLabel = th ? "ข้อตกลงในการใช้ซอฟต์แวร์" : "License Agreement";
  const tagline = th
    ? "ระบบประเมินอายุกระดูกและติดตามการเจริญเติบโตสำหรับเด็กไทย"
    : "Bone age assessment and growth monitoring for Thai children";

  return (
    <footer
      role="contentinfo"
      className="border-t border-border/60 bg-bg"
    >
      <div className="max-w-6xl mx-auto px-6 py-5">

        {/* ── Main row ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <LogoMark scrolled />
            <span className="font-display font-bold text-sm text-ink">โตทัน</span>
            <span className="font-body text-xs text-muted hidden sm:inline">
              · NSC 2026 · Mahidol University
            </span>
          </div>

          {/* Disclaimer link — centrepiece */}
          <Link
            href="/disclaimer"
            aria-label={disclaimerLabel}
            className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/70 font-body text-xs font-semibold text-muted transition-all duration-200 hover:text-primary hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            lang={th ? "th" : "en"}
          >
            <ScaleIcon />
            <span className="transition-colors">{disclaimerLabel}</span>
            {/* Subtle arrow that appears on hover */}
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
              className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={toggleLang}
              aria-label={th ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              className="font-body text-xs font-semibold text-muted hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/8"
            >
              {th ? "EN" : "ไทย"}
            </button>
            <span className="text-border/60" aria-hidden>·</span>
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/8"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        {/* ── Bottom: tagline + legal note ──────────────────────────────── */}
        <div className="mt-4 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <p className="font-body text-[11px] text-muted/70 text-center sm:text-left">
            {tagline}
          </p>
          <p className="font-body text-[11px] text-muted/50 text-center sm:text-right flex-shrink-0">
            © {new Date().getFullYear()} โตทัน &nbsp;·&nbsp; Non-commercial &nbsp;·&nbsp; Educational use only
          </p>
        </div>

      </div>
    </footer>
  );
}
