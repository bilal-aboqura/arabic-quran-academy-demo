import { NextRequest, NextResponse } from "next/server";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { purchaseTenantSubscriptionWithBalance, TenantCommerceError } from "@/modules/commerce/tenant-wallet";

export async function POST(request: NextRequest) {
  let actor;
  try {
    actor = await requireTenantActor(request);
    if (actor.role !== "STUDENT") return NextResponse.json({ error: "Student membership required" }, { status: 403 });
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    return NextResponse.json({ error: "Unable to authorize tenant" }, { status: 500 });
  }
  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const planId = body.planId?.trim();
  if (!planId) return NextResponse.json({ error: "معرف الباقة مطلوب" }, { status: 400 });
  try {
    const { expiresAt } = await purchaseTenantSubscriptionWithBalance({ tenantId: actor.tenantId, userId: actor.userId, planId, idempotencyKey: request.headers.get("idempotency-key") });
    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    if (e instanceof TenantCommerceError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "INSUFFICIENT_BALANCE" || e.code === "ALREADY_OWNED" ? 400 : 409;
      return NextResponse.json({ error: e.message, code: e.code, alreadySubscribed: e.code === "ALREADY_OWNED", insufficientBalance: e.code === "INSUFFICIENT_BALANCE" }, { status });
    }
    console.error("POST subscriptions/purchase", e);
    return NextResponse.json({ error: "فشل شراء الباقة" }, { status: 500 });
  }
}
