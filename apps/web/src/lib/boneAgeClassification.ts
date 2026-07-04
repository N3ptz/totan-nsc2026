/**
 * Bone Age (BA) vs Chronological Age (CA) — clinical interpretation.
 *
 * Threshold: |BA - CA| >= 24 months (~2 SD) is the standard clinical cutoff
 * for a significant discrepancy warranting specialist correlation; under
 * ~12 months (~1 SD) is commonly normal variation. The true SD is
 * age/sex/method-dependent (Greulich-Pyle vs Tanner-Whitehouse) and no
 * single public numeric table exists for it — similar to the
 * Bayley-Pinneau sourcing situation elsewhere in this codebase — but
 * multiple independent reproducibility studies converge on SD ~= 1 year,
 * making this flat 12/24-month tiering a defensible, evidence-consistent
 * approximation rather than a literal age-by-age SD lookup.
 *
 * Sources:
 *   - AMBOSS Pediatric Endocrinology (resident teaching reference): bone
 *     age >2 SD above/below chronological age = advanced/delayed;
 *     "<1 year often normal", ">=2 years -> refer to endocrinology".
 *   - Medscape/eMedicine, "Constitutional Growth Delay": bone age
 *     "delayed by longer than 1 year and often by 2 years or more" as the
 *     diagnostic hallmark.
 *   - Bull RK, Edwards PD, Kemp PM, Fry S, Hughes IA. "Bone age assessment:
 *     a large scale comparison of the Greulich and Pyle and Tanner and
 *     Whitehouse (TW2) methods." Arch Dis Child. 1999;81(2):172-3.
 *     (PMID 10490531) — real-world BA assessment reproducibility data
 *     underlying the ~1-year SD approximation.
 *
 * This mirrors (with a finer "mild" tier) the normal/advanced/delayed
 * riskFlag computed server-side in
 * apps/ai-service/app/pipeline/bone_age.py::_classify_deviation — that
 * flag is a fixed-value Postgres enum column, so the extra "mild" nuance
 * lives here instead, computed client-side from boneAgeMonths/chronAgeMonths
 * that are already available on every assessment (no backend change,
 * no migration needed).
 */

export type BoneAgeCategory = "advanced" | "mild_advanced" | "normal" | "mild_delayed" | "delayed";

const SIGNIFICANT_THRESHOLD_MONTHS = 24;
const MILD_THRESHOLD_MONTHS = 12;

const TIERS: Record<BoneAgeCategory, {
  label: { th: string; en: string };
  advice: { th: string; en: string };
  cls: string;
}> = {
  advanced: {
    label: { th: "อายุกระดูกมากกว่าปกติอย่างมีนัยสำคัญ", en: "Significantly Advanced Bone Age" },
    advice: {
      th: "อายุกระดูกมากกว่าอายุจริงเกิน 2 ปี (~2 SD) แผ่นการเจริญเติบโตอาจปิดเร็วกว่าที่คาด ทำให้ช่วงเวลาการเจริญเติบโตสั้นลง แม้ตอนนี้เด็กจะดูสูงกว่าเกณฑ์อายุ ควรพิจารณาร่วมกับระยะพัฒนาการทางเพศ และสาเหตุที่เป็นไปได้ เช่น ภาวะอ้วนหรือภาวะเป็นหนุ่มสาวก่อนวัย",
      en: "Bone age is more than 2 years (~2 SD) ahead of chronological age. Growth plates may fuse earlier than expected, which can shorten the remaining growth window even though the child may look tall for age right now. Consider correlating with pubertal staging — possible contributors include obesity-related advancement or precocious puberty.",
    },
    cls: "bg-danger/10 text-danger",
  },
  mild_advanced: {
    label: { th: "อายุกระดูกมากกว่าเล็กน้อย", en: "Mildly Advanced Bone Age" },
    advice: {
      th: "อายุกระดูกมากกว่าอายุจริง 1-2 ปี ซึ่งมักยังอยู่ในช่วงความแปรปรวนตามธรรมชาติ แต่ควรติดตามผลในการนัดครั้งถัดไป",
      en: "Bone age is 1-2 years ahead of chronological age. This often falls within normal biological variability, but is worth monitoring at follow-up visits.",
    },
    cls: "bg-warning/10 text-warning",
  },
  normal: {
    label: { th: "อายุกระดูกอยู่ในเกณฑ์ปกติ", en: "Normal Bone Age" },
    advice: {
      th: "อายุกระดูกอยู่ในช่วงที่ถือว่าปกติเมื่อเทียบกับอายุจริง",
      en: "Bone age is within the range considered normal relative to chronological age.",
    },
    cls: "bg-success/10 text-success",
  },
  mild_delayed: {
    label: { th: "อายุกระดูกน้อยกว่าเล็กน้อย", en: "Mildly Delayed Bone Age" },
    advice: {
      th: "อายุกระดูกน้อยกว่าอายุจริง 1-2 ปี ซึ่งมักยังปกติ แต่ควรติดตามควบคู่กับอัตราการเจริญเติบโตและระยะพัฒนาการทางเพศ",
      en: "Bone age is 1-2 years behind chronological age. This is often normal, but is worth monitoring alongside growth velocity and pubertal timing.",
    },
    cls: "bg-warning/10 text-warning",
  },
  delayed: {
    label: { th: "อายุกระดูกน้อยกว่าปกติอย่างมีนัยสำคัญ", en: "Significantly Delayed Bone Age" },
    advice: {
      th: "อายุกระดูกน้อยกว่าอายุจริงเกิน 2 ปี (~2 SD) ลักษณะนี้พบได้ในภาวะเจริญเติบโตและเข้าสู่วัยเจริญพันธุ์ช้าตามธรรมชาติ (constitutional delay) แต่อาจสะท้อนถึงภาวะขาดฮอร์โมนการเจริญเติบโต ไทรอยด์ทำงานต่ำ หรือโรคเรื้อรังได้เช่นกัน เด็กอาจดูเตี้ยกว่าเกณฑ์อายุในตอนนี้ แต่ยังมีศักยภาพในการเติบโตอีกมากกว่าที่อายุจริงบ่งชี้ ควรพิจารณาตรวจเพิ่มเติมตามแนวทางมาตรฐาน",
      en: "Bone age is more than 2 years (~2 SD) behind chronological age. This pattern is seen in constitutional delay of growth and puberty, but can also reflect growth hormone deficiency, hypothyroidism, or chronic illness. The child may look short for age now, but has more remaining growth potential than chronological age alone would suggest. Consider clinical correlation and standard workup for delayed bone age.",
    },
    cls: "bg-danger/10 text-danger",
  },
};

export interface BoneAgeClassification {
  category: BoneAgeCategory;
  deviationMonths: number;
  label: { th: string; en: string };
  advice: { th: string; en: string };
  cls: string;
}

export function classifyBoneAge(boneAgeMonths: number, chronAgeMonths: number): BoneAgeClassification {
  const deviationMonths = Math.round(boneAgeMonths - chronAgeMonths);

  let category: BoneAgeCategory;
  if (deviationMonths >= SIGNIFICANT_THRESHOLD_MONTHS) category = "advanced";
  else if (deviationMonths >= MILD_THRESHOLD_MONTHS) category = "mild_advanced";
  else if (deviationMonths <= -SIGNIFICANT_THRESHOLD_MONTHS) category = "delayed";
  else if (deviationMonths <= -MILD_THRESHOLD_MONTHS) category = "mild_delayed";
  else category = "normal";

  return { category, deviationMonths, ...TIERS[category] };
}
