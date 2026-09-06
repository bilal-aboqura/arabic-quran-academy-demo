import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateConversationForTenant, listConversationsForTenantParticipant } from "@/modules/messaging/repository";
import { listTeacherStudentsForTenant } from "@/modules/students/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

const staffRoles = ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"] as const;

export async function GET(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (actor.role === "STUDENT") return NextResponse.json(await listConversationsForTenantParticipant({ tenantId: actor.tenantId, userId: actor.userId, participant: "student" }));
  if (staffRoles.includes(actor.role as (typeof staffRoles)[number])) return NextResponse.json(await listConversationsForTenantParticipant({ tenantId: actor.tenantId, userId: actor.userId, participant: "staff" }));
  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  let body: { studentId?: string; staffId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  let staffUserId: string;
  let studentUserId: string;
  if (actor.role === "STUDENT") {
    studentUserId = actor.userId;
    staffUserId = body.staffId?.trim() ?? "";
    const staff = await prisma.tenantMembership.findFirst({ where: { tenantId: actor.tenantId, userId: staffUserId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN", "ASSISTANT"] } }, select: { id: true } });
    if (!staff) return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
  } else if (staffRoles.includes(actor.role as (typeof staffRoles)[number])) {
    staffUserId = actor.userId;
    studentUserId = body.studentId?.trim() ?? "";
    if (!studentUserId) return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 });
    if (actor.role === "TEACHER") {
      const allowed = await listTeacherStudentsForTenant({ tenantId: actor.tenantId, teacherUserId: actor.userId });
      if (!allowed.some((membership) => membership.userId === studentUserId)) return NextResponse.json({ error: "غير مصرح بمراسلة هذا الطالب" }, { status: 403 });
    }
  } else return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const conversation = await getOrCreateConversationForTenant({ tenantId: actor.tenantId, staffUserId, studentUserId });
  if (!conversation) return NextResponse.json({ error: "المستخدم غير موجود في هذه المنصة" }, { status: 404 });
  return NextResponse.json(conversation);
}
