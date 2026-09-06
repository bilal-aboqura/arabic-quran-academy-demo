import { NextRequest, NextResponse } from "next/server";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { markAllNotificationsAsRead } from "@/modules/notifications/repository";

export async function POST(request: NextRequest) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }

  try {
    const count = await markAllNotificationsAsRead({
      tenantId: actor.tenantId,
      recipientMembershipId: actor.membershipId,
    });
    return NextResponse.json({ success: true, count });
  } catch {
    return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 });
  }
}
