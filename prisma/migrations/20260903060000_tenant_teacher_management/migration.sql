-- Staff profile and feature state belong to the academy, not User.role.
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "teachers_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantMembership" ADD COLUMN IF NOT EXISTS "teacher_homepage_order" INTEGER;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_teacher_homepage_order_range"
  CHECK ("teacher_homepage_order" IS NULL OR "teacher_homepage_order" BETWEEN 1 AND 4) NOT VALID;
CREATE INDEX IF NOT EXISTS "TenantMembership_tenant_teacher_homepage_order_idx"
  ON "TenantMembership"("tenant_id", "teacher_homepage_order");

-- Preserve existing featured teacher choices for the legacy/default tenant
-- when the membership bridge has already connected those user identities.
UPDATE "TenantMembership" membership
SET "teacher_homepage_order" = user_record."teacher_homepage_order"
FROM "User" user_record
WHERE membership."user_id" = user_record."id"
  AND membership."role" = 'TEACHER'
  AND membership."teacher_homepage_order" IS NULL
  AND user_record."teacher_homepage_order" BETWEEN 1 AND 4;
