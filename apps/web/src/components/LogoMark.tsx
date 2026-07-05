"use client";

export function LogoMark({ scrolled = false }: { scrolled?: boolean }) {
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
      style={
        scrolled
          ? {
              background: "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))",
              boxShadow: "0 4px 14px rgba(14,165,233,0.4)",
            }
          : {
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
            }
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </div>
  );
}
