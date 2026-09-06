import { NextRequest, NextResponse } from "next/server";
import { canManageTenant } from "@/modules/tenants/authorization";
import { listTenantStudentSubscriptions } from "@/modules/commerce/repository";
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
    const subscriptions = await listTenantStudentSubscriptions(actor.tenantId);
    return NextResponse.json({ subscriptions });
  } catch (e) {
    console.error("GET platform-subscriptions", e);
    return NextResponse.json({ error: "فشل جلب الاشتراكات" }, { status: 500 });
  }
}
