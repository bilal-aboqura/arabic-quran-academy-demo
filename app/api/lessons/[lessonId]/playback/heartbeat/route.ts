import { NextRequest, NextResponse } from "next/server";
import { heartbeatPlaybackForTenant } from "@/modules/courses/playback.repository";
import { findAccessibleLessonForTenant } from "@/modules/courses/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try { const actor = await requireTenantActor(request); const { lessonId } = await params; const lesson = await findAccessibleLessonForTenant(actor.tenantId, lessonId, actor); if (!lesson) return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 }); const body = await request.json().catch(() => null) as { attemptId?: unknown; playing?: unknown } | null; if (typeof body?.attemptId !== "string" || !body.attemptId.trim()) return NextResponse.json({ error: "معرف المشاهدة مطلوب" }, { status: 400 }); return NextResponse.json(await heartbeatPlaybackForTenant({ tenantId: actor.tenantId, userId: actor.userId, lesson, attemptId: body.attemptId.trim(), playing: body.playing === true })); }
  catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "تعذر حفظ المشاهدة" }, { status: 500 }); }
}
