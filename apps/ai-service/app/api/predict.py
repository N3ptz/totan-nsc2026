import logging
import httpx
from fastapi import APIRouter, BackgroundTasks

from ..schemas import PredictRequest, AiResult
from ..config import settings
from ..pipeline import pipeline

logger = logging.getLogger(__name__)
router = APIRouter()


async def _upload_heatmap(heatmap_bytes: bytes, content_type: str = "image/png") -> str | None:
    """Upload heatmap bytes → patient-service → Supabase → คืน URL"""
    try:
        upload_url = f"{settings.PATIENT_SERVICE_URL}/assessments/upload-heatmap"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                upload_url,
                files={"file": ("heatmap.png", heatmap_bytes, content_type)},
                headers={"x-internal-secret": settings.INTERNAL_SECRET},
            )
            r.raise_for_status()
            return r.json().get("heatmapUrl")
    except Exception as exc:
        logger.warning(f"Heatmap upload failed (non-fatal): {exc}")
        return None


async def _report_failure(assessment_id: str) -> None:
    """แจ้ง patient-service ว่า pipeline ล้มเหลว — กัน assessment ค้าง PROCESSING ตลอดไป"""
    try:
        url = f"{settings.PATIENT_SERVICE_URL}/assessments/{assessment_id}/ai-failed"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(url, headers={"x-internal-secret": settings.INTERNAL_SECRET})
            r.raise_for_status()
    except Exception as exc:
        logger.error(f"Failed to report failure [{assessment_id}]: {exc}")


async def _process_and_callback(req: PredictRequest) -> None:
    """
    Background task:
    1. Download X-ray image จาก xrayImageUrl
    2. Run bone age pipeline
    3. Upload heatmap → patient-service → Supabase
    4. POST result กลับ patient-service /assessments/:id/ai-result
    """
    try:
        # 1. Download X-ray (mock mode ไม่ใช้ image_bytes — ไม่ block pipeline ถ้า URL ใช้ไม่ได้)
        image_bytes = b""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(req.xrayImageUrl)
                resp.raise_for_status()
                image_bytes = resp.content
        except Exception as dl_exc:
            logger.warning(f"Image download skipped [{req.assessmentId}]: {dl_exc}")

        # 2. Pipeline
        result: AiResult = pipeline.run(
            image_bytes=image_bytes,
            sex=req.sex,
            height_cm=req.heightCm,
            weight_kg=req.weightKg,
            father_height_cm=req.fatherHeightCm,
            mother_height_cm=req.motherHeightCm,
            date_of_birth=req.dateOfBirth,
        )

        # 3. Upload heatmap (ถ้า pipeline ส่ง bytes กลับมา)
        if result.heatmapBytes:
            result.heatmapUrl = await _upload_heatmap(result.heatmapBytes)

        # 4. Callback → patient-service
        callback_url = f"{settings.PATIENT_SERVICE_URL}/assessments/{req.assessmentId}/ai-result"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                callback_url,
                json=result.model_dump(exclude={"heatmapBytes"}),
                headers={"x-internal-secret": settings.INTERNAL_SECRET},
            )
            r.raise_for_status()
            logger.info(f"Assessment {req.assessmentId} completed")

    except Exception as exc:
        # ไม่ crash server — แจ้ง patient-service ให้ mark เป็น FAILED แทนที่จะค้าง PROCESSING
        logger.error(f"Pipeline failed [{req.assessmentId}]: {exc}")
        await _report_failure(req.assessmentId)


@router.post("/predict", status_code=202)
async def predict(req: PredictRequest, background_tasks: BackgroundTasks):
    """
    รับ assessmentId + xrayImageUrl → ประมวลผล async → callback patient-service

    Returns 202 Accepted ทันที ผลจะถูก POST กลับผ่าน /assessments/:id/ai-result
    """
    background_tasks.add_task(_process_and_callback, req)
    return {"message": "accepted", "assessmentId": req.assessmentId}
