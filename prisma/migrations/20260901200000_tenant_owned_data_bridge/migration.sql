-- NexaClass tenant-owned data bridge (additive, reversible at the application layer).
--
-- This migration intentionally leaves every tenant_id nullable and preserves
-- legacy global unique constraints. The guarded backfill assigns all legacy
-- rows to exactly one legacy tenant before tenant-aware routes are enabled.
-- Do not run against an unverified production database.

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "student_membership_id" TEXT;
ALTER TABLE "ActivationCode" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "LiveStream" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "HomeworkSubmission" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "StoreProduct" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "UserStorePurchase" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "UserPlatformSubscription" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "LessonRating" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "LessonPlaybackAttempt" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;

CREATE INDEX IF NOT EXISTS "Category_tenant_id_slug_idx" ON "Category"("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "Category_tenant_id_order_idx" ON "Category"("tenant_id", "order");
CREATE INDEX IF NOT EXISTS "Course_tenant_id_slug_idx" ON "Course"("tenant_id", "slug");
CREATE INDEX IF NOT EXISTS "Course_tenant_id_is_published_idx" ON "Course"("tenant_id", "is_published");
CREATE INDEX IF NOT EXISTS "Enrollment_tenant_id_user_id_idx" ON "Enrollment"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "Enrollment_tenant_id_student_membership_id_idx" ON "Enrollment"("tenant_id", "student_membership_id");
CREATE INDEX IF NOT EXISTS "ActivationCode_tenant_id_code_idx" ON "ActivationCode"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "QuizAttempt_tenant_id_user_id_quiz_id_idx" ON "QuizAttempt"("tenant_id", "user_id", "quiz_id");
CREATE INDEX IF NOT EXISTS "Payment_tenant_id_created_at_idx" ON "Payment"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "LiveStream_tenant_id_course_id_idx" ON "LiveStream"("tenant_id", "course_id");
CREATE INDEX IF NOT EXISTS "Review_tenant_id_order_idx" ON "Review"("tenant_id", "order");
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_tenant_id_user_id_idx" ON "HomeworkSubmission"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "Conversation_tenant_id_staff_user_id_idx" ON "Conversation"("tenant_id", "staff_user_id");
CREATE INDEX IF NOT EXISTS "Conversation_tenant_id_student_user_id_idx" ON "Conversation"("tenant_id", "student_user_id");
CREATE INDEX IF NOT EXISTS "Message_tenant_id_conversation_id_idx" ON "Message"("tenant_id", "conversation_id");
CREATE INDEX IF NOT EXISTS "StoreProduct_tenant_id_is_active_sort_order_created_at_idx" ON "StoreProduct"("tenant_id", "is_active", "sort_order", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "UserStorePurchase_tenant_id_user_id_created_at_idx" ON "UserStorePurchase"("tenant_id", "user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_tenant_id_is_active_sort_order_idx" ON "SubscriptionPlan"("tenant_id", "is_active", "sort_order");
CREATE INDEX IF NOT EXISTS "UserPlatformSubscription_tenant_id_user_id_expires_at_idx" ON "UserPlatformSubscription"("tenant_id", "user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "LessonRating_tenant_id_lesson_id_idx" ON "LessonRating"("tenant_id", "lesson_id");
CREATE INDEX IF NOT EXISTS "LessonPlaybackAttempt_tenant_id_user_id_lesson_id_idx" ON "LessonPlaybackAttempt"("tenant_id", "user_id", "lesson_id");

DO $$ BEGIN
  ALTER TABLE "Category" ADD CONSTRAINT "Category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Course" ADD CONSTRAINT "Course_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_student_membership_id_fkey" FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LiveStream" ADD CONSTRAINT "LiveStream_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "UserStorePurchase" ADD CONSTRAINT "UserStorePurchase_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "UserPlatformSubscription" ADD CONSTRAINT "UserPlatformSubscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LessonRating" ADD CONSTRAINT "LessonRating_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LessonPlaybackAttempt" ADD CONSTRAINT "LessonPlaybackAttempt_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
