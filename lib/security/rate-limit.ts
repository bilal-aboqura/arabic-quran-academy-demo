import type { NextRequest } from "next/server";

type WindowEntry = { count: number; resetAt: number };

const memoryStore = new Map<string, WindowEntry>();

export type RateLimitPolicy = {
  scope: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function requestIdentity(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("cf-connecting-ip") || forwarded || request.headers.get("x-real-ip") || "unknown";
  return ip.slice(0, 128);
}

/**
 * Transitional fixed-window limiter. It is intentionally isolated so the
 * store can be replaced with Redis/Cloudflare Durable Object before a
 * multi-instance deployment. Do not treat memory state as globally shared.
 */
export function consumeMemoryRateLimit(key: string, policy: RateLimitPolicy, now = Date.now()): RateLimitResult {
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + policy.windowMs });
    return { allowed: true, retryAfterSeconds: Math.ceil(policy.windowMs / 1000) };
  }

  entry.count += 1;
  memoryStore.set(key, entry);
  return {
    allowed: entry.count <= policy.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function checkRequestRateLimit(request: NextRequest, policy: RateLimitPolicy): RateLimitResult {
  return consumeMemoryRateLimit(`${policy.scope}:${requestIdentity(request)}`, policy);
}

/** Test-only cleanup; production code must never clear rate limits. */
export function resetMemoryRateLimitsForTests(): void {
  memoryStore.clear();
}
