import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLiveStreamForTenant, listLiveStreamsForTenant } from "@/modules/live-streams/repository";
import { canManageCourse } from "@/modules/tenants/authorization";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { parseScheduledAtIso } from "@/lib/datetime-local";

async function canManageStreamCourse(tenantId: string, actor: { role: string; userId: string }, courseId: string) {
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId }, select: { createdById: true } });
  return Boolean(course && (actor.role !== "TEACHER" || course.createdById === actor.userId));
}

export async function GET(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageCourse(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  return NextResponse.json(await listLiveStreamsForTenant({ tenantId: actor.tenantId, ...(actor.role === "TEACHER" ? { teacherUserId: actor.userId } : {}) }));
}

export async function POST(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageCourse(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  let body: { courseId?: string; title?: string; titleAr?: string | null; provider?: "zoom" | "google_meet"; meetingUrl?: string; meetingId?: string | null; meetingPassword?: string | null; scheduledAt?: string; description?: string | null; order?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const courseId = body.courseId?.trim() ?? "";
  const scheduledAt = body.scheduledAt ? parseScheduledAtIso(body.scheduledAt) : null;
  if (!courseId || !body.title?.trim() || !body.meetingUrl?.trim() || !scheduledAt || !body.provider || !["zoom", "google_meet"].includes(body.provider)) return NextResponse.json({ error: "بيانات البث غير صالحة" }, { status: 400 });
  if (!await canManageStreamCourse(actor.tenantId, actor, courseId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  const stream = await createLiveStreamForTenant({ tenantId: actor.tenantId, courseId, data: { title: body.title.trim(), titleAr: body.titleAr?.trim() || null, provider: body.provider, meetingUrl: body.meetingUrl.trim(), meetingId: body.meetingId?.trim() || null, meetingPassword: body.meetingPassword?.trim() || null, scheduledAt, description: body.description?.trim() || null, order: body.order } });
  return NextResponse.json(stream, { status: 201 });
}
