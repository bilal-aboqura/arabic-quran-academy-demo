import { afterEach, describe, expect, it } from "vitest";
import { consumeMemoryRateLimit, resetMemoryRateLimitsForTests } from "@/lib/security/rate-limit";

afterEach(() => resetMemoryRateLimitsForTests());

describe("fixed-window rate limit", () => {
  const policy = { scope: "test", limit: 2, windowMs: 1_000 };

  it("blocks requests beyond the configured limit and resets after the window", () => {
    expect(consumeMemoryRateLimit("client", policy, 100).allowed).toBe(true);
    expect(consumeMemoryRateLimit("client", policy, 200).allowed).toBe(true);
    expect(consumeMemoryRateLimit("client", policy, 300).allowed).toBe(false);
    expect(consumeMemoryRateLimit("client", policy, 1_101).allowed).toBe(true);
  });
});
