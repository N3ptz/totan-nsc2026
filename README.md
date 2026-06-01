# โตทัน (Toh-Tan) 🦴

ระบบประเมินอายุกระดูกและติดตามการเจริญเติบโตสำหรับเด็กไทย  
**NSC2026** — National Software Contest 2026

---

## Services

| Service | Port | Stack | หน้าที่ |
|---------|------|-------|---------|
| `apps/gateway` | 3000 | NestJS | API Gateway, JWT verify, routing |
| `apps/auth-service` | 3001 | NestJS | Login, JWT, RBAC |
| `apps/patient-service` | 3002 | NestJS | ข้อมูลเด็ก, การประเมิน |
| `apps/ai-service` | 8000 | FastAPI | AI pipeline (X-ray → bone age) |
| `apps/web` | 3100 | Next.js 14 | Frontend |

## Quick Start

### 1. Prerequisites
- Node.js 20+, pnpm 8+, Docker, Python 3.11+

### 2. Start infrastructure
```bash
pnpm docker:up
```

### 3. Install dependencies
```bash
pnpm install
```

### 4. Setup .env ของแต่ละ service
```bash
# คัดลอก .env.example เป็น .env ทุก service
cp apps/auth-service/.env.example apps/auth-service/.env
cp apps/patient-service/.env.example apps/patient-service/.env
cp apps/gateway/.env.example apps/gateway/.env
cp apps/web/.env.example apps/web/.env
cp apps/ai-service/.env.example apps/ai-service/.env
```

### 5. Run all services (แต่ละ terminal)
```bash
# Terminal 1
cd apps/auth-service && pnpm run start:dev

# Terminal 2
cd apps/patient-service && pnpm run start:dev

# Terminal 3
cd apps/ai-service && python -m uvicorn app.main:app --reload

# Terminal 4
cd apps/gateway && pnpm run start:dev

# Terminal 5
cd apps/web && pnpm run dev
```

## Team

| คน | รับผิดชอบ |
|----|-----------|
| Person A | Frontend (web) + Gateway |
| Person B | Auth Service + Patient Service |
| Person C | AI Service (FastAPI) |
