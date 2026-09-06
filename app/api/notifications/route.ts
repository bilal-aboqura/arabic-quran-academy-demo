import { NextRequest, NextResponse } from "next/server";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import {
  listTenantNotifications,
  getTenantUnreadNotificationCount,
} from "@/modules/notifications/repository";

export async function GET(request: NextRequest) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const onlyUnread = searchParams.get("unread") === "true";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));

  try {
    const [notifications, unreadCount] = await Promise.all([
      listTenantNotifications({
        tenantId: actor.tenantId,
        recipientMembershipId: actor.membershipId,
        limit,
        offset,
        onlyUnread,
      }),
      getTenantUnreadNotificationCount({
        tenantId: actor.tenantId,
        recipientMembershipId: actor.membershipId,
      }),
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
