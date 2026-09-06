import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteLiveStreamForTenant, findLiveStreamForTenant, updateLiveStreamForTenant } from "@/modules/live-streams/repository";
import { canManageCourse } from "@/modules/tenants/authorization";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { parseScheduledAtIso } from "@/lib/datetime-local";

async function canManageExisting(tenantId: string, actor: { role: string; userId: string }, id: string) {
  const stream = await findLiveStreamForTenant(tenantId, id);
  return stream && (actor.role !== "TEACHER" || stream.course.createdById === actor.userId) ? stream : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor; try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageCourse(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const stream = await canManageExisting(actor.tenantId, actor, (await params).id);
  return stream ? NextResponse.json(stream) : NextResponse.json({ error: "البث غير موجود" }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor; try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageCourse(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const id = (await params).id;
  if (!await canManageExisting(actor.tenantId, actor, id)) return NextResponse.json({ error: "البث غير موجود" }, { status: 404 });
  let body: { courseId?: string; title?: string; titleAr?: string | null; provider?: "zoom" | "google_meet"; meetingUrl?: string; meetingId?: string | null; meetingPassword?: string | null; scheduledAt?: string; description?: string | null; order?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  if (body.provider && !["zoom", "google_meet"].includes(body.provider)) return NextResponse.json({ error: "نوع البث غير صالح" }, { status: 400 });
  if (body.courseId) {
    const course = await prisma.course.findFirst({ where: { id: body.courseId, tenantId: actor.tenantId }, select: { createdById: true } });
    if (!course || (actor.role === "TEACHER" && course.createdById !== actor.userId)) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }
  const scheduledAt = body.scheduledAt === undefined ? undefined : parseScheduledAtIso(body.scheduledAt);
  if (body.scheduledAt !== undefined && !scheduledAt) return NextResponse.json({ error: "موعد البث غير صالح" }, { status: 400 });
  const updated = await updateLiveStreamForTenant({
    tenantId: actor.tenantId,
    id,
    data: {
      courseId: body.courseId,
      title: body.title,
      titleAr: body.titleAr,
      provider: body.provider,
      meetingUrl: body.meetingUrl,
      meetingId: body.meetingId,
      meetingPassword: body.meetingPassword,
      description: body.description,
      order: body.order,
      ...(scheduledAt ? { scheduledAt } : {}),
    },
  });
  return updated ? NextResponse.json(updated) : NextResponse.json({ error: "البث غير موجود" }, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor; try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageCourse(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const id = (await params).id;
  if (!await canManageExisting(actor.tenantId, actor, id)) return NextResponse.json({ error: "البث غير موجود" }, { status: 404 });
  await deleteLiveStreamForTenant(actor.tenantId, id);
  return NextResponse.json({ ok: true });
}
