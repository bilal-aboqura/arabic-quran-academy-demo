import { OrderItemKind, OrderStatus, PaymentProvider, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PaymentInitiation, PaymentProviderAdapter } from "@/modules/payments/provider";
import type { TenantActor } from "@/modules/tenants/types";

export type ExternalOrderKind = "COURSE" | "STORE_PRODUCT" | "SUBSCRIPTION_PLAN";

export class PaymentOrderError extends Error {
  constructor(public readonly code: "INVALID_REQUEST" | "NOT_FOUND" | "ALREADY_PAID" | "INCLUDED", message: string) {
    super(message);
    this.name = "PaymentOrderError";
  }
}

function minorAmount(amount: Prisma.Decimal) {
  const minor = amount.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  if (minor.isNegative() || !minor.isInteger() || minor.greaterThan(Number.MAX_SAFE_INTEGER)) {
    throw new PaymentOrderError("INVALID_REQUEST", "The product has an invalid price");
  }
  return minor.toNumber();
}

export function normalizePaymentIdempotencyKey(value: string | null | undefined) {
  const key = value?.trim() ?? "";
  if (!key || key.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new PaymentOrderError("INVALID_REQUEST", "A valid Idempotency-Key header is required");
  }
  return key;
}

async function pricedTarget(tx: Prisma.TransactionClient, actor: TenantActor, kind: ExternalOrderKind, targetId: string) {
  if (kind === "COURSE") {
    const target = await tx.course.findFirst({ where: { id: targetId, tenantId: actor.tenantId, isPublished: true }, select: { id: true, title: true, price: true } });
    if (!target) throw new PaymentOrderError("NOT_FOUND", "Course not found");
    return { title: target.title, amountMinor: minorAmount(target.price), kind: OrderItemKind.COURSE };
  }
  if (kind === "STORE_PRODUCT") {
    const target = await tx.storeProduct.findFirst({ where: { id: targetId, tenantId: actor.tenantId, isActive: true }, select: { id: true, title: true, price: true } });
    if (!target) throw new PaymentOrderError("NOT_FOUND", "Store product not found");
    const included = await tx.userPlatformSubscription.findFirst({
      where: { tenantId: actor.tenantId, userId: actor.userId, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (included) throw new PaymentOrderError("INCLUDED", "This product is included in the active subscription");
    return { title: target.title, amountMinor: minorAmount(target.price), kind: OrderItemKind.STORE_PRODUCT };
  }
  const target = await tx.subscriptionPlan.findFirst({ where: { id: targetId, tenantId: actor.tenantId, isActive: true }, select: { id: true, name: true, price: true } });
  if (!target) throw new PaymentOrderError("NOT_FOUND", "Subscription plan not found");
  return { title: target.name, amountMinor: minorAmount(target.price), kind: OrderItemKind.SUBSCRIPTION_PLAN };
}

/** Creates a server-priced external payment intent; no caller supplies amount. */
export async function createExternalOrder(input: {
  actor: TenantActor;
  kind: ExternalOrderKind;
  targetId: string;
  idempotencyKey: string;
}) {
  const targetId = input.targetId.trim();
  if (!targetId || targetId.length > 160) throw new PaymentOrderError("INVALID_REQUEST", "Invalid product identifier");
  return prisma.$transaction(async (tx) => {
    const membership = await tx.tenantMembership.findFirst({
      where: { id: input.actor.membershipId, tenantId: input.actor.tenantId, userId: input.actor.userId, role: "STUDENT", status: "ACTIVE" },
      select: { id: true },
    });
    if (!membership) throw new PaymentOrderError("NOT_FOUND", "Student membership not found");
    const target = await pricedTarget(tx, input.actor, input.kind, targetId);
    if (target.amountMinor === 0) throw new PaymentOrderError("INVALID_REQUEST", "Free products must use the normal enrollment flow");

    const existing = await tx.order.findFirst({
      where: { tenantId: input.actor.tenantId, userId: input.actor.userId, idempotencyKey: input.idempotencyKey },
      include: { items: true },
    });
    if (existing) {
      const item = existing.items[0];
      if (!item || item.kind !== target.kind || item.targetId !== targetId) {
        throw new PaymentOrderError("INVALID_REQUEST", "The idempotency key belongs to a different purchase");
      }
      return existing;
    }
    return tx.order.create({
      data: {
        tenantId: input.actor.tenantId,
        userId: input.actor.userId,
        studentMembershipId: membership.id,
        currency: "EGP",
        amountMinor: target.amountMinor,
        idempotencyKey: input.idempotencyKey,
        description: target.title,
        items: { create: { kind: target.kind, targetId, title: target.title, unitAmountMinor: target.amountMinor, quantity: 1 } },
      },
      include: { items: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 15_000 });
}

/** Initiation does not grant anything. It only records a provider reference for a pending server order. */
export async function initiateExternalOrder(input: {
  orderId: string;
  actor: TenantActor;
  callbackUrl: string;
  provider: PaymentProviderAdapter;
}) : Promise<{ orderId: string; status: OrderStatus; initiation: PaymentInitiation | null }> {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, tenantId: input.actor.tenantId, userId: input.actor.userId, studentMembershipId: input.actor.membershipId },
  });
  if (!order) throw new PaymentOrderError("NOT_FOUND", "Payment order not found");
  if (order.status === OrderStatus.PAID) return { orderId: order.id, status: order.status, initiation: null };
  if (order.status !== OrderStatus.PENDING) throw new PaymentOrderError("ALREADY_PAID", "Payment order is no longer payable");
  const initiation = await input.provider.initiate({
    orderId: order.id,
    tenantId: order.tenantId,
    amountMinor: order.amountMinor,
    currency: order.currency,
    callbackUrl: input.callbackUrl,
    idempotencyKey: order.idempotencyKey,
    description: order.description,
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { provider: initiation.provider as PaymentProvider, providerReference: initiation.providerReference },
  });
  return { orderId: order.id, status: OrderStatus.PENDING, initiation };
}
