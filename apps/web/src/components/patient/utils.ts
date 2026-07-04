export function calcAge(dob: string) {
  const b = new Date(dob); const n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  if (n.getMonth() - b.getMonth() < 0 || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--;
  return y;
}

export function calcAgeMonths(dob: string) {
  const b = new Date(dob); const n = new Date();
  return (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
}

// Fractional age in months at an arbitrary date (not "now") — for plotting
// each historical assessment at its own age with sub-month precision.
export function ageMonthsAt(dob: string, at: string | Date) {
  const b = new Date(dob);
  const d = typeof at === "string" ? new Date(at) : at;
  return (d.getTime() - b.getTime()) / 86400000 / 30.4368;
}

export function fmtDate(d: string, locale: string) {
  return new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

// cls ต้องเป็น class เต็มๆ — Tailwind JIT ไม่ generate class ที่ประกอบ string ตอน runtime
export const RISK_LABEL: Record<string, { th: string; en: string; cls: string }> = {
  normal:        { th: "ปกติ",           en: "Normal",        cls: "bg-success/10 text-success" },
  short_stature: { th: "เตี้ยกว่าเกณฑ์", en: "Short Stature", cls: "bg-warning/10 text-warning" },
  tall_stature:  { th: "สูงกว่าเกณฑ์",  en: "Tall Stature",  cls: "bg-primary/10 text-primary" },
  advanced:      { th: "อายุกระดูกมาก",  en: "Advanced",      cls: "bg-danger/10 text-danger"   },
  delayed:       { th: "อายุกระดูกน้อย", en: "Delayed",       cls: "bg-warning/10 text-warning" },
};
