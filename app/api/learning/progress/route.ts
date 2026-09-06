import { NextRequest, NextResponse } from "next/server";
import { getCourseProgressForTenant, listContinueLearningForTenant, recordLessonProgressForTenant } from "@/modules/learning/progress.repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

/** Server-authoritative resume, completion, and continue-learning endpoint. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request);
    if (actor.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const query = new URL(request.url).searchParams;
    const courseId = query.get("courseId")?.trim();
    if (!courseId) {
      return NextResponse.json({ items: await listContinueLearningForTenant({ tenantId: actor.tenantId, actor }) });
    }
    const progress = await getCourseProgressForTenant({ tenantId: actor.tenantId, courseId, actor });
    return progress ? NextResponse.json(progress) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to load learning progress" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request);
    if (actor.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json() as { courseId?: unknown; lessonId?: unknown; positionSeconds?: unknown; completed?: unknown };
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
    const positionSeconds = Number(body.positionSeconds);
    if (!courseId || !lessonId || !Number.isFinite(positionSeconds)) {
      return NextResponse.json({ error: "Invalid progress payload" }, { status: 400 });
    }
    const result = await recordLessonProgressForTenant({
      tenantId: actor.tenantId,
      courseId,
      lessonId,
      actor,
      positionSeconds,
      markCompleted: body.completed === true,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 403 });
    return NextResponse.json(result);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to save learning progress" }, { status: 500 });
  }
}
