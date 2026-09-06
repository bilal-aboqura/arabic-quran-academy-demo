import { NextRequest, NextResponse } from "next/server";
import { getLessonRatingSummaryForTenant, upsertLessonRatingForTenant } from "@/modules/courses/playback.repository";
import { findAccessibleLessonForTenant } from "@/modules/courses/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try { const actor = await requireTenantActor(request); const { lessonId } = await params; const lesson = await findAccessibleLessonForTenant(actor.tenantId, lessonId, actor); if (!lesson) return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 }); return NextResponse.json({ summary: await getLessonRatingSummaryForTenant({ tenantId: actor.tenantId, lessonId: lesson.id, courseId: lesson.courseId, userId: actor.userId }) }); }
  catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "تعذر تحميل التقييم" }, { status: 500 }); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try { const actor = await requireTenantActor(request); if (actor.role !== "STUDENT") return NextResponse.json({ error: "غير مصرح" }, { status: 403 }); const { lessonId } = await params; const lesson = await findAccessibleLessonForTenant(actor.tenantId, lessonId, actor); if (!lesson) return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 }); const body = await request.json().catch(() => null) as { rating?: unknown } | null; const rating = Number(body?.rating); if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "التقييم يجب أن يكون من 1 إلى 5" }, { status: 400 }); await upsertLessonRatingForTenant({ tenantId: actor.tenantId, lessonId: lesson.id, courseId: lesson.courseId, userId: actor.userId, rating }); return NextResponse.json({ success: true, summary: await getLessonRatingSummaryForTenant({ tenantId: actor.tenantId, lessonId: lesson.id, courseId: lesson.courseId, userId: actor.userId }) }); }
  catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "تعذر حفظ التقييم" }, { status: 500 }); }
}
