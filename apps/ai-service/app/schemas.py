from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class PredictRequest(BaseModel):
    assessmentId: str
    xrayImageUrl: str
    sex: str = "M"                   # M = ชาย, F = หญิง
    dateOfBirth: str | None = None   # ISO date — สำหรับคำนวณ chronological age
    heightCm: float | None = None
    weightKg: float | None = None
    fatherHeightCm: float | None = None  # สำหรับคำนวณ Target Height (TW3)
    motherHeightCm: float | None = None


class AiResult(BaseModel):
    """ตรงกับ field ที่ assessments.service.ts#saveAiResult รับ"""
    boneAgeMonths: float
    confidence: float
    heatmapUrl: str | None = None
    # pipeline ใส่ heatmap bytes ที่นี่ → predict.py จะ upload แล้ว exclude ก่อน callback
    heatmapBytes: bytes | None = None
    finalAdultHeightCm: float | None = None
    targetHeightCm: float | None = None
    heightPercentile: float | None = None
    weightPercentile: float | None = None
    bmi: float | None = None
    bmiPercentile: float | None = None
    heightSdScore: float | None = None
    riskFlag: str = "normal"  # normal | short_stature | tall_stature | advanced | delayed
