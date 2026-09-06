import { describe, expect, it } from "vitest";
import { hmacSha256, LocalTestPaymentProvider, PaymentProviderError } from "@/modules/payments/provider";
import { PaymentSettlementError, settleProviderWebhook, type PaymentSettlementStore } from "@/modules/payments/settlement";

const secret = "local-test-webhook-secret";

function signedBody(overrides: Partial<Record<string, unknown>> = {}) {
  const body = JSON.stringify({ eventId: "event-1", providerReference: "local-order-1", orderId: "order-1", status: "PAID", amountMinor: 49900, currency: "EGP", ...overrides });
  return { rawBody: body, headers: { "x-nexaclass-local-signature": hmacSha256(secret, body) } };
}

class MemoryStore implements PaymentSettlementStore {
  readonly events = new Set<string>();
  attempts: string[] = [];
  grants = 0;
  order: { id: string; tenantId: string; amountMinor: number; currency: string; status: "PENDING" | "PAID" | "FAILED" } = { id: "order-1", tenantId: "tenant-1", amountMinor: 49900, currency: "EGP", status: "PENDING" };

  async transaction<T>(work: (store: PaymentSettlementStore) => Promise<T>): Promise<T> { return work(this); }
  async findOrder(orderId: string) { return orderId === this.order.id ? this.order : null; }
  async claimProviderEvent(input: { provider: string; eventId: string }) {
    const key = `${input.provider}:${input.eventId}`;
    if (this.events.has(key)) return false;
    this.events.add(key);
    return true;
  }
  async recordPaymentAttempt(input: { status: string }) { this.attempts.push(input.status); }
  async markOrderPaidAndGrantEntitlements() { this.grants += 1; this.order.status = "PAID"; return { newlyPaid: true }; }
}

describe("external payment provider boundary", () => {
  it("accepts only a signed local webhook and exposes a deterministic checkout reference", async () => {
    const provider = new LocalTestPaymentProvider({ webhookSecret: secret, checkoutBaseUrl: "https://app.test/checkout", now: () => new Date("2026-01-01T00:00:00Z") });
    await expect(provider.initiate({ orderId: "order-1", tenantId: "tenant-1", amountMinor: 49900, currency: "EGP", callbackUrl: "https://app.test/callback", idempotencyKey: "key-1", description: "Course" }))
      .resolves.toMatchObject({ providerReference: "local_order-1", checkoutUrl: "https://app.test/checkout?order=order-1&reference=local_order-1" });
    await expect(provider.verifyWebhook({ ...signedBody(), headers: { "x-nexaclass-local-signature": "wrong" } })).rejects.toBeInstanceOf(PaymentProviderError);
  });

  it("settles a verified paid event once and grants entitlement exactly once", async () => {
    const provider = new LocalTestPaymentProvider({ webhookSecret: secret });
    const store = new MemoryStore();
    await expect(settleProviderWebhook({ provider, store, request: signedBody() })).resolves.toEqual({ accepted: true, duplicate: false, paid: true, orderId: "order-1" });
    await expect(settleProviderWebhook({ provider, store, request: signedBody() })).resolves.toEqual({ accepted: true, duplicate: true, paid: true, orderId: "order-1" });
    expect(store.grants).toBe(1);
    expect(store.attempts).toEqual(["PAID"]);
  });

  it("rejects a paid callback whose amount does not exactly match the server order", async () => {
    const provider = new LocalTestPaymentProvider({ webhookSecret: secret });
    const store = new MemoryStore();
    await expect(settleProviderWebhook({ provider, store, request: signedBody({ amountMinor: 1 }) })).rejects.toBeInstanceOf(PaymentSettlementError);
    expect(store.grants).toBe(0);
  });
});
