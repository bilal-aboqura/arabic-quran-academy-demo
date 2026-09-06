-- Platform SaaS billing is intentionally separate from student commerce.
DO $$ BEGIN
  CREATE TYPE "TenantSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "PlatformAdministrator" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformAdministrator_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformAdministrator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PlatformAdministrator_user_id_key" ON "PlatformAdministrator"("user_id");
CREATE INDEX "PlatformAdministrator_is_active_idx" ON "PlatformAdministrator"("is_active");

CREATE TABLE "SaaSPlan" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "currency" VARCHAR(3) NOT NULL DEFAULT 'EGP',
  "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "billing_interval_months" INTEGER NOT NULL DEFAULT 1,
  "trial_months" INTEGER NOT NULL DEFAULT 0,
  "feature_flags" JSONB NOT NULL DEFAULT '{}',
  "limits" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SaaSPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SaaSPlan_code_key" ON "SaaSPlan"("code");
CREATE INDEX "SaaSPlan_is_active_sort_order_idx" ON "SaaSPlan"("is_active", "sort_order");

CREATE TABLE "TenantSubscription" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" "TenantSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "current_period_end" TIMESTAMP(3),
  "trial_ends_at" TIMESTAMP(3),
  "canceled_at" TIMESTAMP(3),
  "feature_flag_overrides" JSONB NOT NULL DEFAULT '{}',
  "limit_overrides" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TenantSubscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TenantSubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SaaSPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TenantSubscription_tenant_id_key" ON "TenantSubscription"("tenant_id");
CREATE INDEX "TenantSubscription_plan_id_status_idx" ON "TenantSubscription"("plan_id", "status");
CREATE INDEX "TenantSubscription_status_current_period_end_idx" ON "TenantSubscription"("status", "current_period_end");
