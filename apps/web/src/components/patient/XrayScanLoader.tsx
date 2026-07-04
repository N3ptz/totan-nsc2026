"use client";

import { MascotBot } from "@/components/MascotBot";

export function XrayScanLoader({ th }: { th: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 border-b border-border/40">
      <div className="relative flex items-center gap-5">
        {/* X-ray hand silhouette box */}
        <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden"
          style={{ background: "rgb(var(--primary)/0.04)" }}>
          <svg className="w-12 h-12 opacity-20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="28" width="8" height="16" rx="4" fill="rgb(var(--primary))" />
            <rect x="8"  y="22" width="6"  height="12" rx="3" fill="rgb(var(--primary))" />
            <rect x="14" y="18" width="6"  height="14" rx="3" fill="rgb(var(--primary))" />
            <rect x="28" y="18" width="6"  height="14" rx="3" fill="rgb(var(--primary))" />
            <rect x="34" y="22" width="6"  height="12" rx="3" fill="rgb(var(--primary))" />
            <rect x="10" y="32" width="28" height="8"  rx="4" fill="rgb(var(--primary))" />
          </svg>
          <div className="absolute inset-x-0 h-0.5 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgb(var(--primary)) 50%, transparent 100%)",
              boxShadow: "0 0 6px rgb(var(--primary))",
              animation: "mascot-scan-line 1.4s ease-in-out infinite",
            }} />
        </div>
        <MascotBot size="xs" variant="scanning" />
      </div>
      <p className="font-body text-sm font-semibold text-primary animate-pulse">
        {th ? "AI กำลังวิเคราะห์ภาพ X-ray..." : "AI is analysing the X-ray…"}
      </p>
    </div>
  );
}
