-- Tenant-local stored-balance bridge. This migration only adds new tables;
-- moving a legacy User.balance is performed by the separately guarded
-- backfill command after an operator has verified a backup/staging restore.
CREATE TYPE "TenantBalanceTransactionKind" AS ENUM (
  'LEGACY_OPENING_BALANCE',
  'MANUAL_CREDIT',
  'COURSE_PURCHASE',
  'STORE_PURCHASE',
  'SUBSCRIPTION_PURCHASE'
);

-- Secure quiz attempts use server-owned membership, timestamps, and answer
-- data. All fields remain nullable bridge fields until final tightening.
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "student_membership_id" TEXT;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "answers" JSONB;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "QuizAttempt_tenant_id_student_membership_id_quiz_id_idx"
  ON "QuizAttempt"("tenant_id", "student_membership_id", "quiz_id");
DO $$ BEGIN
  ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_student_membership_id_fkey"
  FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "TenantStudentAccount" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "student_membership_id" TEXT NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantStudentAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantBalanceTransaction" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "student_membership_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "kind" "TenantBalanceTransactionKind" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "idempotency_key" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantBalanceTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantStudentAccount_student_membership_id_key"
  ON "TenantStudentAccount"("student_membership_id");
CREATE UNIQUE INDEX "TenantStudentAccount_tenant_id_student_membership_id_key"
  ON "TenantStudentAccount"("tenant_id", "student_membership_id");
CREATE INDEX "TenantStudentAccount_tenant_id_idx" ON "TenantStudentAccount"("tenant_id");
CREATE UNIQUE INDEX "TenantBalanceTransaction_tenant_id_idempotency_key_key"
  ON "TenantBalanceTransaction"("tenant_id", "idempotency_key");
CREATE INDEX "TenantBalanceTransaction_tenant_id_student_membership_id_created_at_idx"
  ON "TenantBalanceTransaction"("tenant_id", "student_membership_id", "created_at" DESC);
CREATE INDEX "TenantBalanceTransaction_account_id_created_at_idx"
  ON "TenantBalanceTransaction"("account_id", "created_at" DESC);

ALTER TABLE "TenantStudentAccount"
  ADD CONSTRAINT "TenantStudentAccount_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantStudentAccount"
  ADD CONSTRAINT "TenantStudentAccount_student_membership_id_fkey"
  FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantBalanceTransaction"
  ADD CONSTRAINT "TenantBalanceTransaction_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantBalanceTransaction"
  ADD CONSTRAINT "TenantBalanceTransaction_student_membership_id_fkey"
  FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantBalanceTransaction"
  ADD CONSTRAINT "TenantBalanceTransaction_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "TenantStudentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
