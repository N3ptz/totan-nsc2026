"""
ตารางมาตรฐานการเจริญเติบโตเด็กไทย พ.ศ. 2564
Thai Growth Standards 2564 — กรมอนามัย กระทรวงสาธารณสุข

LMS Method (Cole & Green, 1992):
  L ≠ 0 :  z = ((X/M)^L − 1) / (L × S)
  L = 0  :  z = ln(X/M) / S

  L = Box-Cox power (skewness correction)
  M = median
  S = coefficient of variation

Sourcing note (applies to all three tables below):
  The official Thai DOH 2564 tables (เกณฑ์อ้างอิงการเจริญเติบโต, กรมอนามัย) are
  only published as printable PDF charts at nutrition.anamai.moph.go.th — no
  machine-readable L/M/S dataset exists there. As a scientifically-appropriate
  stand-in (Thailand's own 2564 standard is itself built on WHO 2006 for ages
  0-5 and adapted from WHO 2007 methodology for ages 6-19), all three tables
  use real WHO data instead: WHO Child Growth Standards 2006 (0-5y) + WHO
  Growth Reference 2007 (5-19y for height/BMI, 5-10y for weight).

  HEIGHT_FOR_AGE: L=1.0 for all rows (confirmed from the WHO source — height
  needs no Box-Cox skew correction). M/S were derived from the same verified
  P3/P50/P97 checkpoints used by the frontend chart
  (apps/web/src/lib/growthReference.ts — keep the two in sync if either
  changes), via M=P50 and S=avg((P97−P50),(P50−P3))/P50/1.8807936 (the
  standard-normal z-value for P97/P3). Cross-checked against the WHO source's
  own published S column at several ages — matched to within 0.00001.

  WEIGHT_FOR_AGE / BMI_FOR_AGE: L/M/S taken directly from the WHO source
  (weight and BMI both have real, non-trivial Box-Cox skew, unlike height).
  WHO does not define weight-for-age past age 10 — see the note above
  WEIGHT_FOR_AGE below.
"""

from __future__ import annotations
import math

# ─── Type alias ──────────────────────────────────────────────────────────────
# { age_months: (L, M, S) }
_LmsTable = dict[int, tuple[float, float, float]]

HEIGHT_FOR_AGE: dict[str, _LmsTable] = {
    "M": {
        # ── ชาย: ส่วนสูงตามอายุ (WHO 2006/2007 height-for-age — see docstring) ──
        # age_months: (L,   M,        S      ),
        0:   (1.0, 49.9,    0.03783),
        3:   (1.0, 61.4,    0.03334),
        6:   (1.0, 67.6,    0.03146),
        9:   (1.0, 72.0,    0.03138),
        12:  (1.0, 75.7,    0.03126),
        15:  (1.0, 79.1,    0.03193),
        18:  (1.0, 82.3,    0.03262),
        21:  (1.0, 85.1,    0.03374),
        24:  (1.0, 87.1,    0.03510),
        30:  (1.0, 91.9,    0.03703),
        36:  (1.0, 96.1,    0.03873),
        42:  (1.0, 99.9,    0.03965),
        48:  (1.0, 103.3,   0.04066),
        54:  (1.0, 106.7,   0.04136),
        60:  (1.0, 110.0,   0.04229),
        72:  (1.0, 115.951, 0.04249),
        84:  (1.0, 121.734, 0.04342),
        96:  (1.0, 127.265, 0.04438),
        108: (1.0, 132.565, 0.04535),
        120: (1.0, 137.78,  0.04626),
        132: (1.0, 143.113, 0.04703),
        144: (1.0, 149.081, 0.04753),
        156: (1.0, 156.043, 0.04760),
        168: (1.0, 163.182, 0.04714),
        180: (1.0, 168.958, 0.04619),
        192: (1.0, 172.897, 0.04495),
        204: (1.0, 175.161, 0.04364),
        216: (1.0, 176.145, 0.04241),
        228: (1.0, 176.543, 0.04134),
    },
    "F": {
        # ── หญิง: ส่วนสูงตามอายุ (WHO 2006/2007 height-for-age — see docstring) ──
        0:   (1.0, 49.1,    0.03844),
        3:   (1.0, 59.8,    0.03556),
        6:   (1.0, 65.7,    0.03439),
        9:   (1.0, 70.1,    0.03451),
        12:  (1.0, 74.0,    0.03485),
        15:  (1.0, 77.5,    0.03533),
        18:  (1.0, 80.7,    0.03624),
        21:  (1.0, 83.7,    0.03653),
        24:  (1.0, 85.7,    0.03784),
        30:  (1.0, 90.7,    0.03898),
        36:  (1.0, 95.1,    0.03997),
        42:  (1.0, 99.0,    0.04109),
        48:  (1.0, 102.7,   0.04193),
        54:  (1.0, 106.2,   0.04281),
        60:  (1.0, 109.4,   0.04350),
        72:  (1.0, 115.124, 0.04447),
        84:  (1.0, 120.81,  0.04525),
        96:  (1.0, 126.556, 0.04581),
        108: (1.0, 132.494, 0.04612),
        120: (1.0, 138.636, 0.04614),
        132: (1.0, 144.993, 0.04584),
        144: (1.0, 151.233, 0.04523),
        156: (1.0, 156.375, 0.04439),
        168: (1.0, 159.789, 0.04345),
        180: (1.0, 161.669, 0.04255),
        192: (1.0, 162.516, 0.04176),
        204: (1.0, 162.854, 0.04109),
        216: (1.0, 163.06,  0.04053),
        228: (1.0, 163.155, 0.04009),
    },
}

# WEIGHT_FOR_AGE — sourcing note (same convention as HEIGHT_FOR_AGE above):
#   Real WHO Child Growth Standards 2006 (0-5y) + WHO Growth Reference 2007
#   (5-10y) weight-for-age data, L/M/S taken directly from the WHO source
#   (unlike height, weight genuinely needs the Box-Cox L term — it isn't 1).
#   WHO does NOT define weight-for-age past age 10 ("weight-for-age reference
#   data are not available beyond age 10" — WHO's own note — because weight
#   alone stops usefully separating height from body mass once puberty
#   starts; BMI-for-age is used instead from there). _interpolate() will
#   clamp ages beyond 120 months to the 10y row rather than erroring, but
#   that clamped value is not a real WHO-defined construct for teens —
#   treat weight percentile/Z-score as informational only past age 10.
WEIGHT_FOR_AGE: dict[str, _LmsTable] = {
    "M": {
        # age_months: (L,      M,        S      ),
        0:   (0.3487,  3.3464,  0.14602),
        3:   (0.1740,  6.3690,  0.11732),
        6:   (0.1256,  7.9389,  0.10957),
        9:   (0.0917,  8.9019,  0.10881),
        12:  (0.0645,  9.6460,  0.10925),
        15:  (0.0412,  10.3139, 0.11008),
        18:  (0.0210,  10.9393, 0.11120),
        21:  (0.0029,  11.5474, 0.11261),
        24:  (-0.0136, 12.1482, 0.11425),
        30:  (-0.0431, 13.2993, 0.11781),
        36:  (-0.0689, 14.3443, 0.12116),
        42:  (-0.0920, 15.3465, 0.12424),
        48:  (-0.1131, 16.3489, 0.12759),
        54:  (-0.1326, 17.3473, 0.13133),
        60:  (-0.1506, 18.3352, 0.13517),
        72:  (-0.3180, 20.5137, 0.13372),
        84:  (-0.4402, 22.8915, 0.13759),
        96:  (-0.5482, 25.4163, 0.14344),
        108: (-0.6337, 28.1092, 0.15233),
        120: (-0.6764, 31.1586, 0.16305),
    },
    "F": {
        0:   (0.3809,  3.2322,  0.14171),
        3:   (0.0407,  5.8393,  0.12622),
        6:   (-0.0759, 7.3016,  0.12204),
        9:   (-0.1507, 8.2259,  0.12199),
        12:  (-0.2022, 8.9462,  0.12267),
        15:  (-0.2385, 9.6038,  0.12299),
        18:  (-0.2637, 10.2324, 0.12309),
        21:  (-0.2814, 10.8521, 0.12335),
        24:  (-0.2940, 11.4741, 0.12389),
        30:  (-0.3101, 12.7047, 0.12587),
        36:  (-0.3201, 13.8518, 0.12920),
        42:  (-0.3283, 14.9704, 0.13375),
        48:  (-0.3361, 16.0697, 0.13884),
        54:  (-0.3440, 17.1573, 0.14372),
        60:  (-0.3518, 18.2179, 0.14821),
        72:  (-0.5013, 20.1639, 0.14900),
        84:  (-0.5347, 22.3740, 0.15556),
        96:  (-0.5627, 25.0262, 0.16186),
        108: (-0.5833, 28.2040, 0.16764),
        120: (-0.5958, 31.8578, 0.17262),
    },
}

# BMI_FOR_AGE — sourcing note: real WHO Child Growth Standards 2006 (0-5y) +
# WHO Growth Reference 2007 (5-19y) BMI-for-age data, L/M/S taken directly
# from the WHO source. Full 0-19y range (unlike weight-for-age above).
BMI_FOR_AGE: dict[str, _LmsTable] = {
    "M": {
        0:   (-0.3053, 13.4069, 0.09560),
        3:   (0.0077,  16.8950, 0.08496),
        6:   (-0.1919, 17.3424, 0.08233),
        9:   (-0.3177, 17.1659, 0.08102),
        12:  (-0.4113, 16.7992, 0.08009),
        15:  (-0.4867, 16.4393, 0.07934),
        18:  (-0.5485, 16.1388, 0.07873),
        21:  (-0.6013, 15.9043, 0.07818),
        24:  (-0.6473, 15.7356, 0.07771),
        30:  (-0.4275, 15.7954, 0.07841),
        36:  (-0.3100, 15.5986, 0.07931),
        42:  (-0.2918, 15.4423, 0.08061),
        48:  (-0.3622, 15.3326, 0.08238),
        54:  (-0.5022, 15.2513, 0.08457),
        60:  (-0.6889, 15.1917, 0.08699),
        72:  (-0.9921, 15.3062, 0.08682),
        84:  (-1.2460, 15.4832, 0.09068),
        96:  (-1.4629, 15.7368, 0.09526),
        108: (-1.6318, 16.0490, 0.10038),
        120: (-1.7407, 16.4433, 0.10566),
        132: (-1.7862, 16.9392, 0.11070),
        144: (-1.7751, 17.5334, 0.11522),
        156: (-1.7168, 18.2330, 0.11898),
        168: (-1.6211, 19.0050, 0.12191),
        180: (-1.4961, 19.7744, 0.12412),
        192: (-1.3529, 20.4951, 0.12579),
        204: (-1.1962, 21.1423, 0.12715),
        216: (-1.0260, 21.7077, 0.12836),
        228: (-0.8419, 22.1883, 0.12948),
    },
    "F": {
        0:   (-0.0631, 13.3363, 0.09272),
        3:   (0.0652,  16.3531, 0.09255),
        6:   (-0.1436, 16.9086, 0.09035),
        9:   (-0.2726, 16.7404, 0.08898),
        12:  (-0.3665, 16.3578, 0.08797),
        15:  (-0.4410, 16.0013, 0.08716),
        18:  (-0.5018, 15.7260, 0.08650),
        21:  (-0.5536, 15.5281, 0.08594),
        24:  (-0.5989, 15.4052, 0.08545),
        30:  (-0.5684, 15.5277, 0.08444),
        36:  (-0.5684, 15.3966, 0.08535),
        42:  (-0.5684, 15.3117, 0.08813),
        48:  (-0.5684, 15.2602, 0.09168),
        54:  (-0.5684, 15.2519, 0.09516),
        60:  (-0.5684, 15.2747, 0.09789),
        72:  (-1.0794, 15.2697, 0.10195),
        84:  (-1.2565, 15.4036, 0.10746),
        96:  (-1.3880, 15.6810, 0.11291),
        108: (-1.4650, 16.0964, 0.11816),
        120: (-1.4864, 16.6133, 0.12307),
        132: (-1.4606, 17.2459, 0.12748),
        144: (-1.4006, 17.9966, 0.13129),
        156: (-1.3195, 18.8012, 0.13445),
        168: (-1.2266, 19.5647, 0.13700),
        180: (-1.1311, 20.2125, 0.13904),
        192: (-1.0368, 20.7008, 0.14070),
        204: (-0.9423, 21.0367, 0.14208),
        216: (-0.8462, 21.2603, 0.14330),
        228: (-0.7496, 21.4269, 0.14441),
    },
}

# ─── Core math ───────────────────────────────────────────────────────────────

def _lms_zscore(L: float, M: float, S: float, x: float) -> float:
    if L == 0:
        return math.log(x / M) / S
    return (((x / M) ** L) - 1) / (L * S)


def _norm_cdf(z: float) -> float:
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def _interpolate(table: _LmsTable, age_months: int) -> tuple[float, float, float] | None:
    if not table:
        return None
    ages = sorted(table)
    if age_months <= ages[0]:
        return table[ages[0]]
    if age_months >= ages[-1]:
        return table[ages[-1]]
    lo = max(a for a in ages if a <= age_months)
    hi = min(a for a in ages if a >= age_months)
    if lo == hi:
        return table[lo]
    t = (age_months - lo) / (hi - lo)
    L0, M0, S0 = table[lo]
    L1, M1, S1 = table[hi]
    return (L0 + t * (L1 - L0), M0 + t * (M1 - M0), S0 + t * (S1 - S0))

# ─── Public API ──────────────────────────────────────────────────────────────

def _lookup(
    table: dict[str, _LmsTable],
    sex: str,
    age_months: int,
    value: float,
) -> tuple[float | None, float | None]:
    """Returns (z_score, percentile) — None ถ้าตารางยังไม่ได้กรอก"""
    lms = _interpolate(table.get(sex, {}), age_months)
    if lms is None:
        return None, None
    L, M, S = lms
    try:
        z = _lms_zscore(L, M, S, value)
        z_clamped = max(-4.0, min(4.0, z))
        return round(z, 2), round(_norm_cdf(z_clamped) * 100, 1)
    except (ValueError, ZeroDivisionError):
        return None, None


def height_zscore_percentile(sex: str, age_months: int, height_cm: float):
    return _lookup(HEIGHT_FOR_AGE, sex, age_months, height_cm)


def weight_zscore_percentile(sex: str, age_months: int, weight_kg: float):
    return _lookup(WEIGHT_FOR_AGE, sex, age_months, weight_kg)


def bmi_zscore_percentile(sex: str, age_months: int, bmi: float):
    return _lookup(BMI_FOR_AGE, sex, age_months, bmi)
