import math
import logging
from datetime import datetime

from ..schemas import AiResult
from ..config import settings
from .growth_standards import (
    height_zscore_percentile,
    weight_zscore_percentile,
    bmi_zscore_percentile,
)
from .bayley_pinneau import predict_adult_height_cm
from .external_bone_age import predict_external

logger = logging.getLogger(__name__)


class BoneAgePipeline:
    """
    Bone Age Assessment Pipeline

    DeepLabV3 (segmentation) → YOLOv11 (ROI detection) → ConvNeXt Tiny (age prediction)
    → Grad-CAM (heatmap) → Bayley-Pinneau (Final Adult Height) → Thai Growth Standards 2564

    ────────────────────────────────────────────────────────────────────
    สิ่งที่ต้อง implement เพิ่ม:

    1. load_models()
       - โหลด weights จาก self.model_dir
       - DeepLabV3  → self.model_dir/deeplabv3.pt
       - YOLOv11    → self.model_dir/yolov11.pt
       - ConvNeXt   → self.model_dir/convnext_tiny.pt
       - ตั้ง self._loaded = True เมื่อโหลดสำเร็จ

    2. run()
       - แทนที่ _external_run() ด้วย pipeline จริง
       - อัปโหลด heatmap → object storage → ใส่ URL ใน heatmapUrl
    ────────────────────────────────────────────────────────────────────
    """

    def __init__(self, model_dir: str = settings.MODEL_DIR, device: str = settings.DEVICE):
        self.model_dir = model_dir
        self.device = device
        self._loaded = False

    def load_models(self) -> None:
        """
        TODO: โหลด model weights ทั้งหมดที่นี่
        เรียกครั้งเดียวตอน startup (lifespan ใน main.py)
        """
        # TODO: implement
        # import torch
        # self.segmentor = torch.load(f"{self.model_dir}/deeplabv3.pt", map_location=self.device)
        # self.detector  = torch.load(f"{self.model_dir}/yolov11.pt",   map_location=self.device)
        # self.regressor = torch.load(f"{self.model_dir}/convnext_tiny.pt", map_location=self.device)
        # self._loaded = True
        logger.warning("Model weights not loaded — using external demo model (failures return AI error, no mock fallback)")

    def run(
        self,
        image_bytes: bytes,
        sex: str,
        height_cm: float | None,
        weight_kg: float | None,
        father_height_cm: float | None = None,
        mother_height_cm: float | None = None,
        date_of_birth: str | None = None,
    ) -> AiResult:
        """
        TODO: แทนที่ด้วย in-house pipeline จริงเมื่อ train เสร็จ

        Steps (ปัจจุบันยืมจาก external HF Space demo — ดู _get_bone_age):
        1. DeepLabV3  — segment มือออกจากพื้นหลัง
        2. YOLOv11    — detect ROI: Carpals, Phalanges, RadiusUlna
        3. ConvNeXt   — predict bone age per ROI → weighted average → boneAgeMonths
        4. Grad-CAM   — สร้าง heatmap → upload → heatmapUrl
        5. Bayley-Pinneau — คำนวณ finalAdultHeightCm (จาก bone age + height)
           + targetHeightCm (mid-parental target, จาก father/mother height)
        6. Thai Growth Standards 2564
                      — heightPercentile, heightSdScore, bmi, bmiPercentile, riskFlag
        """
        if not self._loaded:
            return self._external_run(
                image_bytes, sex, height_cm, weight_kg, father_height_cm, mother_height_cm, date_of_birth
            )

        # TODO: real in-house pipeline goes here
        raise NotImplementedError("In-house pipeline not implemented yet")

    # ─── External demo model (ใช้เมื่อ weights ยังไม่ load) ──────────────────
    # ไม่มี mock fallback แล้ว — ถ้า external model ใช้ไม่ได้ให้ raise ออกไป
    # caller (predict.py) จะ report ai-failed → assessment เป็น FAILED ให้แพทย์กดวิเคราะห์ใหม่
    # ดีกว่าคืนตัวเลขสุ่มที่ดูเหมือนผลจริงในระบบการแพทย์

    def _get_bone_age(self, image_bytes: bytes, sex: str) -> tuple[float, float, bytes | None]:
        """
        Returns (bone_age_months, confidence, heatmap_bytes).

        Calls the external HF Space demo (see external_bone_age.py for the
        "experimental, unvalidated" caveat). Any failure (missing image,
        network, cold-start timeout, bad response) raises — the pipeline
        reports the assessment as FAILED instead of fabricating a result.
        """
        if not image_bytes:
            raise ValueError("no X-ray image bytes — cannot run bone age model")
        ext = predict_external(image_bytes, sex)
        confidence = self._confidence_from_sd(ext["sd_months"])
        return ext["bone_age_months"], confidence, ext["heatmap_bytes"]

    @staticmethod
    def _confidence_from_sd(sd_months: float) -> float:
        """
        Maps the external model's own reported uncertainty (SD in months) to
        a 0-1 confidence score for display, anchored to the same +/-24mo
        (~2 SD) threshold _classify_deviation already uses as "clinically
        significant discrepancy" — an SD at that scale maps to ~0 confidence,
        an SD near 0 maps to ~1. This is a display heuristic, not a validated
        statistical confidence interval; sd_months itself is the honest number.
        """
        return round(max(0.05, min(0.99, 1 - sd_months / 24)), 3)

    def _external_run(
        self,
        image_bytes: bytes,
        sex: str,
        height_cm: float | None,
        weight_kg: float | None,
        father_height_cm: float | None,
        mother_height_cm: float | None,
        date_of_birth: str | None,
    ) -> AiResult:
        chron_age_months = self._chron_age_months(date_of_birth)

        bone_age_months, confidence, heatmap_bytes = self._get_bone_age(image_bytes, sex)
        deviation = round(bone_age_months - chron_age_months)

        risk_flag = self._classify_deviation(deviation)

        target_height_cm = self._target_height(sex, father_height_cm, mother_height_cm)
        final_adult_height_cm = self._final_adult_height(sex, bone_age_months, height_cm)

        height_percentile, height_sd_score, risk_flag = self._height_stats(
            sex, height_cm, chron_age_months, risk_flag
        )

        bmi, bmi_percentile = self._bmi_stats(height_cm, weight_kg, sex, chron_age_months)

        # WHO ไม่นิยาม weight-for-age เกิน 10 ขวบ — ปล่อยเป็น None ให้ UI แสดง "—"
        # (ห้ามสุ่มค่า percentile ในระบบการแพทย์)
        _, weight_percentile = weight_zscore_percentile(sex, chron_age_months, weight_kg) \
            if weight_kg else (None, None)

        return AiResult(
            boneAgeMonths=float(bone_age_months),
            confidence=confidence,
            heatmapUrl=None,
            heatmapBytes=heatmap_bytes,
            finalAdultHeightCm=final_adult_height_cm,
            targetHeightCm=target_height_cm,
            heightPercentile=height_percentile,
            weightPercentile=weight_percentile,
            bmi=bmi,
            bmiPercentile=bmi_percentile,
            heightSdScore=height_sd_score,
            riskFlag=risk_flag,
            isMock=False,              # ไม่มี mock pipeline แล้ว — ล้มเหลว = FAILED ไม่ใช่ผลจำลอง
            aiProvider="external_demo",  # UI ใช้บอกว่าผลมาจากโมเดลทดลอง (ยังไม่ validate ทางคลินิก)
        )

    @staticmethod
    def _chron_age_months(date_of_birth: str | None) -> int:
        if not date_of_birth:
            return 120
        try:
            dob = datetime.fromisoformat(str(date_of_birth)[:10])
            now = datetime.now()
            return (now.year - dob.year) * 12 + (now.month - dob.month)
        except ValueError:
            return 120

    @staticmethod
    def _classify_deviation(deviation_months: int) -> str:
        """
        Bone age (BA) vs chronological age (CA) — "advanced"/"delayed" flag.

        Threshold: |BA - CA| >= 24 months (~2 SD) is the standard clinical
        cutoff for a significant discrepancy warranting workup/referral;
        differences under ~12 months (~1 SD) are commonly normal variation.
        The true SD is age/sex/method-dependent (no single public numeric
        table exists for it, similar to the Bayley-Pinneau situation), but
        multiple independent reproducibility studies converge on SD ~= 1
        year, making a flat 12/24-month cutoff a defensible approximation —
        NOT the previous +/-6 months, which had no citation and sits well
        inside what the literature calls normal variation.

        Sources:
          - AMBOSS Pediatric Endocrinology (resident teaching reference):
            "bone age >2 SD above/below chronological age" = advanced/delayed;
            "<1 year often normal", ">=2 years -> refer to endocrinology".
          - Medscape/eMedicine, "Constitutional Growth Delay": bone age
            "delayed by longer than 1 year and often by 2 years or more"
            as the diagnostic hallmark.
          - Bull RK, Edwards PD, Kemp PM, Fry S, Hughes IA. "Bone age
            assessment: a large scale comparison of the Greulich and Pyle
            and Tanner and Whitehouse (TW2) methods." Arch Dis Child.
            1999;81(2):172-3. (PMID 10490531) — real-world BA assessment
            reproducibility data underlying the ~1-year SD approximation.

        This only sets the stored normal/advanced/delayed flag (the
        `riskFlag` enum column has a fixed value set — no "mild" tier here
        without a migration). The finer 5-tier classification with
        patient-facing clinical-advice text lives client-side in
        apps/web/src/lib/boneAgeClassification.ts, computed from the same
        boneAgeMonths/chronAgeMonths already available on the assessment —
        no backend change needed to add that nuance.
        """
        if deviation_months >= 24:
            return "advanced"
        if deviation_months <= -24:
            return "delayed"
        return "normal"

    @staticmethod
    def _target_height(sex: str, father_cm: float | None, mother_cm: float | None) -> float | None:
        if not father_cm or not mother_cm:
            return None
        return (father_cm + mother_cm + 13) / 2 if sex == "M" else (father_cm + mother_cm - 13) / 2

    @staticmethod
    def _final_adult_height(sex: str, bone_age_months: int, height_cm: float | None) -> float | None:
        """Bayley-Pinneau prediction — see pipeline/bayley_pinneau.py for method + citation."""
        return predict_adult_height_cm(sex, bone_age_months, height_cm)

    @staticmethod
    def _height_stats(
        sex: str, height_cm: float | None, chron_age_months: int, risk_flag: str
    ) -> tuple[float | None, float | None, str]:
        if not height_cm or height_cm <= 0 or chron_age_months <= 0:
            return None, None, risk_flag

        z, p = height_zscore_percentile(sex, chron_age_months, height_cm)

        # Fallback: rough approximation ถ้าตาราง LMS ยังไม่ได้กรอก
        if z is None:
            age_years = chron_age_months / 12
            median_h = 76 + age_years * 6.5 if sex == "M" else 75 + age_years * 6.2
            z = round((height_cm - median_h) / 4.5, 2)
            raw_p = 50 + 34.1 * math.tanh(z * 0.82)
            p = float(round(max(1, min(99, raw_p))))

        if p is not None:
            if p < 3 and risk_flag == "normal":
                risk_flag = "short_stature"
            if p > 97 and risk_flag == "normal":
                risk_flag = "tall_stature"

        return p, z, risk_flag

    @staticmethod
    def _bmi_stats(
        height_cm: float | None,
        weight_kg: float | None,
        sex: str = "M",
        age_months: int = 120,
    ) -> tuple[float | None, float | None]:
        if not height_cm or not weight_kg or height_cm <= 0 or weight_kg <= 0:
            return None, None
        bmi = round((weight_kg / ((height_cm / 100) ** 2)) * 10) / 10
        # นอกช่วงตาราง LMS → None ให้ UI แสดง "—" (ห้ามสุ่มค่าแทน)
        _, bmi_percentile = bmi_zscore_percentile(sex, age_months, bmi)
        return bmi, bmi_percentile


# Singleton — โหลดครั้งเดียวตอน startup ผ่าน load_models()
pipeline = BoneAgePipeline()
