import { NextRequest, NextResponse } from "next/server";
import { startPlaybackForTenant } from "@/modules/courses/playback.repository";
import { findAccessibleLessonForTenant } from "@/modules/courses/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try { const actor = await requireTenantActor(request); const { lessonId } = await params; const lesson = await findAccessibleLessonForTenant(actor.tenantId, lessonId, actor); if (!lesson) return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 }); return NextResponse.json(await startPlaybackForTenant({ tenantId: actor.tenantId, userId: actor.userId, lesson })); }
  catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "تعذر بدء المشاهدة" }, { status: 500 }); }
}
