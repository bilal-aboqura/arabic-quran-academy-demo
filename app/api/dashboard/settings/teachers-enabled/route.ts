import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_STAFF");
    const body = await request.json() as { enabled?: unknown };
    if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "enabled is required" }, { status: 400 });
    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: actor.tenantId },
      create: { tenantId: actor.tenantId, teachersEnabled: body.enabled },
      update: { teachersEnabled: body.enabled },
      select: { teachersEnabled: true },
    });
    return NextResponse.json({ success: true, teachersEnabled: settings.teachersEnabled });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to update teacher feature" }, { status: 500 });
  }
}
