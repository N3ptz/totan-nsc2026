-- ─── Migration: patient-service database ─────────────────────────────────────

-- children: ทำให้ parentId เป็น nullable
ALTER TABLE children
  ALTER COLUMN "parentId" DROP NOT NULL;

-- children: ลบ inviteCode ออก (เปลี่ยนเป็นระบบ email แทน)
ALTER TABLE children
  DROP COLUMN IF EXISTS "inviteCode";

-- ── ทดสอบ Soft Delete ────────────────────────────────────────────────────────

-- 1. ดู record ที่ถูก soft delete แล้ว (deletedAt IS NOT NULL)
SELECT id, name, "doctorId", "deletedAt"
FROM children
WHERE "deletedAt" IS NOT NULL;

-- 2. ดูทั้งหมด รวมที่ถูกลบแล้ว (เปรียบเทียบ)
SELECT id, name, "deletedAt",
  CASE WHEN "deletedAt" IS NULL THEN 'active' ELSE 'soft-deleted' END AS status
FROM children
ORDER BY "createdAt" DESC;

-- 3. นับจำนวนแยกตาม status
SELECT
  COUNT(*) FILTER (WHERE "deletedAt" IS NULL)     AS active,
  COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) AS deleted,
  COUNT(*)                                         AS total
FROM children;

-- children: เพิ่มคอลัมน์ใหม่
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS "heightCm"      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "weightKg"      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "clinicalNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt"     TIMESTAMPTZ;

DELETE FROM assessments
WHERE status = 'pending';
