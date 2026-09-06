-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_ADMIN');

-- AlterTable
ALTER TABLE "PlatformAdministrator" ADD COLUMN "role" "PlatformAdminRole" NOT NULL DEFAULT 'PLATFORM_ADMIN';

-- CreateTable
CREATE TABLE "SaaSInvoice" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "amount" DECIMAL(12, 2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EGP',
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "transaction_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaaSInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaaSInvoice_tenant_id_created_at_idx" ON "SaaSInvoice"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "SaaSInvoice_status_created_at_idx" ON "SaaSInvoice"("status", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "SaaSInvoice" ADD CONSTRAINT "SaaSInvoice_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaaSInvoice" ADD CONSTRAINT "SaaSInvoice_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SaaSPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
