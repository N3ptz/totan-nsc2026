-- ─── Migration: เพิ่มคอลัมน์ที่ขาดหายไป ──────────────────────────────────────

-- doctors: เพิ่ม phone และ avatarUrl
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS phone       VARCHAR,
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- parents: เพิ่ม avatarUrl
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

