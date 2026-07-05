import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "ข้อตกลงการใช้ซอฟต์แวร์ | License Agreement — โตทัน",
  description:
    "ข้อตกลงในการใช้ซอฟต์แวร์โตทัน / License Agreement for the โตทัน bone age assessment system.",
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* ── Top nav bar ──────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 border-b border-border/60 glass" aria-label="Page navigation">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-muted hover:text-primary transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg px-1"
            aria-label="Back to home"
          >
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
              className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>หน้าแรก</span>
          </Link>

          {/* Breadcrumb divider */}
          <span className="text-border" aria-hidden>·</span>

          {/* Current page */}
          <div className="flex items-center gap-2 min-w-0">
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              className="w-4 h-4 flex-shrink-0 text-primary"
            >
              <path d="M12 3v18M3 7l9 4 9-4M3 17l9 4 9-4" />
              <path d="M3 7c0 2.5 2 4.5 4.5 4.5S12 9.5 12 7M12 7c0 2.5 2 4.5 4.5 4.5S21 9.5 21 7" />
            </svg>
            <h1 className="font-display font-bold text-sm text-ink truncate">
              <span lang="th">ข้อตกลงการใช้ซอฟต์แวร์</span>
              <span className="text-muted font-body font-normal mx-1.5" aria-hidden>/</span>
              <span lang="en">License Agreement</span>
            </h1>
          </div>
        </div>
      </nav>

      {/* ── Disclaimer content ───────────────────────────────────────────── */}
      <main id="main-content" className="flex-1">
        <Disclaimer />
      </main>

    </div>
  );
}
