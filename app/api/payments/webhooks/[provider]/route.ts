import { NextRequest, NextResponse } from "next/server";
import { PrismaPaymentSettlementStore } from "@/modules/payments/prisma-settlement-store";
import { createPaymentProviderFromEnvironment, PaymentProviderError, type PaymentProviderName } from "@/modules/payments/provider";
import { PaymentSettlementError, settleProviderWebhook } from "@/modules/payments/settlement";

const providerNames = new Set<PaymentProviderName>(["LOCAL_TEST", "PAYMOB", "KASHIER"]);

/** Provider-only callback. There is intentionally no session or frontend success path here. */
export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try {
    const { provider: requested } = await context.params;
    const providerName = requested.toUpperCase() as PaymentProviderName;
    if (!providerNames.has(providerName)) return NextResponse.json({ error: "Unknown payment provider" }, { status: 404 });
    const provider = createPaymentProviderFromEnvironment();
    // A deployment accepts callbacks only for its configured adapter. This
    // prevents an inactive/test provider route from becoming a payment oracle.
    if (provider.name !== providerName) return NextResponse.json({ error: "Provider is not active" }, { status: 404 });
    const result = await settleProviderWebhook({
      provider,
      request: { rawBody: await request.text(), headers: request.headers },
      store: new PrismaPaymentSettlementStore(),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      const status = error.code === "UNAVAILABLE" ? 503 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    if (error instanceof PaymentSettlementError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "MISMATCH" ? 422 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error("POST payments/webhooks", error);
    return NextResponse.json({ error: "Unable to process payment callback" }, { status: 500 });
  }
}
