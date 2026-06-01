# โตทัน (Toh-Tan) 🦴

> ระบบประเมินอายุกระดูกและติดตามการเจริญเติบโตสำหรับเด็กไทย  
> ส่งประกวด **NSC2026** — National Software Contest 2026

---

## โปรเจคนี้ทำอะไร?

แพทย์อัปโหลดภาพ X-ray มือของเด็ก → AI วิเคราะห์อายุกระดูก → แพทย์เขียน recommendation → ผู้ปกครองดูผลได้ผ่านแอป → ระบบส่งแจ้งเตือนและสร้าง PDF รายงานให้อัตโนมัติ

---

## โครงสร้างโปรเจค

โปรเจคนี้แบ่งออกเป็น **7 ส่วน (Services)** แต่ละส่วนทำงานเป็นอิสระจากกัน เหมือนแผนกต่างๆ ในโรงพยาบาล

```
totan-nsc2026/
│
├── apps/
│   ├── web/               🖥️  หน้าเว็บที่ผู้ใช้เห็น (Next.js 14)
│   ├── gateway/           🚪  ประตูหน้าบ้าน รับทุก request แล้วส่งต่อ (NestJS)
│   ├── auth-service/      🔐  จัดการ login / logout / สิทธิ์การเข้าถึง (NestJS)
│   ├── patient-service/   👶  เก็บข้อมูลเด็ก การประเมิน recommendation (NestJS)
│   ├── ai-service/        🧠  วิเคราะห์ภาพ X-ray ด้วย AI (Python / FastAPI)
│   ├── report-service/    📄  สร้าง PDF รายงานผลการประเมิน (NestJS)
│   └── notify-service/    🔔  ส่ง Email และ Push Notification (NestJS)
│
├── packages/
│   └── shared-types/      📦  TypeScript types ที่ทุก service ใช้ร่วมกัน
│
├── docker-compose.yml     🐳  รัน database และ redis ด้วยคำสั่งเดียว
├── pnpm-workspace.yaml    📂  บอกว่า folder ไหนเป็น service บ้าง
└── README.md              📖  ไฟล์นี้
```

### แต่ละ Service รันที่ port อะไร?

| Service | Port | คืออะไร |
|---------|------|---------|
| `web` | 3100 | หน้าเว็บ — เปิด browser ไปที่ `localhost:3100` |
| `gateway` | 3000 | ประตูกลาง — frontend จะคุยกับตรงนี้อย่างเดียว |
| `auth-service` | 3001 | จัดการ user, login, JWT token |
| `patient-service` | 3002 | ข้อมูลผู้ป่วย, การประเมิน, recommendation |
| `ai-service` | 8000 | รับภาพ X-ray แล้วส่งผลวิเคราะห์กลับมา |
| `report-service` | 3003 | รับ event แล้วสร้าง PDF รายงาน |
| `notify-service` | 3004 | รับ event แล้วส่ง Email / Push Notification |

### services ทำงานร่วมกันยังไง? (Redis Pub/Sub)

`patient-service` จะยิง event ผ่าน Redis เมื่อมีสิ่งสำคัญเกิดขึ้น — `report-service` และ `notify-service` รับ event แล้วทำงานต่ออัตโนมัติ:

```
assessment.completed  →  report-service สร้าง PDF
                      →  notify-service แจ้งเตือนแพทย์และผู้ปกครอง

recommendation.sent   →  notify-service แจ้งเตือนผู้ปกครองว่ามีคำแนะนำใหม่

followup.due          →  notify-service แจ้งเตือนว่าถึงกำหนดติดตามผล
```

---

## ก่อนเริ่ม — ต้องมีอะไรบ้าง?

ติดตั้งให้ครบก่อนนะ:

| โปรแกรม | ใช้ทำอะไร | โหลดที่ไหน |
|---------|-----------|------------|
| Node.js 20+ | รัน JavaScript บนเครื่อง | [nodejs.org](https://nodejs.org) |
| pnpm | จัดการ packages (เร็วกว่า npm) | `npm install -g pnpm` |
| Docker Desktop | รัน database บนเครื่อง | [docker.com](https://www.docker.com/products/docker-desktop) |
| Python 3.11+ | รัน AI service | [python.org](https://www.python.org) |
| Git | จัดการ version code | [git-scm.com](https://git-scm.com) |

เช็คว่ามีครบมั้ยโดยรันใน terminal:
```bash
node --version    # ต้องได้ v20.x.x
pnpm --version    # ต้องได้ 8.x.x
docker --version  # ต้องได้ Docker version ...
python --version  # ต้องได้ Python 3.11.x
git --version     # ต้องได้ git version ...
```

---

## เริ่มต้นใช้งาน (ทำครั้งแรกครั้งเดียว)

### ขั้นตอนที่ 1 — Clone โปรเจคลงเครื่อง

```bash
git clone https://github.com/Neptz2/totan-nsc2026.git
cd totan-nsc2026
```

### ขั้นตอนที่ 2 — Install packages ทั้งหมด

คำสั่งนี้จะ install packages ของ **ทุก service พร้อมกันในครั้งเดียว**:
```bash
pnpm install
```

### ขั้นตอนที่ 3 — เปิด Database และ Redis

โปรเจคใช้ PostgreSQL (เก็บข้อมูล) และ Redis (รับส่ง event ระหว่าง service)  
รันด้วย Docker ได้เลย:
```bash
pnpm docker:up
```

> ครั้งแรกอาจใช้เวลาสักครู่เพราะต้อง download image

### ขั้นตอนที่ 4 — ตั้งค่า Environment Variables

แต่ละ service มีไฟล์ `.env.example` ให้ดูเป็นตัวอย่าง  
ต้องคัดลอกมาเป็น `.env` ก่อน (`.env` คือไฟล์เก็บ password/secret ที่ไม่ขึ้น git):

```bash
cp apps/auth-service/.env.example    apps/auth-service/.env
cp apps/patient-service/.env.example apps/patient-service/.env
cp apps/ai-service/.env.example      apps/ai-service/.env
cp apps/report-service/.env.example  apps/report-service/.env
cp apps/notify-service/.env.example  apps/notify-service/.env
cp apps/gateway/.env.example         apps/gateway/.env
cp apps/web/.env.example             apps/web/.env
```

---

## รัน Services

ต้องเปิด **terminal แยกกัน** สำหรับแต่ละ service (เพราะแต่ละอันรันค้างไว้):

**Terminal 1 — Auth Service**
```bash
cd apps/auth-service && pnpm run start:dev
# จะเห็น: 🔐 Auth Service running on port 3001
```

**Terminal 2 — Patient Service**
```bash
cd apps/patient-service && pnpm run start:dev
# จะเห็น: 👶 Patient Service running on port 3002
```

**Terminal 3 — AI Service**
```bash
cd apps/ai-service
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
# จะเห็น: Uvicorn running on http://0.0.0.0:8000
```

**Terminal 4 — Report Service**
```bash
cd apps/report-service && pnpm run start:dev
# จะเห็น: 📄 Report Service running on port 3003
```

**Terminal 5 — Notify Service**
```bash
cd apps/notify-service && pnpm run start:dev
# จะเห็น: 🔔 Notify Service running on port 3004
```

**Terminal 6 — API Gateway**
```bash
cd apps/gateway && pnpm run start:dev
# จะเห็น: 🚪 API Gateway running on port 3000
```

**Terminal 7 — Frontend (Next.js)**
```bash
cd apps/web && pnpm run dev
# จะเห็น: ▲ Next.js ready on http://localhost:3100
```

เปิด browser ไปที่ **http://localhost:3100** ได้เลย 🎉

---

## การแบ่งงานทีม

| คน | รับผิดชอบ | Service |
|----|-----------|---------|
| Person A | หน้าเว็บ + ประตูกลาง | `web` + `gateway` |
| Person B | ระบบ user + ข้อมูลผู้ป่วย + PDF + แจ้งเตือน | `auth-service` + `patient-service` + `report-service` + `notify-service` |
| Person C | AI วิเคราะห์ X-ray | `ai-service` |

---

## คำสั่งที่ใช้บ่อย

```bash
pnpm docker:up      # เปิด database + redis
pnpm docker:down    # ปิด database + redis
pnpm docker:logs    # ดู log ของ database
pnpm install        # install packages ใหม่ทุก service
```

---

## มีปัญหา?

- **port ชนกัน** — ตรวจสอบว่ามีโปรแกรมอื่นใช้ port 3000-3004, 8000, 3100 อยู่มั้ย
- **docker ไม่ขึ้น** — ตรวจสอบว่าเปิด Docker Desktop อยู่มั้ย
- **pnpm install error** — ลอง `pnpm install --frozen-lockfile` หรือลบ `node_modules` แล้ว install ใหม่
