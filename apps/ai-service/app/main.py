import logging
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .pipeline import pipeline
from .api.health import router as health_router
from .api.predict import router as predict_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    pipeline.load_models()
    yield


app = FastAPI(
    title="โตทัน — AI Service",
    description="Bone Age Assessment API: DeepLabV3 → YOLOv11 → ConvNeXt Tiny → Grad-CAM → TW3",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(predict_router)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
