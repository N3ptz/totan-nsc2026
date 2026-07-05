-- ─── Migrations สำหรับ production ที่ตั้ง DB_SYNC=false ─────────────────────
-- Dev ปกติไม่ต้องรัน (TypeORM synchronize สร้างคอลัมน์ให้อัตโนมัติ)
-- ทุกคำสั่งเป็น idempotent (IF NOT EXISTS) — รันซ้ำได้ปลอดภัย

-- ══ auth db (totan_auth) ══════════════════════════════════════════════════

-- doctors: phone และ avatarUrl
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS phone       VARCHAR,
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- parents: avatarUrl
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- ══ patient db (totan_patient) ════════════════════════════════════════════

-- assessments: aiProvider — แหล่งที่มาของ bone age (mock | external_demo)
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS "aiProvider" VARCHAR NOT NULL DEFAULT 'mock';
