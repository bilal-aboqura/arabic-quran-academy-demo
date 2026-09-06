-- Durable external-payment settlement. Existing wallet payments remain valid
-- paid records; new gateway payments point at a server-created Order.
DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('LOCAL_TEST', 'PAYMOB', 'KASHIER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "OrderItemKind" AS ENUM ('COURSE', 'STORE_PRODUCT', 'SUBSCRIPTION_PLAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Payment" ALTER COLUMN "course_id" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "order_id" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "provider" "PaymentProvider";
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "provider_reference" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'PAID';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3) NOT NULL DEFAULT 'EGP';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "settled_at" TIMESTAMP(3);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "student_membership_id" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "provider" "PaymentProvider",
  "provider_reference" TEXT,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'EGP',
  "amount_minor" INTEGER NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "paid_at" TIMESTAMP(3),
  "failed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Order_student_membership_id_fkey" FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Order_amount_minor_nonnegative" CHECK ("amount_minor" >= 0)
);
CREATE UNIQUE INDEX "Order_tenant_id_user_id_idempotency_key_key" ON "Order"("tenant_id", "user_id", "idempotency_key");
CREATE INDEX "Order_tenant_id_user_id_status_created_at_idx" ON "Order"("tenant_id", "user_id", "status", "created_at" DESC);
CREATE INDEX "Order_student_membership_id_created_at_idx" ON "Order"("student_membership_id", "created_at" DESC);
CREATE INDEX "Order_provider_provider_reference_idx" ON "Order"("provider", "provider_reference");

CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "kind" "OrderItemKind" NOT NULL,
  "target_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "unit_amount_minor" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_amount_nonnegative" CHECK ("unit_amount_minor" >= 0),
  CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0)
);
CREATE INDEX "OrderItem_order_id_idx" ON "OrderItem"("order_id");

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "event_id" TEXT NOT NULL,
  "provider_reference" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "raw_payload" JSONB NOT NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentAttempt_provider_event_id_key" ON "PaymentAttempt"("provider", "event_id");
CREATE INDEX "PaymentAttempt_order_id_created_at_idx" ON "PaymentAttempt"("order_id", "created_at" DESC);
CREATE INDEX "PaymentAttempt_tenant_id_provider_created_at_idx" ON "PaymentAttempt"("tenant_id", "provider", "created_at" DESC);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Payment_order_id_key" ON "Payment"("order_id");
CREATE INDEX "Payment_tenant_id_provider_created_at_idx" ON "Payment"("tenant_id", "provider", "created_at" DESC);

-- Defense in depth: an order cannot bind a student membership from another
-- academy, even if a future repository accidentally supplies mismatched IDs.
CREATE OR REPLACE FUNCTION nexaclass_assert_order_tenant_membership() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "TenantMembership"
    WHERE "id" = NEW."student_membership_id"
      AND "tenant_id" = NEW."tenant_id"
      AND "user_id" = NEW."user_id"
  ) THEN
    RAISE EXCEPTION 'Order tenant, user, and student membership must match';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Order_tenant_membership_check"
  BEFORE INSERT OR UPDATE OF "tenant_id", "user_id", "student_membership_id" ON "Order"
  FOR EACH ROW EXECUTE FUNCTION nexaclass_assert_order_tenant_membership();
