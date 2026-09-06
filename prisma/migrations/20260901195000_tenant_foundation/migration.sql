-- NexaClass tenant foundation (additive / legacy-safe).
--
-- IMPORTANT DEPLOYMENT PROCEDURE
-- 1. Back up and restore production into staging.
-- 2. Verify legacy schema drift before running this migration.
-- 3. Run this migration through `prisma migrate deploy`; do not use db push
--    for production after this point.
-- 4. The follow-up backfill creates the legacy tenant and membership rows.
--
-- This migration does not alter or delete existing tenant-less application
-- records, so legacy routes retain their current behavior during the bridge.

DO $$ BEGIN
  CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'TEACHER', 'ASSISTANT', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TenantMembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TenantDomainKind" AS ENUM ('SUBDOMAIN', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TenantDomainStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_ar" TEXT,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX IF NOT EXISTS "Tenant_status_idx" ON "Tenant"("status");

CREATE TABLE IF NOT EXISTS "TenantMembership" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "TenantRole" NOT NULL,
  "status" "TenantMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "display_name" TEXT,
  "student_number" TEXT,
  "guardian_number" TEXT,
  "teacher_subject" TEXT,
  "teacher_avatar_url" TEXT,
  "copyright_code" VARCHAR(10),
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantMembership_tenant_id_user_id_key" ON "TenantMembership"("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "TenantMembership_user_id_status_idx" ON "TenantMembership"("user_id", "status");
CREATE INDEX IF NOT EXISTS "TenantMembership_tenant_id_role_status_idx" ON "TenantMembership"("tenant_id", "role", "status");

CREATE TABLE IF NOT EXISTS "TenantDomain" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "kind" "TenantDomainKind" NOT NULL,
  "status" "TenantDomainStatus" NOT NULL DEFAULT 'PENDING',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantDomain_hostname_key" ON "TenantDomain"("hostname");
CREATE INDEX IF NOT EXISTS "TenantDomain_tenant_id_status_idx" ON "TenantDomain"("tenant_id", "status");

CREATE TABLE IF NOT EXISTS "TenantSettings" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "platform_name" TEXT,
  "platform_name_en" TEXT,
  "logo_storage_key" TEXT,
  "primary_color" TEXT,
  "default_locale" TEXT NOT NULL DEFAULT 'ar',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "social_links" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TenantSettings_tenant_id_key" ON "TenantSettings"("tenant_id");

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "requested_ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_user_id_expires_at_idx" ON "PasswordResetToken"("user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expires_at_idx" ON "PasswordResetToken"("expires_at");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "actor_user_id" TEXT,
  "actor_membership_id" TEXT,
  "action" TEXT NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_tenant_id_created_at_idx" ON "AuditLog"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "AuditLog_actor_user_id_created_at_idx" ON "AuditLog"("actor_user_id", "created_at");
CREATE INDEX IF NOT EXISTS "AuditLog_action_created_at_idx" ON "AuditLog"("action", "created_at");

DO $$ BEGIN
  ALTER TABLE "TenantMembership"
    ADD CONSTRAINT "TenantMembership_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "TenantMembership"
    ADD CONSTRAINT "TenantMembership_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "TenantDomain"
    ADD CONSTRAINT "TenantDomain_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "TenantSettings"
    ADD CONSTRAINT "TenantSettings_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_actor_membership_id_fkey"
    FOREIGN KEY ("actor_membership_id") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Existing legacy password-request rows may contain plaintext credentials.
-- Clear those columns in place when the legacy table exists. The table itself
-- remains temporarily for compatibility with historic deployments, but all
-- application routes have been retired before this migration is deployed.
DO $$ BEGIN
  IF to_regclass('public."PasswordChangeRequest"') IS NOT NULL THEN
    UPDATE "PasswordChangeRequest"
      SET "requested_old_password" = NULL,
          "requested_new_password_plain" = NULL;
  END IF;
END $$;
