import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export class TenantCommerceError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "FORBIDDEN" | "INSUFFICIENT_BALANCE" | "ALREADY_OWNED" | "INVALID_REQUEST", message: string) {
    super(message);
    this.name = "TenantCommerceError";
  }
}

type PurchaseInput = {
  tenantId: string;
  userId: string;
  idempotencyKey?: string | null;
};

function normalizedIdempotencyKey(value: string | null | undefined): string | null {
  const key = value?.trim() || "";
  if (!key) return null;
  if (key.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new TenantCommerceError("INVALID_REQUEST", "Invalid idempotency key");
  }
  return key;
}

async function requireStudentMembership(tx: Tx, input: PurchaseInput) {
  const membership = await tx.tenantMembership.findFirst({
    where: { tenantId: input.tenantId, userId: input.userId, role: "STUDENT", status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) throw new TenantCommerceError("FORBIDDEN", "Student membership required");
  return membership;
}

async function lockAccount(tx: Tx, tenantId: string, studentMembershipId: string) {
  const account = await tx.tenantStudentAccount.upsert({
    where: { studentMembershipId },
    update: {},
    create: { tenantId, studentMembershipId, balance: new Prisma.Decimal(0) },
    select: { id: true },
  });
  const rows = await tx.$queryRaw<Array<{ id: string; balance: Prisma.Decimal }>>`
    SELECT "id", "balance" FROM "TenantStudentAccount" WHERE "id" = ${account.id} FOR UPDATE
  `;
  const locked = rows[0];
  if (!locked) throw new TenantCommerceError("NOT_FOUND", "Tenant student account not found");
  return locked;
}

async function debit(tx: Tx, args: {
  tenantId: string; studentMembershipId: string; accountId: string; amount: Prisma.Decimal;
  kind: "COURSE_PURCHASE" | "STORE_PURCHASE" | "SUBSCRIPTION_PURCHASE";
  idempotencyKey: string | null; referenceType: string; referenceId: string;
}) {
  if (args.amount.lessThanOrEqualTo(0)) return;
  const result = await tx.tenantStudentAccount.updateMany({
    where: { id: args.accountId, tenantId: args.tenantId, balance: { gte: args.amount } },
    data: { balance: { decrement: args.amount } },
  });
  if (result.count !== 1) throw new TenantCommerceError("INSUFFICIENT_BALANCE", "رصيدك غير كافٍ لإتمام الشراء");
  await tx.tenantBalanceTransaction.create({
    data: {
      tenantId: args.tenantId,
      studentMembershipId: args.studentMembershipId,
      accountId: args.accountId,
      kind: args.kind,
      amount: args.amount.negated(),
      idempotencyKey: args.idempotencyKey,
      referenceType: args.referenceType,
      referenceId: args.referenceId,
    },
  });
}

async function hasPriorIdempotentDebit(tx: Tx, tenantId: string, idempotencyKey: string | null) {
  if (!idempotencyKey) return false;
  const record = await tx.tenantBalanceTransaction.findFirst({
    where: { tenantId, idempotencyKey }, select: { id: true },
  });
  return Boolean(record);
}

function transaction<T>(work: (tx: Tx) => Promise<T>) {
  return prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 15_000 });
}

export async function getTenantStudentBalance(tenantId: string, userId: string) {
  const account = await prisma.tenantStudentAccount.findFirst({
    where: { tenantId, studentMembership: { tenantId, userId, role: "STUDENT", status: "ACTIVE" } },
    select: { balance: true, studentMembershipId: true },
  });
  return account ? { balance: Number(account.balance), studentMembershipId: account.studentMembershipId } : { balance: 0, studentMembershipId: null };
}

/** Staff-only wallet credit. Negative/manual debits are intentionally not
 * supported by this compatibility endpoint; purchases are the only debit
 * path and always create a corresponding entitlement in the same transaction. */
export async function creditTenantStudentBalance(input: {
  tenantId: string;
  studentMembershipId: string;
  amount: number;
  idempotencyKey?: string | null;
  /** Administrative credits must have an accountable tenant actor. */
  actor: { userId: string; membershipId: string; ipAddress?: string | null; userAgent?: string | null; reason: string };
}) {
  const amount = new Prisma.Decimal(input.amount);
  if (!amount.isFinite() || amount.lessThanOrEqualTo(0)) throw new TenantCommerceError("INVALID_REQUEST", "Amount must be positive");
  const idempotencyKey = normalizedIdempotencyKey(input.idempotencyKey);
  return transaction(async (tx) => {
    const membership = await tx.tenantMembership.findFirst({ where: { id: input.studentMembershipId, tenantId: input.tenantId, role: "STUDENT", status: "ACTIVE" }, select: { id: true } });
    if (!membership) throw new TenantCommerceError("NOT_FOUND", "Student not found");
    const account = await lockAccount(tx, input.tenantId, membership.id);
    if (idempotencyKey) {
      const prior = await tx.tenantBalanceTransaction.findFirst({ where: { tenantId: input.tenantId, idempotencyKey }, select: { id: true } });
      if (prior) return { credited: true, idempotent: true };
    }
    await tx.tenantStudentAccount.update({ where: { id: account.id }, data: { balance: { increment: amount } } });
    await tx.tenantBalanceTransaction.create({ data: { tenantId: input.tenantId, studentMembershipId: membership.id, accountId: account.id, kind: "MANUAL_CREDIT", amount, idempotencyKey, referenceType: "MANUAL_CREDIT", referenceId: membership.id } });
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actor.userId,
        actorMembershipId: input.actor.membershipId,
        action: "TENANT_STUDENT_BALANCE_CREDITED",
        targetType: "TenantMembership",
        targetId: membership.id,
        metadata: { amount: Number(amount), reason: input.actor.reason },
        ipAddress: input.actor.ipAddress ?? null,
        userAgent: input.actor.userAgent ?? null,
      },
    });
    return { credited: true, idempotent: false };
  });
}

export async function purchaseCourseWithTenantBalance(input: PurchaseInput & { courseId: string }) {
  const idempotencyKey = normalizedIdempotencyKey(input.idempotencyKey);
  return transaction(async (tx) => {
    const membership = await requireStudentMembership(tx, input);
    const course = await tx.course.findFirst({
      where: { id: input.courseId, tenantId: input.tenantId, isPublished: true },
      select: { id: true, price: true },
    });
    if (!course) throw new TenantCommerceError("NOT_FOUND", "الدورة غير موجودة");
    const existing = await tx.enrollment.findFirst({ where: { tenantId: input.tenantId, userId: input.userId, courseId: course.id }, select: { id: true } });
    if (existing) return { enrolled: true, alreadyEnrolled: true, enrollmentId: existing.id };

    const account = await lockAccount(tx, input.tenantId, membership.id);
    const afterLockExisting = await tx.enrollment.findFirst({ where: { tenantId: input.tenantId, userId: input.userId, courseId: course.id }, select: { id: true } });
    if (afterLockExisting) return { enrolled: true, alreadyEnrolled: true, enrollmentId: afterLockExisting.id };

    const price = new Prisma.Decimal(course.price);
    const prior = await hasPriorIdempotentDebit(tx, input.tenantId, idempotencyKey);
    if (prior) throw new TenantCommerceError("INVALID_REQUEST", "This purchase request was already processed");
    const enrollment = await tx.enrollment.create({ data: { tenantId: input.tenantId, userId: input.userId, studentMembershipId: membership.id, courseId: course.id } });
    await debit(tx, { tenantId: input.tenantId, studentMembershipId: membership.id, accountId: account.id, amount: price, kind: "COURSE_PURCHASE", idempotencyKey, referenceType: "COURSE", referenceId: course.id });
    if (price.greaterThan(0)) await tx.payment.create({ data: { tenantId: input.tenantId, userId: input.userId, courseId: course.id, amount: price } });
    return { enrolled: true, alreadyEnrolled: false, enrollmentId: enrollment.id };
  });
}

export async function purchaseStoreProductWithTenantBalance(input: PurchaseInput & { productId: string }) {
  const idempotencyKey = normalizedIdempotencyKey(input.idempotencyKey);
  return transaction(async (tx) => {
    const membership = await requireStudentMembership(tx, input);
    const product = await tx.storeProduct.findFirst({ where: { id: input.productId, tenantId: input.tenantId, isActive: true }, select: { id: true, price: true } });
    if (!product) throw new TenantCommerceError("NOT_FOUND", "المنتج غير متاح");
    const existing = await tx.userStorePurchase.findFirst({ where: { tenantId: input.tenantId, userId: input.userId, productId: product.id }, select: { id: true } });
    if (existing) return { purchased: true, alreadyOwned: true, purchaseId: existing.id };
    // Preserve the legacy product promise: an active student-content plan in
    // this tenant waives the product charge. A plan from another tenant is
    // deliberately invisible to this calculation.
    const activeSubscription = await tx.userPlatformSubscription.findFirst({
      where: { tenantId: input.tenantId, userId: input.userId, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    const account = await lockAccount(tx, input.tenantId, membership.id);
    const lockedExisting = await tx.userStorePurchase.findFirst({ where: { tenantId: input.tenantId, userId: input.userId, productId: product.id }, select: { id: true } });
    if (lockedExisting) return { purchased: true, alreadyOwned: true, purchaseId: lockedExisting.id };
    const prior = await hasPriorIdempotentDebit(tx, input.tenantId, idempotencyKey);
    if (prior) throw new TenantCommerceError("INVALID_REQUEST", "This purchase request was already processed");
    const payable = activeSubscription ? new Prisma.Decimal(0) : new Prisma.Decimal(product.price);
    const purchase = await tx.userStorePurchase.create({ data: { tenantId: input.tenantId, userId: input.userId, productId: product.id, pricePaid: payable } });
    await debit(tx, { tenantId: input.tenantId, studentMembershipId: membership.id, accountId: account.id, amount: payable, kind: "STORE_PURCHASE", idempotencyKey, referenceType: "STORE_PRODUCT", referenceId: product.id });
    return { purchased: true, alreadyOwned: false, purchaseId: purchase.id };
  });
}

function expiryFromDuration(from: Date, durationKind: string) {
  const expiresAt = new Date(from);
  if (durationKind === "week") expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);
  else if (durationKind === "month") expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);
  else if (durationKind === "year") expiresAt.setUTCDate(expiresAt.getUTCDate() + 365);
  else throw new TenantCommerceError("INVALID_REQUEST", "Invalid subscription duration");
  return expiresAt;
}

export async function purchaseTenantSubscriptionWithBalance(input: PurchaseInput & { planId: string }) {
  const idempotencyKey = normalizedIdempotencyKey(input.idempotencyKey);
  return transaction(async (tx) => {
    const membership = await requireStudentMembership(tx, input);
    const plan = await tx.subscriptionPlan.findFirst({ where: { id: input.planId, tenantId: input.tenantId, isActive: true }, select: { id: true, price: true, durationKind: true } });
    if (!plan) throw new TenantCommerceError("NOT_FOUND", "الباقة غير متاحة");
    const now = new Date();
    const existing = await tx.userPlatformSubscription.findFirst({ where: { tenantId: input.tenantId, userId: input.userId, expiresAt: { gt: now } }, select: { id: true, expiresAt: true } });
    if (existing) throw new TenantCommerceError("ALREADY_OWNED", "أنت مشترك في المنصة بالفعل");
    const account = await lockAccount(tx, input.tenantId, membership.id);
    const lockedExisting = await tx.userPlatformSubscription.findFirst({ where: { tenantId: input.tenantId, userId: input.userId, expiresAt: { gt: now } }, select: { id: true } });
    if (lockedExisting) throw new TenantCommerceError("ALREADY_OWNED", "أنت مشترك في المنصة بالفعل");
    const prior = await hasPriorIdempotentDebit(tx, input.tenantId, idempotencyKey);
    if (prior) throw new TenantCommerceError("INVALID_REQUEST", "This purchase request was already processed");
    const expiresAt = expiryFromDuration(now, plan.durationKind);
    const subscription = await tx.userPlatformSubscription.create({ data: { tenantId: input.tenantId, userId: input.userId, planId: plan.id, pricePaid: plan.price, expiresAt } });
    await debit(tx, { tenantId: input.tenantId, studentMembershipId: membership.id, accountId: account.id, amount: new Prisma.Decimal(plan.price), kind: "SUBSCRIPTION_PURCHASE", idempotencyKey, referenceType: "SUBSCRIPTION_PLAN", referenceId: plan.id });
    return { subscriptionId: subscription.id, expiresAt };
  });
}

// Exported for focused unit tests with an isolated transaction client.
export const tenantWalletInternals = { normalizedIdempotencyKey, expiryFromDuration };
