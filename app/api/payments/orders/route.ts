import { NextRequest, NextResponse } from "next/server";
import { createExternalOrder, initiateExternalOrder, normalizePaymentIdempotencyKey, PaymentOrderError, type ExternalOrderKind } from "@/modules/payments/orders";
import { createPaymentProviderFromEnvironment, PaymentProviderError } from "@/modules/payments/provider";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

const orderKinds = new Set<ExternalOrderKind>(["COURSE", "STORE_PRODUCT", "SUBSCRIPTION_PLAN"]);

/**
 * Creates a server-priced order and a provider checkout intent. Amounts,
 * provider choice, and the eventual paid state never come from this request.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request);
    if (actor.role !== "STUDENT") return NextResponse.json({ error: "Student membership required" }, { status: 403 });
    const body = await request.json() as { kind?: unknown; targetId?: unknown };
    const kind = typeof body.kind === "string" ? body.kind : "";
    const targetId = typeof body.targetId === "string" ? body.targetId : "";
    if (!orderKinds.has(kind as ExternalOrderKind) || !targetId.trim()) {
      return NextResponse.json({ error: "kind and targetId are required" }, { status: 400 });
    }
    const idempotencyKey = normalizePaymentIdempotencyKey(request.headers.get("idempotency-key"));
    const provider = createPaymentProviderFromEnvironment();
    const order = await createExternalOrder({ actor, kind: kind as ExternalOrderKind, targetId, idempotencyKey });
    const callbackUrl = new URL(`/api/payments/webhooks/${provider.name.toLowerCase()}`, request.nextUrl.origin).toString();
    const result = await initiateExternalOrder({ orderId: order.id, actor, callbackUrl, provider });
    return NextResponse.json({
      orderId: result.orderId,
      status: result.status,
      // This is a navigation target only. It is deliberately not interpreted
      // as purchase success by any client.
      checkoutUrl: result.initiation?.checkoutUrl ?? null,
      provider: result.initiation?.provider ?? null,
      expiresAt: result.initiation?.expiresAt?.toISOString() ?? null,
    }, { status: order.status === "PENDING" ? 201 : 200 });
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    if (error instanceof PaymentOrderError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "ALREADY_PAID" ? 409 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    if (error instanceof PaymentProviderError) {
      const status = error.code === "UNAVAILABLE" ? 503 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("POST payments/orders", error);
    return NextResponse.json({ error: "Unable to create payment order" }, { status: 500 });
  }
}
