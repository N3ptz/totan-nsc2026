"""
External bone-age model — third-party HuggingFace Space demo
(FadyI22/BoneAssetmentV1), used as an interim real-model source while this
service's own DeepLabV3->YOLOv11->ConvNeXt pipeline is still unimplemented.

IMPORTANT CAVEAT: this is an unaffiliated individual's public Gradio demo —
no model card, no accuracy validation, no license/citation available at
integration time. It is a genuine improvement over the random-jitter mock
(a real model runs on the actual image), but it is NOT a clinically
validated pipeline. Every result produced through here is tagged
aiProvider="external_demo" (see bone_age.py) specifically so the UI can
label it as experimental rather than presenting it as equivalent to a
validated in-house model.

Verified live (see apps/ai-service — manual check, 2026-07-04):
  /bone_age            -> {bone_age_months, bone_age_years, readable, sex}
  /confidence_interval -> {mean_months, sd_months, k, lower_months, upper_months, interval_str}
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

logger = logging.getLogger(__name__)

_HF_SPACE = "FadyI22/BoneAssetmentV1"
_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = Client(_HF_SPACE)
    return _client


def predict_external(image_bytes: bytes, sex: str) -> dict:
    """
    Calls the external Gradio Space for bone age + confidence + Grad-CAM.

    Raises on any failure (network, cold-start timeout, unexpected response
    shape) — the caller (bone_age.py) is responsible for catching this and
    falling back to the mock pipeline so one flaky third-party call never
    leaves an assessment stuck in "processing".
    """
    client = _get_client()
    gradio_sex = "male" if sex == "M" else "female"

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        img = handle_file(tmp_path)

        bone_age = client.predict(image=img, sex=gradio_sex, api_name="/bone_age")
        ci = client.predict(image=img, sex=gradio_sex, k=1.0, api_name="/confidence_interval")
        heatmap_path = client.predict(image=img, sex=gradio_sex, api_name="/gradcam")

        with open(heatmap_path, "rb") as f:
            heatmap_bytes = f.read()

        return {
            "bone_age_months": float(bone_age["bone_age_months"]),
            "sd_months": float(ci["sd_months"]),
            "heatmap_bytes": heatmap_bytes,
        }
    finally:
        Path(tmp_path).unlink(missing_ok=True)
