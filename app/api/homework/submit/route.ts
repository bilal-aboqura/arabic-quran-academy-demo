import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHomeworkForTenant } from "@/modules/homework/repository";
import { isTenantObjectKeyForActor } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function POST(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (actor.role !== "STUDENT") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  let body: { courseId?: string; lessonId?: string; type?: string; linkUrl?: string; fileKey?: string; fileName?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const type = body.type === "link" || body.type === "pdf" || body.type === "image" ? body.type : null;
  if (!type) return NextResponse.json({ error: "نوع التسليم مطلوب" }, { status: 400 });
  const lesson = body.lessonId?.trim()
    ? await prisma.lesson.findFirst({ where: { id: body.lessonId.trim(), course: { tenantId: actor.tenantId } }, select: { id: true, courseId: true, acceptsHomework: true } })
    : null;
  const courseId = lesson?.courseId ?? body.courseId?.trim();
  if (!courseId) return NextResponse.json({ error: "معرف الحصة أو الدورة مطلوب" }, { status: 400 });
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: actor.tenantId }, select: { acceptsHomework: true } });
  if (!course || (lesson ? !lesson.acceptsHomework : !course.acceptsHomework)) return NextResponse.json({ error: "الدورة أو الحصة لا تقبل الواجب" }, { status: 404 });
  if (type === "link" && !/^https:\/\//i.test(body.linkUrl?.trim() ?? "")) return NextResponse.json({ error: "رابط HTTPS صالح مطلوب" }, { status: 400 });
  if (type !== "link" && !isTenantObjectKeyForActor({ tenantId: actor.tenantId, kind: "homework", key: body.fileKey?.trim() ?? "" })) {
    return NextResponse.json({ error: "ملف الواجب غير صالح" }, { status: 400 });
  }
  const submission = await createHomeworkForTenant({
    tenantId: actor.tenantId, userId: actor.userId, courseId, lessonId: lesson?.id,
    submissionType: type, linkUrl: type === "link" ? body.linkUrl?.trim() : null,
    // Legacy column is retained for bridge compatibility; it now stores a private object key, not a public URL.
    fileUrl: type === "link" ? null : body.fileKey?.trim(), fileName: body.fileName?.trim() || null,
  });
  if (!submission) return NextResponse.json({ error: "يجب التسجيل في الدورة أولاً" }, { status: 403 });
  return NextResponse.json({ success: true, id: submission.id });
}
