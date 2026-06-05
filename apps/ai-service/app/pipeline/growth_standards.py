"""
ตารางมาตรฐานการเจริญเติบโตเด็กไทย พ.ศ. 2564
Thai Growth Standards 2564 — กรมอนามัย กระทรวงสาธารณสุข

LMS Method (Cole & Green, 1992):
  L ≠ 0 :  z = ((X/M)^L − 1) / (L × S)
  L = 0  :  z = ln(X/M) / S

  L = Box-Cox power (skewness correction)
  M = median
  S = coefficient of variation
"""

from __future__ import annotations
import math

# ─── Type alias ──────────────────────────────────────────────────────────────
# { age_months: (L, M, S) }
_LmsTable = dict[int, tuple[float, float, float]]

# ─────────────────────────────────────────────────────────────────────────────
# TODO: กรอกค่า L, M, S จากเอกสาร "ตารางการเจริญเติบโตเด็กไทย พ.ศ. 2564"
#       ดาวน์โหลดจาก: https://nutrition.anamai.moph.go.th
#
#       ตารางที่ต้องกรอก (แยกชาย/หญิง):
#         1. Height-for-age  → HEIGHT_FOR_AGE
#         2. Weight-for-age  → WEIGHT_FOR_AGE
#         3. BMI-for-age     → BMI_FOR_AGE
#
#       รูปแบบแต่ละแถว:
#         age_months: (L,     M,       S    ),
#         60:         (0.123, 109.7,   0.040),  # 5 ปี
# ─────────────────────────────────────────────────────────────────────────────

HEIGHT_FOR_AGE: dict[str, _LmsTable] = {
    "M": {
        # ── ชาย: ส่วนสูงตามอายุ ── กรอกจากตารางที่ 1 ──────────────
        # age_months: (L,    M,      S    ),
    },
    "F": {
        # ── หญิง: ส่วนสูงตามอายุ ── กรอกจากตารางที่ 2 ─────────────
    },
}

WEIGHT_FOR_AGE: dict[str, _LmsTable] = {
    "M": {
        # ── ชาย: น้ำหนักตามอายุ ── กรอกจากตารางที่ 3 ──────────────
    },
    "F": {
        # ── หญิง: น้ำหนักตามอายุ ── กรอกจากตารางที่ 4 ─────────────
    },
}

BMI_FOR_AGE: dict[str, _LmsTable] = {
    "M": {
        # ── ชาย: BMI ตามอายุ ── กรอกจากตารางที่ 5 ─────────────────
    },
    "F": {
        # ── หญิง: BMI ตามอายุ ── กรอกจากตารางที่ 6 ────────────────
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
