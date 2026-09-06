import { describe, expect, it } from "vitest";
import { normalizePaymentIdempotencyKey, PaymentOrderError } from "@/modules/payments/orders";

describe("external order input boundary", () => {
  it("accepts only bounded server-safe idempotency keys", () => {
    expect(normalizePaymentIdempotencyKey(" request-1:retry ")).toBe("request-1:retry");
    expect(() => normalizePaymentIdempotencyKey(null)).toThrow(PaymentOrderError);
    expect(() => normalizePaymentIdempotencyKey("contains whitespace")).toThrow(PaymentOrderError);
    expect(() => normalizePaymentIdempotencyKey("x".repeat(161))).toThrow(PaymentOrderError);
  });
});
