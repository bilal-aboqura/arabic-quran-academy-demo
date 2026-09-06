import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageStudents } from "@/modules/tenants/authorization";
import { findActiveStudentMembershipForTenant } from "@/modules/students/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

/** Updates tenant-local student profile only; global identity and global role are intentionally not writable here. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageStudents(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const { id } = await params;
  const membership = await findActiveStudentMembershipForTenant(actor.tenantId, id);
  if (!membership) return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  let body: { displayName?: string; student_number?: string | null; guardian_number?: string | null };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const data = {
    ...(body.displayName !== undefined ? { displayName: body.displayName?.trim() || null } : {}),
    ...(body.student_number !== undefined ? { studentNumber: body.student_number?.trim() || null } : {}),
    ...(body.guardian_number !== undefined ? { guardianNumber: body.guardian_number?.trim() || null } : {}),
  };
  if (!Object.keys(data).length) return NextResponse.json({ error: "لا يوجد شيء للتحديث" }, { status: 400 });
  await prisma.tenantMembership.update({ where: { id: membership.id }, data });
  return NextResponse.json({ success: true });
}
