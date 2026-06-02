# โตทัน (Toh-Tan) 🦴

> ระบบประเมินอายุกระดูกและติดตามการเจริญเติบโตสำหรับเด็กไทย  
> ส่งประกวด **NSC2026** — National Software Contest 2026

---

## โปรเจคนี้ทำอะไร?

แพทย์อัปโหลดภาพ X-ray มือของเด็ก → AI วิเคราะห์อายุกระดูก → แพทย์เขียน recommendation → ผู้ปกครองดูผลได้ผ่านแอป → ระบบส่งแจ้งเตือนและสร้าง PDF รายงานให้อัตโนมัติ

---

## โครงสร้างโปรเจค

โปรเจคนี้แบ่งออกเป็น **7 Services** แต่ละส่วนทำงานเป็นอิสระจากกัน

```
totan-nsc2026/
│
├── apps/
│   ├── web/               🖥️  หน้าเว็บที่ผู้ใช้เห็น (Next.js 14)      :3100
│   ├── gateway/           🚪  ประตูกลาง รับทุก request แล้วส่งต่อ     :3000
│   ├── auth-service/      🔐  จัดการ login / logout / สิทธิ์          :3001
│   ├── patient-service/   👶  ข้อมูลเด็ก การประเมิน recommendation    :3002
│   ├── ai-service/        🧠  วิเคราะห์ภาพ X-ray ด้วย AI (FastAPI)    :8000
│   ├── report-service/    📄  สร้าง PDF รายงาน                        :3003
│   └── notify-service/    🔔  ส่ง Email และ Push Notification          :3004
│
├── packages/
│   └── shared-types/      📦  TypeScript types ที่ทุก service ใช้ร่วมกัน
│
├── docker-compose.yml     🐳  รัน PostgreSQL และ Redis ด้วยคำสั่งเดียว
├── pnpm-workspace.yaml    📂  บอกว่า folder ไหนเป็น service บ้าง
└── README.md              📖  ไฟล์นี้
```

---

## ขั้นตอนที่ 1 — โหลดของที่ต้องใช้

โหลดและติดตั้งทีละอัน ไม่ต้องรีบ:

| โปรแกรม | โหลดที่ไหน | ทำไมต้องใช้ |
|---------|-----------|------------|
| **Node.js 20 LTS** | [nodejs.org](https://nodejs.org) → กดปุ่มซ้ายมือ (LTS) | รัน JavaScript บนเครื่อง |
| **pnpm** | รัน `npm install -g pnpm` ใน PowerShell | จัดการ packages ทุก service |
| **Docker Desktop** | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) | รัน PostgreSQL และ Redis บนเครื่อง |
| **Git** | [git-scm.com](https://git-scm.com) | จัดการ version code |

### เช็คว่าโหลดครบ

เปิด PowerShell ใหม่แล้วพิมพ์ทีละบรรทัด — ต้องได้ตัวเลขทุกอัน:

```powershell
node --version    # ต้องได้ v20.x.x
pnpm --version    # ต้องได้ 8.x.x หรือสูงกว่า
docker --version  # ต้องได้ Docker version ...
git --version     # ต้องได้ git version ...
```

---

## ขั้นตอนที่ 2 — Clone โปรเจคลงเครื่อง

```powershell
git clone https://github.com/Neptz2/totan-nsc2026.git
cd totan-nsc2026
```

---

## ขั้นตอนที่ 3 — Install packages ทุก service ครั้งเดียว

```powershell
pnpm install
```

> ครั้งแรกอาจใช้เวลา 2-3 นาที เพราะต้องโหลด packages ทั้งหมด

---

## ขั้นตอนที่ 4 — ตั้งค่า Environment Variables

แต่ละ service มีไฟล์ `.env.example` เป็นตัวอย่าง ต้องคัดลอกมาเป็น `.env` ก่อน:

```powershell
copy apps\auth-service\.env.example    apps\auth-service\.env
copy apps\patient-service\.env.example apps\patient-service\.env
copy apps\ai-service\.env.example      apps\ai-service\.env
copy apps\report-service\.env.example  apps\report-service\.env
copy apps\notify-service\.env.example  apps\notify-service\.env
copy apps\gateway\.env.example         apps\gateway\.env
copy apps\web\.env.example             apps\web\.env
```

> ไฟล์ `.env` เก็บ password และ secret — ไม่ขึ้น git (อยู่ใน .gitignore แล้ว)

---

## ขั้นตอนที่ 5 — เปิด Docker Desktop ก่อน

เปิด **Docker Desktop** ทิ้งไว้ รอจนไอคอน whale ที่ taskbar หยุดหมุน (แปลว่าพร้อมแล้ว)

จากนั้นรัน database และ Redis:

```powershell
pnpm docker:up
```

> ครั้งแรกอาจช้าเพราะต้อง download image — รอจนขึ้น `Started` ทุก container

---

## ขั้นตอนที่ 6 — รัน Services

ต้องเปิด **PowerShell แยกกัน** สำหรับแต่ละ service เพราะแต่ละอันรันค้างไว้

**Terminal 1 — Auth Service**
```powershell
cd apps\auth-service
pnpm run start:dev
# รอจนเห็น: 🔐 Auth Service running on port 3001
```

**Terminal 2 — Patient Service**
```powershell
cd apps\patient-service
pnpm run start:dev
# รอจนเห็น: 👶 Patient Service running on port 3002
```

**Terminal 3 — API Gateway**
```powershell
cd apps\gateway
pnpm run start:dev
# รอจนเห็น: 🚪 API Gateway running on port 3000
```

**Terminal 4 — Frontend**
```powershell
cd apps\web
pnpm run dev
# รอจนเห็น: ▲ Next.js ready on http://localhost:3100
```

> AI Service (Python) รันแยก — ดู `apps/ai-service/README.md`  
> Report และ Notify Service ไม่จำเป็นต้องรันตอน develop ขั้นต้น

---

## ขั้นตอนที่ 7 — เปิดเว็บ ✅

เปิด browser ไปที่ **http://localhost:3100**

---

## คำสั่งที่ใช้บ่อย

```powershell
pnpm docker:up      # เปิด database + redis
pnpm docker:down    # ปิด database + redis
pnpm docker:logs    # ดู log ของ database
pnpm install        # install packages ใหม่ทุก service
```

---

## แก้ปัญหาที่พบบ่อย

| ปัญหา | วิธีแก้ |
|-------|---------|
| `Cannot connect to database` | เช็คว่า Docker Desktop เปิดอยู่ แล้วรัน `pnpm docker:up` ใหม่ |
| `Port already in use` | มีโปรแกรมอื่นใช้ port นั้นอยู่ ปิดแล้วรันใหม่ |
| `Module not found` | รัน `pnpm install` ก่อน |
| `JWT_SECRET is not defined` | ยังไม่ได้ copy `.env.example` เป็น `.env` |
| `[WARN] Moving ... installed by a different package manager` | warning ปกติ ไม่ใช่ error ข้ามได้เลย |

---

## การแบ่งงานทีม

| คน | รับผิดชอบ | Services |
|----|-----------|---------|
| **Person A** | หน้าเว็บ + ประตูกลาง | `web` + `gateway` |
| **Person B** | Backend ทั้งหมด + PDF + แจ้งเตือน | `auth-service` + `patient-service` + `report-service` + `notify-service` |
| **Person C** | AI วิเคราะห์ X-ray | `ai-service` |
