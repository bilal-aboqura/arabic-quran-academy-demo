import { NextRequest, NextResponse } from "next/server";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { purchaseStoreProductWithTenantBalance, TenantCommerceError } from "@/modules/commerce/tenant-wallet";

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

  let body: { productId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const productId = String(body.productId ?? "").trim();
  if (!productId) return NextResponse.json({ error: "productId مطلوب" }, { status: 400 });

  try {
    const out = await purchaseStoreProductWithTenantBalance({ tenantId: actor.tenantId, userId: actor.userId, productId, idempotencyKey: request.headers.get("idempotency-key") });
    return NextResponse.json({ success: true, ...out });
  } catch (e) {
    if (e instanceof TenantCommerceError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "INSUFFICIENT_BALANCE" ? 400 : 409;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("POST store/purchase", e);
    return NextResponse.json({ error: "فشل شراء المنتج" }, { status: 500 });
  }
}
