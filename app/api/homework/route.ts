import { NextRequest, NextResponse } from "next/server";
import { deleteHomeworkForTenant, listHomeworkForTeacherTenant, listHomeworkForTenant, listHomeworkForTenantStudent } from "@/modules/homework/repository";
import { canReviewAssignments } from "@/modules/tenants/authorization";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  const params = new URL(request.url).searchParams;
  const studentName = params.get("studentName") || undefined;
  if (actor.role === "STUDENT") {
    const courseId = params.get("courseId") || undefined;
    const lessonId = params.get("lessonId") || undefined;
    if (!courseId && !lessonId) return NextResponse.json({ error: "معرف الحصة أو الدورة مطلوب" }, { status: 400 });
    return NextResponse.json(await listHomeworkForTenantStudent({ tenantId: actor.tenantId, userId: actor.userId, courseId, lessonId }));
  }
  if (!canReviewAssignments(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const list = actor.role === "TEACHER"
    ? await listHomeworkForTeacherTenant({ tenantId: actor.tenantId, teacherUserId: actor.userId, studentName })
    : await listHomeworkForTenant({ tenantId: actor.tenantId, studentName });
  return NextResponse.json(list);
}

export async function DELETE(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canReviewAssignments(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  let body: { ids?: string[]; deleteAll?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  if (body.deleteAll && actor.role === "TEACHER") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const ids = body.deleteAll ? undefined : (Array.isArray(body.ids) ? body.ids.filter((value): value is string => typeof value === "string" && Boolean(value.trim())) : []);
  if (!body.deleteAll && !ids?.length) return NextResponse.json({ error: "حدّد تسليمات للحذف" }, { status: 400 });
  const result = await deleteHomeworkForTenant({
    tenantId: actor.tenantId,
    ids: body.deleteAll ? (await listHomeworkForTenant({ tenantId: actor.tenantId })).map((item) => item.id) : ids!,
    ...(actor.role === "TEACHER" ? { teacherUserId: actor.userId } : {}),
  });
  return NextResponse.json({ success: true, deleted: result.count });
}
