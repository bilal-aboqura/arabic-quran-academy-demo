import { NextRequest, NextResponse } from "next/server";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { createSubscriptionPlanForTenant, listSubscriptionPlansForTenant } from "@/modules/commerce/repository";
import type { SubscriptionDurationKind } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_SETTINGS");
    const plans = await listSubscriptionPlansForTenant(actor.tenantId);
    return NextResponse.json({ plans });
  } catch (e) {
    const tenantError = tenantRequestErrorResponse(e);
    if (tenantError) return tenantError;
    console.error("GET subscription-plans", e);
    return NextResponse.json({ error: "فشل جلب الباقات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let tenantId: string;
  try {
    tenantId = (await requireRequestTenantPermission(request, "MANAGE_SETTINGS")).tenantId;
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    return tenantError ?? NextResponse.json({ error: "Unable to authorize tenant" }, { status: 500 });
  }
  let body: {
    name?: string;
    description?: string;
    imageUrl?: string | null;
    durationKind?: string;
    price?: number;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "اسم الاشتراك مطلوب" }, { status: 400 });
  const dk = body.durationKind as SubscriptionDurationKind | undefined;
  if (dk !== "week" && dk !== "month" && dk !== "year") {
    return NextResponse.json({ error: "اختر مدة: week أو month أو year" }, { status: 400 });
  }
  const price = typeof body.price === "number" && Number.isFinite(body.price) ? Math.max(0, body.price) : 0;
  try {
    const { id } = await createSubscriptionPlanForTenant(tenantId, {
      name,
      description: body.description?.trim() ?? "",
      imageUrl: body.imageUrl?.trim() || null,
      durationKind: dk,
      price,
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ success: true, id });
  } catch (e) {
    console.error("POST subscription-plans", e);
    return NextResponse.json({ error: "فشل إنشاء الباقة" }, { status: 500 });
  }
}
