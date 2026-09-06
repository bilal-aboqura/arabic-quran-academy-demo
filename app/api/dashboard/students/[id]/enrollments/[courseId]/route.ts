import { NextRequest, NextResponse } from "next/server";
import { deleteEnrollmentForTenant, findEnrollmentForTenant } from "@/modules/enrollments/repository";
import { canManageStudents } from "@/modules/tenants/authorization";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; courseId: string }> }) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageStudents(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id: userId, courseId } = await params;
  if (!await findEnrollmentForTenant({ tenantId: actor.tenantId, userId, courseId })) return NextResponse.json({ error: "التسجيل غير موجود" }, { status: 404 });
  await deleteEnrollmentForTenant({ tenantId: actor.tenantId, userId, courseId });
  return NextResponse.json({ success: true });
}
