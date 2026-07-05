# คู่มือ Deploy โตทัน — Railway (backend + AI) + Vercel (web)

> อัปเดต: ก.ค. 2026 — Dockerfiles ทั้ง 5 service build + smoke test ผ่านแล้ว
> (gateway proxy → auth/patient/ai/notify ครบทุกเส้นทางใน Docker network)

## ภาพรวม

| Service | Dockerfile | Port | Health check path |
|---|---|---|---|
| gateway | `apps/gateway/Dockerfile` | 3000 | `/health` |
| auth-service | `apps/auth-service/Dockerfile` | 3001 | `/auth/health` |
| patient-service | `apps/patient-service/Dockerfile` | 3002 | `/children/health` |
| notify-service | `apps/notify-service/Dockerfile` | 3004 | `/notify/health` |
| ai-service | `apps/ai-service/Dockerfile` | 8000 | `/ai/health` |
| web | — (Vercel) | — | — |

**Gateway เป็น service เดียวที่มี public domain** — ที่เหลือคุยกันผ่าน
`*.railway.internal` (private networking ของ Railway)

## ทดสอบเต็มระบบในเครื่องก่อน deploy

```bash
# ปิด dev servers ก่อน (พอร์ตชน) แล้ว:
docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build
curl http://localhost:3000/health          # gateway
curl http://localhost:3000/auth/health     # proxy → auth
# เว็บ dev ชี้ gateway เดิม: pnpm dev:web
```

## ขั้นตอนบน Railway

### 1. สร้าง Project + Infra
1. New Project → **Deploy PostgreSQL** ×1 (สร้าง database `totan_auth` และ `totan_patient` ใน instance เดียว ประหยัดกว่า) → เก็บ connection string
2. **Deploy Redis** ×1

### 2. สร้าง 5 services จาก GitHub repo
แต่ละ service: New Service → GitHub Repo `N3ptz/totan-nsc2026` แล้วตั้งใน Settings:
- **Root Directory**: `/` (ต้องเป็น root — Dockerfile ใช้ pnpm workspace lockfile)
- **Dockerfile Path**: ตามตารางข้างบน
- **Healthcheck Path**: ตามตารางข้างบน
- **Watch Paths** (ลด rebuild ไม่จำเป็น): `apps/<service>/**`, `pnpm-lock.yaml`

### 3. Environment variables ต่อ service

ทุกตัวที่มี `INTERNAL_SECRET` / `JWT_SECRET` **ต้องใช้ค่า random ใหม่ ห้ามใช้ค่าใน
.env.example** — generate ด้วย `openssl rand -hex 32` (JWT_SECRET หนึ่งค่าใช้ร่วม
gateway+auth, INTERNAL_SECRET หนึ่งค่าใช้ร่วม auth+patient+ai)

**gateway** (ตัวเดียวที่ Generate Domain):
```
JWT_SECRET=<random>
AUTH_SERVICE_URL=http://auth-service.railway.internal:3001
PATIENT_SERVICE_URL=http://patient-service.railway.internal:3002
AI_SERVICE_URL=http://ai-service.railway.internal:8000
NOTIFY_SERVICE_URL=http://notify-service.railway.internal:3004
WEB_ORIGIN=https://<โดเมน-vercel-ของเว็บ>
PORT=3000
```

**auth-service**:
```
DATABASE_URL=<postgres url>/totan_auth
JWT_SECRET=<random เดียวกับ gateway>
INTERNAL_SECRET=<random>
PATIENT_SERVICE_URL=http://patient-service.railway.internal:3002
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM   ← Gmail หรือ Resend
SUPABASE_* + STORAGE_*   ← ชุดเดียวกับ .env local (avatar upload)
PORT=3001
```

**patient-service**:
```
DATABASE_URL=<postgres url>/totan_patient
REDIS_URL=<redis url จาก Railway>
AI_SERVICE_URL=http://ai-service.railway.internal:8000
AUTH_SERVICE_URL=http://auth-service.railway.internal:3001
WEB_URL=https://<โดเมน-vercel>
INTERNAL_SECRET=<เดียวกับ auth>
SUPABASE_* + STORAGE_*   ← ต้องตั้งจริง (X-ray/heatmap; ไฟล์ local หายเมื่อ redeploy)
PORT=3002
```

**notify-service**:
```
REDIS_URL=<redis url>
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
PORT=3004
```
⚠️ scheduler เตือนนัดอยู่ใน patient-service — **ห้ามใช้ plan ที่ sleep**

**ai-service**:
```
PATIENT_SERVICE_URL=http://patient-service.railway.internal:3002
INTERNAL_SECRET=<เดียวกับ patient>
DEVICE=cpu
```

### 4. Database schema
Deploy ครั้งแรก: ปล่อย `DB_SYNC` ไม่ต้องตั้ง (default = synchronize เปิด) ให้
TypeORM สร้าง schema เอง → หลังระบบนิ่งแล้วตั้ง `DB_SYNC=false` ทั้ง auth และ
patient แล้วจัดการ schema ผ่าน `scripts/sql/migrations.sql` เท่านั้น

### 5. Web บน Vercel
- Import repo → Root Directory `apps/web` → Framework Next.js
- Env: `NEXT_PUBLIC_API_URL=https://<โดเมน-railway-ของ-gateway>`
- ได้โดเมนแล้ว กลับไปอัปเดต `WEB_ORIGIN` (gateway) และ `WEB_URL` (patient) ให้ตรง

### 6. เช็คหลัง deploy
```
curl https://<gateway>/health
curl https://<gateway>/auth/health
curl https://<gateway>/children/health
curl https://<gateway>/ai/health
curl https://<gateway>/notify/health
```
แล้วทดสอบ flow จริง: สมัคร → OTP → login → เพิ่มผู้ป่วย → อัปโหลด X-ray →
ได้ผลจากโมเดล (badge "AI ทดลอง") → ส่งผลให้ผู้ปกครอง (เมล)

## ข้อควรรู้
- Railway ไม่มี GPU → `DEVICE=cpu` (bone age มาจาก HF Space อยู่แล้ว ไม่กระทบ)
- Rate limit ของ gateway เป็น in-memory — ถ้า scale gateway หลาย replica ต้องย้ายไป Redis
- Gmail SMTP ลิมิต ~500 ฉบับ/วัน → production จริงแนะนำ Resend/Brevo
- ค่าใช้จ่ายประมาณ $10–25/เดือน (Postgres 1 instance 2 databases + Redis + 5 services)
