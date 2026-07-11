import asyncio
import logging
import httpx
from fastapi import APIRouter, BackgroundTasks

from ..schemas import PredictRequest, AiResult
from ..config import settings
from ..pipeline import pipeline

logger = logging.getLogger(__name__)
router = APIRouter()


def _sniff_image_type(data: bytes) -> tuple[str, str]:
    """Returns (filename, content_type) from magic bytes — the external demo
    model's /gradcam endpoint returns WebP, not PNG, so this can't be hardcoded."""
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "heatmap.webp", "image/webp"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "heatmap.png", "image/png"
    if data[:2] == b"\xff\xd8":
        return "heatmap.jpg", "image/jpeg"
    return "heatmap.png", "image/png"  # unknown — best-effort fallback


async def _upload_heatmap(heatmap_bytes: bytes) -> str | None:
    """Upload heatmap bytes → patient-service → Supabase → คืน URL"""
    try:
        filename, content_type = _sniff_image_type(heatmap_bytes)
        upload_url = f"{settings.PATIENT_SERVICE_URL}/assessments/upload-heatmap"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                upload_url,
                files={"file": (filename, heatmap_bytes, content_type)},
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
        # 1. Download X-ray — โมเดลต้องใช้ภาพจริงเสมอ (ไม่มี mock ให้ข้ามได้แล้ว)
        #    ดาวน์โหลดไม่ได้ = pipeline ล้มเหลว → except ด้านล่าง report เป็น FAILED
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(req.xrayImageUrl)
            resp.raise_for_status()
            image_bytes = resp.content

        # 2. Pipeline — offloaded to a thread since the external model call
        #    is a blocking network request that could take seconds; running
        #    it directly here would stall the whole event loop (all other
        #    requests, including health checks) for that long.
        result: AiResult = await asyncio.to_thread(
            pipeline.run,
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
