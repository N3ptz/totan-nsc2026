"""
External bone-age model — the team's own model hosted on a HuggingFace Space
(FadyI22/BoneAssetmentV1), used as an interim real-model source while this
service's in-process DeepLabV3->YOLOv11->ConvNeXt pipeline is still
unimplemented.

IMPORTANT CAVEAT: the Space is an experimental build — its accuracy has not
been clinically validated yet. Every result produced through here is tagged
aiProvider="external_demo" (see bone_age.py) specifically so the UI can label
it as experimental rather than presenting it as equivalent to a validated
production model.

Verified live (see apps/ai-service — manual check, 2026-07-04; confidence_pct
added to /bone_age by the Space team, confirmed 2026-07-23):
  /bone_age            -> {bone_age_months, bone_age_years, readable, confidence_pct, sex}
  /confidence_interval -> {mean_months, sd_months, k, lower_months, upper_months, interval_str}
                          (Space still exposes it but we no longer call it —
                          confidence comes straight from /bone_age.confidence_pct)
  /gradcam              -> local file path (str) to the downloaded overlay image

NOTE on passing the image: we upload raw bytes (via a temp file) rather than
handing the Space a remote URL to fetch itself. handle_file(url) requires the
Space's own server to be able to reach that URL — which fails for anything
not on the public internet (confirmed: local dev serves X-rays from
localhost, which HF's infra obviously can't reach), and is a fragile
assumption even in production (signed URLs, firewalls, etc). Pushing bytes
directly works regardless of where the file is actually stored.
"""

import logging
import tempfile
from pathlib import Path
from gradio_client import Client, handle_file

from ..config import settings

logger = logging.getLogger(__name__)

_HF_SPACE = "FadyI22/BoneAssetmentV1"
_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        # HF_TOKEN จาก .env — auth กับ Space (จำเป็นถ้า Space เป็น private และช่วยเรื่อง rate limit)
        # gradio_client >= 2.x ใช้ชื่อ param ว่า `token` (เดิม hf_token)
        _client = Client(_HF_SPACE, token=settings.HF_TOKEN or None)
    return _client


def predict_external(image_bytes: bytes, sex: str) -> dict:
    """
    Calls the external Gradio Space for bone age + confidence + Grad-CAM.

    Raises on any failure (network, cold-start timeout, unexpected response
    shape) — the exception propagates up through bone_age.py to predict.py,
    which reports the assessment as FAILED (never stuck in "processing",
    never a fabricated mock result).
    """
    client = _get_client()
    gradio_sex = "male" if sex == "M" else "female"

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        img = handle_file(tmp_path)

        # ต้องเรียก "เรียงลำดับ" เท่านั้น — ยืนยันแล้ว (11 ก.ค. 2026) ว่ายิง endpoint
        # ขนานกันทำให้ Space ฝั่งโน้น raise exception (model state ไม่ thread-safe /
        # GPU concurrency limit) ยิงเรียงผ่านตลอด แลกกับ round-trip ช้าลง
        bone_age = client.predict(image=img, sex=gradio_sex, api_name="/bone_age")

        # confidence_pct (0-100) มาจากโมเดลโดยตรง — ถ้าไม่มีถือว่า Space ผิดเวอร์ชัน
        # ให้ fail ชัด ๆ (assessment เป็น FAILED) ดีกว่าเงียบ ๆ คำนวณค่าแทนเอง
        if bone_age.get("confidence_pct") is None:
            raise ValueError(
                f"HF Space /bone_age response missing confidence_pct — got keys {list(bone_age)}"
            )

        heatmap_path = client.predict(image=img, sex=gradio_sex, api_name="/gradcam")

        with open(heatmap_path, "rb") as f:
            heatmap_bytes = f.read()

        return {
            "bone_age_months": float(bone_age["bone_age_months"]),
            "confidence_pct": float(bone_age["confidence_pct"]),
            "heatmap_bytes": heatmap_bytes,
        }
    finally:
        Path(tmp_path).unlink(missing_ok=True)
