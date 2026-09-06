import { describe, expect, it } from "vitest";
import { TenantCommerceError, tenantWalletInternals } from "@/modules/commerce/tenant-wallet";

describe("tenant wallet request invariants", () => {
  it("accepts bounded opaque idempotency keys and rejects unsafe keys", () => {
    expect(tenantWalletInternals.normalizedIdempotencyKey("purchase:alpha-1")).toBe("purchase:alpha-1");
    expect(tenantWalletInternals.normalizedIdempotencyKey(null)).toBeNull();
    expect(() => tenantWalletInternals.normalizedIdempotencyKey("bad key with spaces")).toThrow(TenantCommerceError);
  });

  it("calculates only supported student-content subscription windows", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    expect(tenantWalletInternals.expiryFromDuration(start, "week").toISOString()).toBe("2026-01-08T00:00:00.000Z");
    expect(tenantWalletInternals.expiryFromDuration(start, "month").toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(() => tenantWalletInternals.expiryFromDuration(start, "forever")).toThrow(TenantCommerceError);
  });
});
