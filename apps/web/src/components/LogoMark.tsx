"use client";

/* โลโก้โตทัน — บนพื้นเข้ม (hero ยังไม่ scroll) รองด้วยกล่องขาวให้เด่น,
   บนพื้นสว่าง (scrolled/footer) วางโลโก้ตรงๆ */
export function LogoMark({ scrolled = false }: { scrolled?: boolean }) {
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
      style={
        scrolled
          ? undefined
          : {
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.4)",
              boxShadow: "0 4px 14px rgba(14,165,233,0.25)",
            }
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tohtan_bgremover.png"
        alt="โตทัน"
        className={scrolled ? "w-8 h-8 object-contain" : "w-6 h-6 object-contain"}
      />
    </div>
  );
}
