import { NextRequest, NextResponse } from "next/server";
import { createEnrollmentForTenant, findEnrollmentForTenant } from "@/modules/enrollments/repository";
import { canManageStudents } from "@/modules/tenants/authorization";
import { findActiveStudentMembershipForTenant } from "@/modules/students/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageStudents(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id: userId } = await params;
  if (!await findActiveStudentMembershipForTenant(actor.tenantId, userId)) return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  let body: { courseId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const courseId = body.courseId?.trim();
  if (!courseId) return NextResponse.json({ error: "معرف الدورة مطلوب" }, { status: 400 });
  if (await findEnrollmentForTenant({ tenantId: actor.tenantId, userId, courseId })) return NextResponse.json({ error: "الطالب مسجّل في هذه الدورة مسبقاً" }, { status: 400 });
  const enrollment = await createEnrollmentForTenant({ tenantId: actor.tenantId, userId, courseId });
  if (!enrollment) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  return NextResponse.json({ success: true });
}
