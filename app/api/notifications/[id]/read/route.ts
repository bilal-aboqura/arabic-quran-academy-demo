import { NextRequest, NextResponse } from "next/server";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { markNotificationAsRead } from "@/modules/notifications/repository";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Props) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }

  const { id } = await params;
  try {
    const success = await markNotificationAsRead({
      tenantId: actor.tenantId,
      recipientMembershipId: actor.membershipId,
      notificationId: id,
    });
    return NextResponse.json({ success });
  } catch {
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}
