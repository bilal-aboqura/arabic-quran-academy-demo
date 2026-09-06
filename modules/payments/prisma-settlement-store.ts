import { OrderItemKind, OrderStatus, PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PaymentProviderName, VerifiedPaymentEvent } from "@/modules/payments/provider";
import type { PaymentSettlementStore } from "@/modules/payments/settlement";

type Database = Prisma.TransactionClient;

function provider(value: PaymentProviderName): PaymentProvider {
  return value as PaymentProvider;
}

function paymentStatus(value: VerifiedPaymentEvent["status"]): PaymentStatus {
  return value as PaymentStatus;
}

function subscriptionExpiry(from: Date, durationKind: string): Date {
  const expiresAt = new Date(from);
  if (durationKind === "week") expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);
  else if (durationKind === "month") expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);
  else if (durationKind === "year") expiresAt.setUTCDate(expiresAt.getUTCDate() + 365);
  else throw new Error("Subscription plan has an invalid duration");
  return expiresAt;
}

/**
 * Prisma persistence for the provider-neutral settlement protocol. The root
 * instance starts a serializable transaction; nested calls reuse that same
 * transaction, so a paid status and its course/store/subscription grant are
 * indivisible.
 */
export class PrismaPaymentSettlementStore implements PaymentSettlementStore {
  constructor(
    private readonly db: Database = prisma as unknown as Database,
    private readonly transactionRunner: typeof prisma | null = prisma,
  ) {}

  async transaction<T>(work: (store: PaymentSettlementStore) => Promise<T>): Promise<T> {
    if (!this.transactionRunner) return work(this);
    return this.transactionRunner.$transaction(
      (tx) => work(new PrismaPaymentSettlementStore(tx, null)),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 15_000 },
    );
  }

  async findOrder(orderId: string) {
    return this.db.order.findUnique({
      where: { id: orderId },
      select: { id: true, tenantId: true, amountMinor: true, currency: true, status: true },
    });
  }

  async claimProviderEvent(input: { orderId: string; provider: PaymentProviderName; eventId: string; providerReference: string; rawPayload: unknown }) {
    const order = await this.db.order.findUnique({ where: { id: input.orderId }, select: { tenantId: true, userId: true } });
    if (!order) return false;
    try {
      await this.db.paymentAttempt.create({
        data: {
          orderId: input.orderId,
          tenantId: order.tenantId,
          userId: order.userId,
          provider: provider(input.provider),
          eventId: input.eventId,
          providerReference: input.providerReference,
          rawPayload: input.rawPayload as Prisma.InputJsonValue,
        },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  }

  async recordPaymentAttempt(input: { orderId: string; provider: PaymentProviderName; eventId: string; providerReference: string; status: VerifiedPaymentEvent["status"] }) {
    await this.db.paymentAttempt.update({
      where: { provider_eventId: { provider: provider(input.provider), eventId: input.eventId } },
      data: { status: paymentStatus(input.status), providerReference: input.providerReference },
    });
  }

  async markOrderPaidAndGrantEntitlements(input: { orderId: string; provider: PaymentProviderName; providerReference: string }) {
    const order = await this.db.order.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Payment order disappeared during settlement");

    const paid = await this.db.order.updateMany({
      where: { id: order.id, status: OrderStatus.PENDING },
      data: { status: OrderStatus.PAID, provider: provider(input.provider), providerReference: input.providerReference, paidAt: new Date(), failedAt: null },
    });
    if (paid.count === 0) return { newlyPaid: false };

    for (const item of order.items) {
      if (item.kind === OrderItemKind.COURSE) {
        const course = await this.db.course.findFirst({ where: { id: item.targetId, tenantId: order.tenantId }, select: { id: true } });
        if (!course) throw new Error("Purchased course no longer belongs to the order tenant");
        await this.db.enrollment.upsert({
          where: { userId_courseId: { userId: order.userId, courseId: course.id } },
          update: {},
          create: { tenantId: order.tenantId, userId: order.userId, studentMembershipId: order.studentMembershipId, courseId: course.id },
        });
      } else if (item.kind === OrderItemKind.STORE_PRODUCT) {
        const product = await this.db.storeProduct.findFirst({ where: { id: item.targetId, tenantId: order.tenantId }, select: { id: true } });
        if (!product) throw new Error("Purchased product no longer belongs to the order tenant");
        await this.db.userStorePurchase.upsert({
          where: { userId_productId: { userId: order.userId, productId: product.id } },
          update: {},
          create: { tenantId: order.tenantId, userId: order.userId, productId: product.id, pricePaid: new Prisma.Decimal(item.unitAmountMinor).div(100) },
        });
      } else if (item.kind === OrderItemKind.SUBSCRIPTION_PLAN) {
        const plan = await this.db.subscriptionPlan.findFirst({ where: { id: item.targetId, tenantId: order.tenantId }, select: { id: true, durationKind: true } });
        if (!plan) throw new Error("Purchased subscription plan no longer belongs to the order tenant");
        const now = new Date();
        const active = await this.db.userPlatformSubscription.findFirst({
          where: { tenantId: order.tenantId, userId: order.userId, expiresAt: { gt: now } },
          orderBy: { expiresAt: "desc" },
        });
        const startsAt = active?.expiresAt && active.expiresAt > now ? active.expiresAt : now;
        const expiresAt = subscriptionExpiry(startsAt, plan.durationKind);
        if (active) await this.db.userPlatformSubscription.update({ where: { id: active.id }, data: { expiresAt } });
        else await this.db.userPlatformSubscription.create({
          data: { tenantId: order.tenantId, userId: order.userId, planId: plan.id, pricePaid: new Prisma.Decimal(item.unitAmountMinor).div(100), expiresAt },
        });
      }
    }

    const courseItem = order.items.find((item) => item.kind === OrderItemKind.COURSE);
    await this.db.payment.upsert({
      where: { orderId: order.id },
      update: { provider: provider(input.provider), providerReference: input.providerReference, status: PaymentStatus.PAID, settledAt: new Date() },
      create: {
        tenantId: order.tenantId,
        userId: order.userId,
        courseId: courseItem?.targetId ?? null,
        orderId: order.id,
        provider: provider(input.provider),
        providerReference: input.providerReference,
        status: PaymentStatus.PAID,
        currency: order.currency,
        amount: new Prisma.Decimal(order.amountMinor).div(100),
        settledAt: new Date(),
      },
    });
    return { newlyPaid: true };
  }

  async markOrderFailed(input: { orderId: string; provider: PaymentProviderName; providerReference: string }) {
    await this.db.order.updateMany({
      where: { id: input.orderId, status: OrderStatus.PENDING },
      data: { status: OrderStatus.FAILED, provider: provider(input.provider), providerReference: input.providerReference, failedAt: new Date() },
    });
  }
}
