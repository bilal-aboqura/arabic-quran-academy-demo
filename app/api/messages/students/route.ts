import { NextRequest, NextResponse } from "next/server";
import { listActiveStudentsForTenant, listTeacherStudentsForTenant } from "@/modules/students/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!["OWNER", "ADMIN", "ASSISTANT", "TEACHER"].includes(actor.role)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const memberships = actor.role === "TEACHER"
    ? await listTeacherStudentsForTenant({ tenantId: actor.tenantId, teacherUserId: actor.userId })
    : await listActiveStudentsForTenant(actor.tenantId);
  return NextResponse.json(memberships.map((membership) => ({ id: membership.userId, name: membership.displayName || membership.user.name, email: membership.user.email })));
}
