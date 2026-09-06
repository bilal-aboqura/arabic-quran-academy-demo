import { NextRequest, NextResponse } from "next/server";
import { canManageTenant } from "@/modules/tenants/authorization";
import {
  deleteTenantStudentSubscription,
  updateTenantStudentSubscriptionExpiry,
} from "@/modules/commerce/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (!canManageTenant(actor)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  let body: { expiresAt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const iso = body.expiresAt?.trim();
  if (!iso) return NextResponse.json({ error: "تاريخ انتهاء الاشتراك مطلوب" }, { status: 400 });
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return NextResponse.json({ error: "تاريخ غير صالح" }, { status: 400 });
  }
  try {
    await updateTenantStudentSubscriptionExpiry(actor.tenantId, id, d);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل التحديث";
    if (msg.includes("غير موجود")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error("PATCH platform-subscriptions/[id]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (!canManageTenant(actor)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await deleteTenantStudentSubscription(actor.tenantId, id);
  } catch (e) {
    console.error("DELETE platform-subscriptions/[id]", e);
    return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
