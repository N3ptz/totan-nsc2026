"""
Bayley-Pinneau method — Final Adult Height (FAH) prediction from bone age.

Source (method + formula):
  Bayley N, Pinneau SR. "Tables for predicting adult height from skeletal age:
  revised for use with the Greulich-Pyle hand standards." J Pediatr. 1952;
  40(4):423-441. https://doi.org/10.1016/S0022-3476(52)80106-7

Why this method (and not TW3):
  Bayley-Pinneau (BP) is the method the Greulich & Pyle (G&P) atlas itself
  ships a prediction-table appendix for, so it consumes the same G&P bone age
  this pipeline already produces. Tanner-Whitehouse 3 (TW3) uses its own,
  incompatible skeletal-maturity scoring system (RUS/Carpal bone scores) —
  plugging a G&P bone age into a TW3-style height prediction (the previous
  code's claim) is a category error, not just an unvalidated formula.

Formula:
  At a given bone age, a child has on average already reached a known,
  sex-specific percentage of their eventual adult height. Given current
  height and that percentage:

      predicted_adult_height_cm = current_height_cm / (percent_attained / 100)

Table data — IMPORTANT CAVEAT:
  The original BP percentage table is printed only as an appendix bound into
  the (copyrighted, scanned) G&P atlas book, and additionally splits results
  by "average / accelerated / retarded" bone-age tempo — a nuance most digital
  calculators skip. It is not available anywhere as machine-readable text, so
  PERCENT_ADULT_HEIGHT below is a same-shape reconstruction for the "average
  tempo" case: monotonic increasing, sex-specific, anchored at the
  well-established endpoints (girls reach ~100% around bone age 15-16, boys
  ~18-19, matching the known ~2-year sex difference in skeletal maturation
  used throughout auxology), and cross-checked directionally against
  secondary literature. It is NOT a verbatim digitization of the 1952/G&P
  table. Validate against a primary or licensed copy before relying on exact
  cm-level output for clinical decisions.
"""

from __future__ import annotations

# bone_age_years -> % of adult height already attained (average-tempo table)
PERCENT_ADULT_HEIGHT: dict[str, dict[float, float]] = {
    "M": {
        2: 47.0, 3: 55.0, 4: 61.5, 5: 66.5, 6: 71.0, 7: 75.0, 8: 78.5,
        9: 81.7, 10: 84.7, 11: 87.7, 12: 90.7, 13: 93.5, 14: 96.0,
        15: 97.9, 16: 99.0, 17: 99.6, 18: 100.0,
    },
    "F": {
        2: 53.0, 3: 61.0, 4: 67.0, 5: 72.0, 6: 76.5, 7: 80.5, 8: 84.0,
        9: 87.0, 10: 89.7, 11: 92.2, 12: 94.5, 13: 96.5, 14: 98.0,
        15: 99.2, 16: 99.8, 17: 100.0,
    },
}


def _percent_attained(sex: str, bone_age_years: float) -> float:
    table = PERCENT_ADULT_HEIGHT.get(sex, PERCENT_ADULT_HEIGHT["M"])
    ages = sorted(table)
    if bone_age_years <= ages[0]:
        return table[ages[0]]
    if bone_age_years >= ages[-1]:
        return table[ages[-1]]
    lo = max(a for a in ages if a <= bone_age_years)
    hi = min(a for a in ages if a >= bone_age_years)
    if lo == hi:
        return table[lo]
    t = (bone_age_years - lo) / (hi - lo)
    return table[lo] + t * (table[hi] - table[lo])


def predict_adult_height_cm(
    sex: str, bone_age_months: float, current_height_cm: float | None
) -> float | None:
    """Bayley-Pinneau: predicted adult height = current height / (% attained / 100)."""
    if not current_height_cm or current_height_cm <= 0:
        return None
    percent = _percent_attained(sex, bone_age_months / 12)
    if percent <= 0:
        return None
    return round(current_height_cm / (percent / 100) * 10) / 10
