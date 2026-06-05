import math
import random
import logging
from datetime import datetime

from ..schemas import AiResult
from ..config import settings
from .growth_standards import (
    height_zscore_percentile,
    weight_zscore_percentile,
    bmi_zscore_percentile,
)

logger = logging.getLogger(__name__)


class BoneAgePipeline:
    """
    Bone Age Assessment Pipeline

    DeepLabV3 (segmentation) → YOLOv11 (ROI detection) → ConvNeXt Tiny (age prediction)
    → Grad-CAM (heatmap) → TW3 (Final Adult Height) → Thai Growth Standards 2564

    ────────────────────────────────────────────────────────────────────
    สิ่งที่ต้อง implement เพิ่ม:

    1. load_models()
       - โหลด weights จาก self.model_dir
       - DeepLabV3  → self.model_dir/deeplabv3.pt
       - YOLOv11    → self.model_dir/yolov11.pt
       - ConvNeXt   → self.model_dir/convnext_tiny.pt
       - ตั้ง self._loaded = True เมื่อโหลดสำเร็จ

    2. run()
       - แทนที่ _mock_run() ด้วย pipeline จริง
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
        logger.warning("Model weights not loaded — mock mode active")

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
        TODO: แทนที่ _mock_run() ด้วย pipeline จริง

        Steps:
        1. DeepLabV3  — segment มือออกจากพื้นหลัง
        2. YOLOv11    — detect ROI: Carpals, Phalanges, RadiusUlna
        3. ConvNeXt   — predict bone age per ROI → weighted average → boneAgeMonths
        4. Grad-CAM   — สร้าง heatmap → upload → heatmapUrl
        5. TW3        — คำนวณ finalAdultHeightCm + targetHeightCm
        6. Thai Growth Standards 2564
                      — heightPercentile, heightSdScore, bmi, bmiPercentile, riskFlag
        """
        if not self._loaded:
            return self._mock_run(sex, height_cm, weight_kg, father_height_cm, mother_height_cm, date_of_birth)

        # TODO: real pipeline goes here
        raise NotImplementedError("Real pipeline not implemented yet")

    # ─── Mock (ใช้เมื่อ weights ยังไม่ load) ─────────────────────────────────

    def _mock_run(
        self,
        sex: str,
        height_cm: float | None,
        weight_kg: float | None,
        father_height_cm: float | None,
        mother_height_cm: float | None,
        date_of_birth: str | None,
    ) -> AiResult:
        chron_age_months = self._chron_age_months(date_of_birth)

        deviation = round((random.random() - 0.5) * 16)
        bone_age_months = max(6, chron_age_months + deviation)
        confidence = round((0.82 + random.random() * 0.14) * 1000) / 1000

        risk_flag = "normal"
        if deviation <= -6:
            risk_flag = "delayed"
        elif deviation >= 6:
            risk_flag = "advanced"

        target_height_cm = self._target_height(sex, father_height_cm, mother_height_cm)
        final_adult_height_cm = self._final_adult_height(bone_age_months, height_cm)

        height_percentile, height_sd_score, risk_flag = self._height_stats(
            sex, height_cm, chron_age_months, risk_flag
        )

        bmi, bmi_percentile = self._bmi_stats(height_cm, weight_kg, sex, chron_age_months)

        _, weight_percentile = weight_zscore_percentile(sex, chron_age_months, weight_kg) \
            if weight_kg else (None, None)
        if weight_percentile is None and weight_kg:
            weight_percentile = round(30 + random.random() * 40)

        return AiResult(
            boneAgeMonths=float(bone_age_months),
            confidence=confidence,
            heatmapUrl=None,
            finalAdultHeightCm=final_adult_height_cm,
            targetHeightCm=target_height_cm,
            heightPercentile=height_percentile,
            weightPercentile=weight_percentile,
            bmi=bmi,
            bmiPercentile=bmi_percentile,
            heightSdScore=height_sd_score,
            riskFlag=risk_flag,
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
    def _target_height(sex: str, father_cm: float | None, mother_cm: float | None) -> float | None:
        if not father_cm or not mother_cm:
            return None
        return (father_cm + mother_cm + 13) / 2 if sex == "M" else (father_cm + mother_cm - 13) / 2

    @staticmethod
    def _final_adult_height(bone_age_months: int, height_cm: float | None) -> float | None:
        if not height_cm or height_cm <= 0:
            return None
        bone_age_years = bone_age_months / 12
        mult = 1.18 if bone_age_years < 11 else (1.10 if bone_age_years < 13 else 1.04)
        return round(height_cm * mult * 10) / 10

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
        _, bmi_percentile = bmi_zscore_percentile(sex, age_months, bmi)
        if bmi_percentile is None:
            bmi_percentile = round(40 + random.random() * 30)  # fallback
        return bmi, bmi_percentile


# Singleton — โหลดครั้งเดียวตอน startup ผ่าน load_models()
pipeline = BoneAgePipeline()
