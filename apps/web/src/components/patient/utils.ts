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

// Mid-parental target height (สูตร Tanner): ชาย (พ่อ+แม่+13)/2, หญิง (พ่อ+แม่−13)/2
// ค่าคงที่ทางคลินิก (13 ซม.) ต้องอยู่ที่เดียว — backend มีสูตรเดียวกันใน bone_age.py (_target_height)
export function targetHeightCm(
  sex: string, fatherCm: number | string | null | undefined, motherCm: number | string | null | undefined,
): number | null {
  const f = Number(fatherCm), m = Number(motherCm);
  if (!f || !m) return null;
  return sex === "M" ? (f + m + 13) / 2 : (f + m - 13) / 2;
}

// แปลงเดือน (อาจเป็นทศนิยม เช่น 143.6 จากโมเดลจริง) → "11 ปี 11 เดือน" / "11y 11m"
// ต้อง round ก่อนแยกปี/เดือนเสมอ — ถ้า floor ปีแต่ round เศษเดือนแยกกันจะได้ "11 ปี 12 เดือน"
export function fmtYearsMonths(months: number | string | null | undefined, th: boolean) {
  const m = Math.round(Number(months ?? 0));
  const y = Math.floor(m / 12);
  const rem = m % 12;
  return th ? `${y} ปี ${rem} เดือน` : `${y}y ${rem}m`;
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
