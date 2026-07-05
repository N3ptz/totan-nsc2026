/**
 * WHO growth reference (height-for-age), used as the closest available
 * machine-readable proxy — the official Thai DOH 2564 standard
 * (เกณฑ์อ้างอิงการเจริญเติบโต, กรมอนามัย) is only published as printable PDF
 * charts, not as a numeric/CSV dataset. Thailand's own 2564 standard is
 * itself built on WHO 2006 (ages 0-5) and adapted from WHO 2007 methodology
 * (ages 6-19), so this is a scientifically-appropriate stand-in, not a
 * literal digitization of the Thai DOH tables. Same sourcing-honesty
 * convention as apps/ai-service/app/pipeline/bayley_pinneau.py.
 *
 * Sources: WHO Child Growth Standards 2006 (0-5y) + WHO Growth Reference
 * 2007 (5-19y), height-for-age, P3/P50/P97.
 */

export type Sex = "M" | "F";

interface RefPoint {
  ageMonths: number;
  p3: number;
  p50: number;
  p97: number;
}

// ageMonths: p3, p50, p97 (cm)
const BOYS: RefPoint[] = [
  { ageMonths: 0,   p3: 46.3,    p50: 49.9,    p97: 53.4 },
  { ageMonths: 3,   p3: 57.6,    p50: 61.4,    p97: 65.3 },
  { ageMonths: 6,   p3: 63.6,    p50: 67.6,    p97: 71.6 },
  { ageMonths: 9,   p3: 67.7,    p50: 72.0,    p97: 76.2 },
  { ageMonths: 12,  p3: 71.3,    p50: 75.7,    p97: 80.2 },
  { ageMonths: 15,  p3: 74.4,    p50: 79.1,    p97: 83.9 },
  { ageMonths: 18,  p3: 77.2,    p50: 82.3,    p97: 87.3 },
  { ageMonths: 21,  p3: 79.7,    p50: 85.1,    p97: 90.5 },
  { ageMonths: 24,  p3: 81.4,    p50: 87.1,    p97: 92.9 },
  { ageMonths: 30,  p3: 85.5,    p50: 91.9,    p97: 98.3 },
  { ageMonths: 36,  p3: 89.1,    p50: 96.1,    p97: 103.1 },
  { ageMonths: 42,  p3: 92.4,    p50: 99.9,    p97: 107.3 },
  { ageMonths: 48,  p3: 95.4,    p50: 103.3,   p97: 111.2 },
  { ageMonths: 54,  p3: 98.4,    p50: 106.7,   p97: 115.0 },
  { ageMonths: 60,  p3: 101.2,   p50: 110.0,   p97: 118.7 },
  { ageMonths: 72,  p3: 106.685, p50: 115.951, p97: 125.217 },
  { ageMonths: 84,  p3: 111.793, p50: 121.734, p97: 131.675 },
  { ageMonths: 96,  p3: 116.642, p50: 127.265, p97: 137.888 },
  { ageMonths: 108, p3: 121.258, p50: 132.565, p97: 143.872 },
  { ageMonths: 120, p3: 125.792, p50: 137.78,  p97: 149.767 },
  { ageMonths: 132, p3: 130.454, p50: 143.113, p97: 155.771 },
  { ageMonths: 144, p3: 135.754, p50: 149.081, p97: 162.408 },
  { ageMonths: 156, p3: 142.073, p50: 156.043, p97: 170.012 },
  { ageMonths: 168, p3: 148.714, p50: 163.182, p97: 177.649 },
  { ageMonths: 180, p3: 154.28,  p50: 168.958, p97: 183.636 },
  { ageMonths: 192, p3: 158.28,  p50: 172.897, p97: 187.514 },
  { ageMonths: 204, p3: 160.784, p50: 175.161, p97: 189.538 },
  { ageMonths: 216, p3: 162.095, p50: 176.145, p97: 190.195 },
  { ageMonths: 228, p3: 162.817, p50: 176.543, p97: 190.270 },
];

const GIRLS: RefPoint[] = [
  { ageMonths: 0,   p3: 45.6,    p50: 49.1,    p97: 52.7 },
  { ageMonths: 3,   p3: 55.8,    p50: 59.8,    p97: 63.8 },
  { ageMonths: 6,   p3: 61.5,    p50: 65.7,    p97: 70.0 },
  { ageMonths: 9,   p3: 65.6,    p50: 70.1,    p97: 74.7 },
  { ageMonths: 12,  p3: 69.2,    p50: 74.0,    p97: 78.9 },
  { ageMonths: 15,  p3: 72.4,    p50: 77.5,    p97: 82.7 },
  { ageMonths: 18,  p3: 75.2,    p50: 80.7,    p97: 86.2 },
  { ageMonths: 21,  p3: 77.9,    p50: 83.7,    p97: 89.4 },
  { ageMonths: 24,  p3: 79.6,    p50: 85.7,    p97: 91.8 },
  { ageMonths: 30,  p3: 84.0,    p50: 90.7,    p97: 97.3 },
  { ageMonths: 36,  p3: 87.9,    p50: 95.1,    p97: 102.2 },
  { ageMonths: 42,  p3: 91.4,    p50: 99.0,    p97: 106.7 },
  { ageMonths: 48,  p3: 94.6,    p50: 102.7,   p97: 110.8 },
  { ageMonths: 54,  p3: 97.6,    p50: 106.2,   p97: 114.7 },
  { ageMonths: 60,  p3: 100.5,   p50: 109.4,   p97: 118.4 },
  { ageMonths: 72,  p3: 105.496, p50: 115.124, p97: 124.753 },
  { ageMonths: 84,  p3: 110.529, p50: 120.81,  p97: 131.092 },
  { ageMonths: 96,  p3: 115.652, p50: 126.556, p97: 137.46 },
  { ageMonths: 108, p3: 121.002, p50: 132.494, p97: 143.987 },
  { ageMonths: 120, p3: 126.605, p50: 138.636, p97: 150.667 },
  { ageMonths: 132, p3: 132.492, p50: 144.993, p97: 157.494 },
  { ageMonths: 144, p3: 138.368, p50: 151.233, p97: 164.098 },
  { ageMonths: 156, p3: 143.319, p50: 156.375, p97: 169.43 },
  { ageMonths: 168, p3: 146.731, p50: 159.789, p97: 172.847 },
  { ageMonths: 180, p3: 148.731, p50: 161.669, p97: 174.607 },
  { ageMonths: 192, p3: 149.751, p50: 162.516, p97: 175.28 },
  { ageMonths: 204, p3: 150.269, p50: 162.854, p97: 175.44 },
  { ageMonths: 216, p3: 150.63,  p50: 163.06,  p97: 175.489 },
  { ageMonths: 228, p3: 150.853, p50: 163.155, p97: 175.457 },
];

const TABLE: Record<Sex, RefPoint[]> = { M: BOYS, F: GIRLS };

function interpolate(table: RefPoint[], ageMonths: number): RefPoint {
  if (ageMonths <= table[0].ageMonths) return table[0];
  const last = table[table.length - 1];
  if (ageMonths >= last.ageMonths) return last;
  let lo = table[0];
  let hi = last;
  for (let i = 0; i < table.length - 1; i++) {
    if (table[i].ageMonths <= ageMonths && table[i + 1].ageMonths >= ageMonths) {
      lo = table[i];
      hi = table[i + 1];
      break;
    }
  }
  if (lo.ageMonths === hi.ageMonths) return lo;
  const t = (ageMonths - lo.ageMonths) / (hi.ageMonths - lo.ageMonths);
  return {
    ageMonths,
    p3: lo.p3 + t * (hi.p3 - lo.p3),
    p50: lo.p50 + t * (hi.p50 - lo.p50),
    p97: lo.p97 + t * (hi.p97 - lo.p97),
  };
}

export function whoHeightReference(sex: Sex, ageMonths: number): { p3: number; p50: number; p97: number } {
  const table = TABLE[sex];
  if (!table) {
    console.warn(`whoHeightReference: unexpected sex "${sex}", defaulting to "M"`);
  }
  const { p3, p50, p97 } = interpolate(table ?? BOYS, Math.max(0, ageMonths));
  return { p3, p50, p97 };
}
