from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os

app = FastAPI(
    title="โตทัน — AI Service",
    description="Bone Age Assessment API: DeepLabV3 → YOLOv11 → ConvNeXt Tiny → Grad-CAM → TW3",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Response Models ──────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    service: str

class PredictResponse(BaseModel):
    bone_age_months: float
    bone_age_years: float
    confidence: float
    final_adult_height_cm: float | None
    percentile: float | None
    heatmap_url: str | None

# ─── Routes ──────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok", "service": "totan-ai-service"}

@app.post("/predict", response_model=PredictResponse)
async def predict(
    file: UploadFile = File(...),
    sex: str = "M",          # M = ชาย, F = หญิง
    height_cm: float = None, # ส่วนสูงปัจจุบัน (สำหรับคำนวณ FAH)
    weight_kg: float = None,
):
    """
    รับภาพ X-ray มือซ้าย → วิเคราะห์อายุกระดูก → คำนวณ Final Adult Height

    Pipeline:
    1. DeepLabV3  — ตัดพื้นหลัง
    2. YOLOv11    — แบ่ง ROI (Carpals / Phalanges / RadiusUlna)
    3. ConvNeXt Tiny — ทำนายอายุกระดูก
    4. Grad-CAM   — สร้าง heatmap
    5. TW3        — คำนวณ FAH
    6. Thai Growth Standards 2564 — แปลงเป็น percentile
    """
    if file.content_type not in ["image/jpeg", "image/png", "image/dicom"]:
        raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์ JPEG, PNG, DICOM")

    # TODO: implement pipeline
    # image_bytes = await file.read()
    # result = pipeline.run(image_bytes, sex, height_cm, weight_kg)

    return PredictResponse(
        bone_age_months=120.0,   # placeholder
        bone_age_years=10.0,
        confidence=0.92,
        final_adult_height_cm=165.0,
        percentile=50.0,
        heatmap_url=None,
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
