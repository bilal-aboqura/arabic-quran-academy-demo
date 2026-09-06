import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (actor.role !== "STUDENT") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const staff = await prisma.tenantMembership.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN", "ASSISTANT"] } },
    include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(staff.map((membership) => ({ id: membership.user.id, name: membership.displayName || membership.user.name, email: membership.user.email, role: membership.role })));
}
