-- Final tenant boundary enforcement.
--
-- Existing installations first apply the bridge, run the guarded legacy
-- backfill, then run `npm run db:finalize:tenant-constraints`.  The NOT VALID
-- checks below are nevertheless enforced for every new write immediately,
-- while allowing `prisma migrate deploy` to finish before an operator runs
-- that data backfill.  The finalizer validates these checks and converts the
-- columns to physical NOT NULL constraints after it has proven the backfill.

-- Global slugs/codes prevented independent academies from using natural names.
DROP INDEX IF EXISTS "Category_slug_key";
DROP INDEX IF EXISTS "Course_slug_key";
DROP INDEX IF EXISTS "ActivationCode_code_key";
DROP INDEX IF EXISTS "Conversation_staff_user_id_student_user_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Category_tenant_slug_key"
  ON "Category"("tenant_id", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Course_tenant_slug_key"
  ON "Course"("tenant_id", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "ActivationCode_tenant_code_key"
  ON "ActivationCode"("tenant_id", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_tenant_staff_student_key"
  ON "Conversation"("tenant_id", "staff_user_id", "student_user_id");

-- A CHECK constraint marked NOT VALID still rejects new invalid rows.  This
-- creates a safe operational boundary during the one-time legacy backfill.
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "Course" ADD CONSTRAINT "Course_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_student_membership_id_required"
  CHECK ("student_membership_id" IS NOT NULL) NOT VALID;
ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_student_membership_id_required"
  CHECK ("student_membership_id" IS NOT NULL) NOT VALID;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "LiveStream" ADD CONSTRAINT "LiveStream_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "UserStorePurchase" ADD CONSTRAINT "UserStorePurchase_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "UserPlatformSubscription" ADD CONSTRAINT "UserPlatformSubscription_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "LessonRating" ADD CONSTRAINT "LessonRating_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;
ALTER TABLE "LessonPlaybackAttempt" ADD CONSTRAINT "LessonPlaybackAttempt_tenant_id_required"
  CHECK ("tenant_id" IS NOT NULL) NOT VALID;

-- The bridge used SET NULL while tenant IDs were nullable. The final schema
-- owns these records through the tenant, so deleting an academy cannot leave
-- records that violate the now-required ownership boundary.
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_tenant_id_fkey";
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_tenant_id_fkey";
ALTER TABLE "Enrollment" DROP CONSTRAINT IF EXISTS "Enrollment_tenant_id_fkey";
ALTER TABLE "Enrollment" DROP CONSTRAINT IF EXISTS "Enrollment_student_membership_id_fkey";
ALTER TABLE "ActivationCode" DROP CONSTRAINT IF EXISTS "ActivationCode_tenant_id_fkey";
ALTER TABLE "QuizAttempt" DROP CONSTRAINT IF EXISTS "QuizAttempt_tenant_id_fkey";
ALTER TABLE "QuizAttempt" DROP CONSTRAINT IF EXISTS "QuizAttempt_student_membership_id_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_tenant_id_fkey";
ALTER TABLE "LiveStream" DROP CONSTRAINT IF EXISTS "LiveStream_tenant_id_fkey";
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_tenant_id_fkey";
ALTER TABLE "HomeworkSubmission" DROP CONSTRAINT IF EXISTS "HomeworkSubmission_tenant_id_fkey";
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_tenant_id_fkey";
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_tenant_id_fkey";
ALTER TABLE "StoreProduct" DROP CONSTRAINT IF EXISTS "StoreProduct_tenant_id_fkey";
ALTER TABLE "UserStorePurchase" DROP CONSTRAINT IF EXISTS "UserStorePurchase_tenant_id_fkey";
ALTER TABLE "SubscriptionPlan" DROP CONSTRAINT IF EXISTS "SubscriptionPlan_tenant_id_fkey";
ALTER TABLE "UserPlatformSubscription" DROP CONSTRAINT IF EXISTS "UserPlatformSubscription_tenant_id_fkey";
ALTER TABLE "LessonRating" DROP CONSTRAINT IF EXISTS "LessonRating_tenant_id_fkey";
ALTER TABLE "LessonPlaybackAttempt" DROP CONSTRAINT IF EXISTS "LessonPlaybackAttempt_tenant_id_fkey";

ALTER TABLE "Category" ADD CONSTRAINT "Category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_student_membership_id_fkey" FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_student_membership_id_fkey" FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveStream" ADD CONSTRAINT "LiveStream_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserStorePurchase" ADD CONSTRAINT "UserStorePurchase_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPlatformSubscription" ADD CONSTRAINT "UserPlatformSubscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonRating" ADD CONSTRAINT "LessonRating_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonPlaybackAttempt" ADD CONSTRAINT "LessonPlaybackAttempt_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
