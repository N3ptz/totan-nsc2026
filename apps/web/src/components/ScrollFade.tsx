"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";

/**
 * ห่อรายการที่ยาว — ถ้า enabled จะ scroll ได้ภายใน maxHeight
 * พร้อม fade บน/ล่างแบบรู้ตำแหน่ง scroll (มีเนื้อหาด้านไหนซ่อนอยู่ ก็ fade ด้านนั้น)
 * ใช้ mask-image จึงไม่ต้อง match สีพื้นหลัง — ทำงานบนพื้น glass/โปร่งแสงได้สวย
 */
export function ScrollFade({
  children,
  enabled = true,
  maxHeight = 360,
  className = "",
}: {
  children: ReactNode;
  enabled?: boolean;
  maxHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fadeTop, setFadeTop] = useState(false);
  const [fadeBottom, setFadeBottom] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setFadeTop(el.scrollTop > 4);
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, enabled, maxHeight]);

  if (!enabled) return <>{children}</>;

  const topStop = fadeTop ? "transparent 0, #000 24px" : "#000 0";
  const bottomStop = fadeBottom ? "#000 calc(100% - 28px), transparent 100%" : "#000 100%";
  const mask = `linear-gradient(to bottom, ${topStop}, ${bottomStop})`;

  return (
    <div
      ref={ref}
      onScroll={update}
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight, WebkitMaskImage: mask, maskImage: mask }}
    >
      {children}
    </div>
  );
}
