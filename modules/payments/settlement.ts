import type { PaymentProviderAdapter, PaymentProviderName, VerifiedPaymentEvent, WebhookRequest } from "@/modules/payments/provider";

/**
 * The persistence adapter intentionally maps to future Order, Payment and
 * PaymentAttempt tables without coupling the provider protocol to Prisma.
 * Its paid transition and entitlement grant MUST execute in one database
 * transaction, and `claimProviderEvent` MUST be backed by a unique key.
 */
export interface PaymentSettlementStore {
  transaction<T>(work: (store: PaymentSettlementStore) => Promise<T>): Promise<T>;
  findOrder(orderId: string): Promise<{
    id: string;
    tenantId: string;
    amountMinor: number;
    currency: string;
    status: "PENDING" | "PAID" | "FAILED" | "CANCELED";
  } | null>;
  /** true means this event was newly claimed; false means it was already processed. */
  claimProviderEvent(input: { orderId: string; provider: PaymentProviderName; eventId: string; providerReference: string; rawPayload: unknown }): Promise<boolean>;
  recordPaymentAttempt(input: { orderId: string; provider: PaymentProviderName; eventId: string; providerReference: string; status: VerifiedPaymentEvent["status"] }): Promise<void>;
  /** Must atomically mark paid and create the related course/store/subscription entitlement. */
  markOrderPaidAndGrantEntitlements(input: { orderId: string; provider: PaymentProviderName; providerReference: string }): Promise<{ newlyPaid: boolean }>;
  markOrderFailed?(input: { orderId: string; provider: PaymentProviderName; providerReference: string }): Promise<void>;
}

export class PaymentSettlementError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "MISMATCH" | "DUPLICATE" | "INVALID_EVENT", message: string) {
    super(message);
    this.name = "PaymentSettlementError";
  }
}

export type PaymentWebhookResult = {
  accepted: true;
  duplicate: boolean;
  paid: boolean;
  orderId: string;
};

/**
 * Verifies a provider webhook before looking at business state, claims its
 * immutable event id, then grants entitlements only for an exact amount and
 * currency match. A frontend redirect cannot call this service successfully.
 */
export async function settleProviderWebhook(input: {
  provider: PaymentProviderAdapter;
  request: WebhookRequest;
  store: PaymentSettlementStore;
}): Promise<PaymentWebhookResult> {
  const event = await input.provider.verifyWebhook(input.request);
  return input.store.transaction(async (store) => {
    const order = await store.findOrder(event.orderId);
    if (!order) throw new PaymentSettlementError("NOT_FOUND", "Payment order was not found");
    if (event.status === "PAID" && (order.amountMinor !== event.amountMinor || order.currency !== event.currency)) {
      throw new PaymentSettlementError("MISMATCH", "Provider amount or currency does not match the order");
    }
    const claimed = await store.claimProviderEvent({
      orderId: order.id,
      provider: event.provider,
      eventId: event.eventId,
      providerReference: event.providerReference,
      rawPayload: event.rawPayload,
    });
    if (!claimed) return { accepted: true, duplicate: true, paid: order.status === "PAID", orderId: order.id };

    await store.recordPaymentAttempt({ orderId: order.id, provider: event.provider, eventId: event.eventId, providerReference: event.providerReference, status: event.status });
    if (event.status === "PAID") {
      const payment = await store.markOrderPaidAndGrantEntitlements({ orderId: order.id, provider: event.provider, providerReference: event.providerReference });
      return { accepted: true, duplicate: false, paid: payment.newlyPaid || order.status === "PAID", orderId: order.id };
    }
    if (event.status === "FAILED") await store.markOrderFailed?.({ orderId: order.id, provider: event.provider, providerReference: event.providerReference });
    return { accepted: true, duplicate: false, paid: false, orderId: order.id };
  });
}
