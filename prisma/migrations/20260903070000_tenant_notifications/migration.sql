-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('ENROLLMENT', 'PAYMENT', 'ASSIGNMENT_SUBMITTED', 'ASSIGNMENT_GRADED', 'QUIZ_COMPLETED', 'ANNOUNCEMENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "recipient_membership_id" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "message" TEXT NOT NULL,
    "message_ar" TEXT,
    "link_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_tenant_id_recipient_membership_id_is_read_cre_idx" ON "Notification"("tenant_id", "recipient_membership_id", "is_read", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipient_membership_id_fkey" FOREIGN KEY ("recipient_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
