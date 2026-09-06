import { NextRequest, NextResponse } from "next/server";
import { deleteSubscriptionPlanForTenant, updateSubscriptionPlanForTenant } from "@/modules/commerce/repository";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import type { SubscriptionDurationKind } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

type PlanPatch = {
  name?: string;
  description?: string;
  imageUrl?: string | null;
  durationKind?: SubscriptionDurationKind;
  price?: number;
  isActive?: boolean;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  let tenantId: string;
  try { tenantId = (await requireRequestTenantPermission(request, "MANAGE_SETTINGS")).tenantId; } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to authorize tenant" }, { status: 500 });
  }
  const { id } = await params;
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
  const patch: PlanPatch = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.description !== undefined) patch.description = body.description.trim();
  if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl?.trim() || null;
  if (body.durationKind !== undefined) {
    const dk = body.durationKind as SubscriptionDurationKind;
    if (dk !== "week" && dk !== "month" && dk !== "year") {
      return NextResponse.json({ error: "مدة غير صالحة" }, { status: 400 });
    }
    patch.durationKind = dk;
  }
  if (body.price !== undefined) patch.price = Math.max(0, Number(body.price) || 0);
  if (body.isActive !== undefined) patch.isActive = !!body.isActive;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }
  try {
    const result = await updateSubscriptionPlanForTenant(tenantId, id, patch);
    if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    console.error("PATCH subscription-plans/[id]", e);
    return NextResponse.json({ error: "فشل التحديث" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  let tenantId: string;
  try { tenantId = (await requireRequestTenantPermission(request, "MANAGE_SETTINGS")).tenantId; } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to authorize tenant" }, { status: 500 });
  }
  const { id } = await params;
  try {
    const result = await deleteSubscriptionPlanForTenant(tenantId, id);
    if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    console.error("DELETE subscription-plans/[id]", e);
    return NextResponse.json({ error: "تعذر الحذف — قد تكون الباقة مرتبطة بسجلات" }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
