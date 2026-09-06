import { NextRequest, NextResponse } from "next/server";
import { canManageTenant } from "@/modules/tenants/authorization";
import {
  addBalanceSettingsSchema,
  getTenantAddBalanceSettings,
  updateTenantAddBalanceSettings,
} from "@/modules/settings/admin.repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (!canManageTenant(actor)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const settings = await getTenantAddBalanceSettings(actor.tenantId);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "فشل جلب الإعدادات" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (!canManageTenant(actor)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = addBalanceSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات الإعدادات غير صالحة" }, { status: 400 });
  }

  try {
    await updateTenantAddBalanceSettings(actor.tenantId, parsed.data);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
  }
}
