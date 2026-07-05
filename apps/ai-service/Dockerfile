# syntax=docker/dockerfile:1
# Build context ต้องเป็น root ของ repo:
#   docker build -f apps/ai-service/Dockerfile -t totan-ai .
# บน Railway: Root Directory = / และ Dockerfile Path = apps/ai-service/Dockerfile
# Railway ไม่มี GPU — DEVICE=cpu (ตอนนี้ bone age มาจาก HF Space อยู่แล้ว)

FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY apps/ai-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/ai-service/app ./app
EXPOSE 8000
# Railway ส่ง PORT มาให้เอง — ต้อง bind ตามนั้น (local fallback 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
