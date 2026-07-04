/**
 * Predicted Final Adult Height (FAH) vs genetic Target Height (TH / MPH)
 * — clinical interpretation.
 *
 * Two distinct, independently-sourced thresholds are combined here — they
 * answer two different clinical questions, not one:
 *
 *   - +/-5 cm  = the CLINICAL ACTION threshold specifically for comparing a
 *     child's *projected/predicted* final height against their mid-parental
 *     target: "If the estimated final height is within 5 cm (2 in) of the
 *     mid-parental height, the child's current height is appropriate for
 *     the family. However, if the projected height differs from the
 *     midparental height by more than 5 cm, a variant growth pattern or a
 *     pathologic cause should be considered." — American Family Physician,
 *     "Evaluation of Short and Tall Stature in Children" (2008), citing
 *     Tanner JM, Goldstein H, Whitehouse RH. "Standards for children's
 *     height at ages 2-9 years allowing for height of parents." Arch Dis
 *     Child. 1970;45(244):755-762.
 *
 *   - +/-8.5 cm (~2 SD) = the broader POPULATION target-height range: ~97%
 *     of children from a given set of parents have an adult height within
 *     mid-parental height +/- 8.5 cm. This describes normal population
 *     variation, not a decision point on its own — used here as the outer
 *     boundary marking a difference large enough to fall outside the
 *     expected range for this specific family.
 *
 * Caveat carried into the advice text: FAH itself is a *prediction*
 * (Bayley-Pinneau, see pipeline/bayley_pinneau.py), not a measurement, and
 * has its own real error margin — a GHD-cohort study found mean deviations
 * of 4.1+/-0.7 cm (girls) / 6.1+/-0.6 cm (boys) between BP-predicted and
 * eventual actual adult height. A 5-8.5 cm gap sits right at the edge of
 * that prediction noise floor, so the "notable" tier is deliberately
 * softer than the ">8.5cm" tier, not an automatic red flag.
 */

export type FahTargetCategory = "below_range" | "notable_below" | "within_range" | "notable_above" | "above_range";

const ACTION_THRESHOLD_CM = 5;
const RANGE_THRESHOLD_CM = 8.5;

const TIERS: Record<FahTargetCategory, {
  label: { th: string; en: string };
  advice: { th: string; en: string };
  cls: string;
}> = {
  below_range: {
    label: { th: "ต่ำกว่าศักยภาพทางพันธุกรรมอย่างมีนัยสำคัญ", en: "Below Genetic Target Range" },
    advice: {
      th: "ส่วนสูงที่คาดการณ์เมื่อโตเต็มวัยต่ำกว่าส่วนสูงเป้าหมายเกิน 8.5 ซม. (~2 SD) ซึ่งอยู่นอกช่วงที่คาดหวังสำหรับครอบครัวนี้ อาจบ่งชี้ว่าเด็กไม่ได้เติบโตเต็มศักยภาพทางพันธุกรรม จากสาเหตุ เช่น ภาวะทุพโภชนาการ ภาวะขาดฮอร์โมนการเจริญเติบโต ไทรอยด์ทำงานต่ำ หรือโรคเรื้อรัง ควรพิจารณาตรวจประเมินทางต่อมไร้ท่อเพิ่มเติม",
      en: "Predicted adult height is more than 8.5 cm (~2 SD) below the genetic target — outside the expected range for this family. This pattern can indicate the child is not reaching their genetic growth potential, possibly due to malnutrition, growth hormone deficiency, hypothyroidism, or chronic illness. Consider clinical correlation and further endocrine evaluation.",
    },
    cls: "bg-danger/10 text-danger",
  },
  notable_below: {
    label: { th: "ต่ำกว่าส่วนสูงเป้าหมายอย่างเห็นได้ชัด", en: "Notably Below Target Height" },
    advice: {
      th: "ส่วนสูงที่คาดการณ์ต่ำกว่าส่วนสูงเป้าหมาย 5-8.5 ซม. ซึ่งเกินเกณฑ์ 5 ซม. ที่ใช้พิจารณาทางคลินิก แต่ยังอยู่ในช่วงค่าปกติของประชากรสำหรับครอบครัวนี้ ควรติดตามผลในการนัดครั้งถัดไป โดยควรพิจารณาว่าค่าพยากรณ์เองมีความคลาดเคลื่อนโดยธรรมชาติราว 4-6 ซม. จึงไม่ควรตีความผลต่างในช่วงนี้เกินจริง",
      en: "Predicted adult height is 5-8.5 cm below the genetic target — outside the 5 cm clinical comfort zone, though still within the broader population range for this family. Worth monitoring at follow-up; note the prediction itself carries roughly 4-6 cm of inherent uncertainty, so a gap in this zone shouldn't be over-interpreted alone.",
    },
    cls: "bg-warning/10 text-warning",
  },
  within_range: {
    label: { th: "อยู่ในช่วงศักยภาพทางพันธุกรรม", en: "Within Genetic Target Range" },
    advice: {
      th: "ส่วนสูงที่คาดการณ์อยู่ในช่วง 5 ซม.ของส่วนสูงเป้าหมาย ซึ่งเหมาะสมกับศักยภาพทางพันธุกรรมของครอบครัวนี้",
      en: "Predicted adult height is within 5 cm of the genetic target height — appropriate for this family's genetic potential.",
    },
    cls: "bg-success/10 text-success",
  },
  notable_above: {
    label: { th: "สูงกว่าส่วนสูงเป้าหมายอย่างเห็นได้ชัด", en: "Notably Above Target Height" },
    advice: {
      th: "ส่วนสูงที่คาดการณ์สูงกว่าส่วนสูงเป้าหมาย 5-8.5 ซม. ส่วนใหญ่มักสะท้อนถึงภาวะโภชนาการและสิ่งแวดล้อมที่ดี แต่บางครั้งอาจเกี่ยวข้องกับสาเหตุอื่น เช่น ภาวะเป็นหนุ่มสาวก่อนวัย ควรบันทึกไว้เพื่อติดตาม",
      en: "Predicted adult height is 5-8.5 cm above the genetic target. Often reflects favorable nutrition and environment, but can occasionally relate to other causes of growth advancement (e.g. early puberty) — worth noting rather than acting on alone.",
    },
    cls: "bg-primary/10 text-primary",
  },
  above_range: {
    label: { th: "สูงกว่าศักยภาพทางพันธุกรรมอย่างมีนัยสำคัญ", en: "Above Genetic Target Range" },
    advice: {
      th: "ส่วนสูงที่คาดการณ์สูงกว่าส่วนสูงเป้าหมายเกิน 8.5 ซม. (~2 SD) ซึ่งอยู่นอกช่วงที่คาดหวังสำหรับครอบครัวนี้ ส่วนใหญ่อธิบายได้จากภาวะโภชนาการและสิ่งแวดล้อมที่ดีเยี่ยม (เกินศักยภาพทางพันธุกรรม) แต่หากสูงกว่ามากอาจควรพิจารณาระยะพัฒนาการทางเพศหรือสาเหตุอื่นร่วมด้วย",
      en: "Predicted adult height is more than 8.5 cm (~2 SD) above the genetic target — outside the expected range for this family. Most often explained by favorable nutrition and environmental factors (exceeding genetic potential), though marked advancement can occasionally warrant a look at pubertal timing or other causes of growth advancement.",
    },
    cls: "bg-primary/10 text-primary",
  },
};

export interface FahTargetClassification {
  category: FahTargetCategory;
  diffCm: number; // FAH - TH, signed
  label: { th: string; en: string };
  advice: { th: string; en: string };
  cls: string;
}

export function classifyFahVsTargetHeight(fahCm: number, thCm: number): FahTargetClassification {
  const diffCm = Math.round((fahCm - thCm) * 10) / 10;

  let category: FahTargetCategory;
  if (diffCm <= -RANGE_THRESHOLD_CM) category = "below_range";
  else if (diffCm <= -ACTION_THRESHOLD_CM) category = "notable_below";
  else if (diffCm >= RANGE_THRESHOLD_CM) category = "above_range";
  else if (diffCm >= ACTION_THRESHOLD_CM) category = "notable_above";
  else category = "within_range";

  return { category, diffCm, ...TIERS[category] };
}
