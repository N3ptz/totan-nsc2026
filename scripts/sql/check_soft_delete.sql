SELECT id, name, "deletedAt",
  CASE WHEN "deletedAt" IS NULL THEN 'active' ELSE 'soft-deleted' END AS status
FROM children
ORDER BY "createdAt" DESC;

SELECT
  COUNT(*) FILTER (WHERE "deletedAt" IS NULL)     AS active,
  COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) AS deleted,
  COUNT(*)                                         AS total
FROM children;
