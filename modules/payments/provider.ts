import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A provider is deliberately only responsible for initiating and verifying a
 * transaction. Creating an order, granting an entitlement, and changing an
 * order's paid state are application concerns handled by `settlement.ts`.
 * That separation means a redirect or client-side "success" page is never a
 * source of truth.
 */
export type PaymentProviderName = "LOCAL_TEST" | "PAYMOB" | "KASHIER";

export type PaymentIntent = {
  orderId: string;
  tenantId: string;
  amountMinor: number;
  currency: string;
  callbackUrl: string;
  idempotencyKey: string;
  description: string;
  metadata?: Record<string, string>;
};

export type PaymentInitiation = {
  provider: PaymentProviderName;
  providerReference: string;
  checkoutUrl: string;
  expiresAt?: Date;
};

export type VerifiedPaymentEvent = {
  provider: PaymentProviderName;
  /** Stable provider event/transaction identifier, used for event idempotency. */
  eventId: string;
  providerReference: string;
  orderId: string;
  status: "PAID" | "FAILED" | "PENDING";
  amountMinor: number;
  currency: string;
  receivedAt: Date;
  rawPayload: unknown;
};

export type WebhookRequest = {
  rawBody: string;
  headers: Headers | Record<string, string | undefined>;
};

export interface PaymentProviderAdapter {
  readonly name: PaymentProviderName;
  initiate(intent: PaymentIntent): Promise<PaymentInitiation>;
  verifyWebhook(request: WebhookRequest): Promise<VerifiedPaymentEvent>;
}

export class PaymentProviderError extends Error {
  constructor(
    public readonly code: "INVALID_REQUEST" | "INVALID_SIGNATURE" | "UNAVAILABLE" | "UNSUPPORTED_PROVIDER",
    message: string,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

function header(headers: WebhookRequest["headers"], key: string): string | undefined {
  if (headers instanceof Headers) return headers.get(key) ?? undefined;
  const lowerKey = key.toLowerCase();
  return Object.entries(headers).find(([candidate]) => candidate.toLowerCase() === lowerKey)?.[1];
}

export function hmacSha256(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/** Constant-time comparison prevents a signature endpoint becoming an oracle. */
export function safeSignatureEquals(expected: string, actual: string | undefined): boolean {
  if (!actual || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(actual, "utf8"));
}

type LocalWebhookPayload = {
  eventId: string;
  providerReference: string;
  orderId: string;
  status: "PAID" | "FAILED" | "PENDING";
  amountMinor: number;
  currency: string;
};

/**
 * Deterministic local provider used by automated tests and local development.
 * It still verifies an HMAC over the raw request body so test code exercises
 * the same trust boundary as a live provider. It is forbidden in production.
 */
export class LocalTestPaymentProvider implements PaymentProviderAdapter {
  readonly name = "LOCAL_TEST" as const;

  constructor(private readonly options: { webhookSecret: string; checkoutBaseUrl?: string; now?: () => Date }) {
    if (!options.webhookSecret || options.webhookSecret.length < 16) {
      throw new PaymentProviderError("INVALID_REQUEST", "A local payment webhook secret of at least 16 characters is required");
    }
  }

  async initiate(intent: PaymentIntent): Promise<PaymentInitiation> {
    validateIntent(intent);
    const providerReference = `local_${intent.orderId}`;
    const checkoutBaseUrl = this.options.checkoutBaseUrl ?? "/api/payments/local/checkout";
    const query = new URLSearchParams({ order: intent.orderId, reference: providerReference });
    return {
      provider: this.name,
      providerReference,
      checkoutUrl: `${checkoutBaseUrl}${checkoutBaseUrl.includes("?") ? "&" : "?"}${query.toString()}`,
      expiresAt: new Date((this.options.now?.() ?? new Date()).getTime() + 30 * 60_000),
    };
  }

  async verifyWebhook(request: WebhookRequest): Promise<VerifiedPaymentEvent> {
    const signature = header(request.headers, "x-nexaclass-local-signature");
    const expected = hmacSha256(this.options.webhookSecret, request.rawBody);
    if (!safeSignatureEquals(expected, signature)) {
      throw new PaymentProviderError("INVALID_SIGNATURE", "Local payment webhook signature is invalid");
    }
    let payload: LocalWebhookPayload;
    try {
      payload = JSON.parse(request.rawBody) as LocalWebhookPayload;
    } catch {
      throw new PaymentProviderError("INVALID_REQUEST", "Local payment webhook body is not valid JSON");
    }
    if (!payload || !isSafeId(payload.eventId) || !isSafeId(payload.providerReference) || !isSafeId(payload.orderId)
      || !["PAID", "FAILED", "PENDING"].includes(payload.status)
      || !Number.isSafeInteger(payload.amountMinor) || payload.amountMinor < 0
      || !/^[A-Z]{3}$/.test(payload.currency)) {
      throw new PaymentProviderError("INVALID_REQUEST", "Local payment webhook payload is invalid");
    }
    return { ...payload, provider: this.name, receivedAt: this.options.now?.() ?? new Date(), rawPayload: payload };
  }
}

/** A non-live adapter is explicit: it can never accidentally accept a callback. */
export class UnavailablePaymentProvider implements PaymentProviderAdapter {
  constructor(readonly name: Exclude<PaymentProviderName, "LOCAL_TEST">, private readonly reason: string) {}

  async initiate(): Promise<PaymentInitiation> {
    throw new PaymentProviderError("UNAVAILABLE", this.reason);
  }

  async verifyWebhook(): Promise<VerifiedPaymentEvent> {
    throw new PaymentProviderError("UNAVAILABLE", this.reason);
  }
}

export function validateIntent(intent: PaymentIntent) {
  if (!isSafeId(intent.orderId) || !isSafeId(intent.tenantId) || !isSafeId(intent.idempotencyKey)
    || !Number.isSafeInteger(intent.amountMinor) || intent.amountMinor < 0
    || !/^[A-Z]{3}$/.test(intent.currency) || !intent.callbackUrl) {
    throw new PaymentProviderError("INVALID_REQUEST", "Payment intent is invalid");
  }
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 160 && /^[A-Za-z0-9._:-]+$/.test(value);
}

export function createPaymentProviderFromEnvironment(env: NodeJS.ProcessEnv = process.env): PaymentProviderAdapter {
  const configured = env.NEXACLASS_PAYMENT_PROVIDER ?? "LOCAL_TEST";
  if (configured === "LOCAL_TEST") {
    if (env.NODE_ENV === "production") throw new PaymentProviderError("UNAVAILABLE", "LOCAL_TEST payments are disabled in production");
    return new LocalTestPaymentProvider({ webhookSecret: env.NEXACLASS_LOCAL_PAYMENT_WEBHOOK_SECRET ?? "" });
  }
  if (configured === "PAYMOB") {
    return new UnavailablePaymentProvider("PAYMOB", "Paymob adapter requires configured production credentials and implementation");
  }
  if (configured === "KASHIER") {
    return new UnavailablePaymentProvider("KASHIER", "Kashier adapter requires configured production credentials and implementation");
  }
  throw new PaymentProviderError("UNSUPPORTED_PROVIDER", "Unsupported payment provider");
}
