import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findManagedCourseForTenant } from "@/modules/courses/repository";
import { canTenant } from "@/modules/tenants/authorization";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

function generateCode() { return crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase(); }

async function actorForCodes(request: NextRequest) {
  const actor = await requireTenantActor(request);
  if (!canTenant(actor, "MANAGE_ACTIVATION_CODES")) throw new Error("FORBIDDEN");
  return actor;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await actorForCodes(request);
    const courseId = new URL(request.url).searchParams.get("courseId");
    if (courseId && !await findManagedCourseForTenant(actor.tenantId, courseId, actor)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const codes = await prisma.activationCode.findMany({
      where: { tenantId: actor.tenantId, ...(courseId ? { courseId } : {}), ...(actor.role === "TEACHER" ? { course: { createdById: actor.userId } } : {}) },
      include: { course: { select: { id: true, title: true } }, lessons: { select: { lessonId: true } }, quizzes: { select: { quizId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(codes.map((code) => ({ id: code.id, code: code.code, courseId: code.courseId, course: code.course, createdAt: code.createdAt, usedAt: code.usedAt, lessonIds: code.lessons.map((item) => item.lessonId), quizIds: code.quizzes.map((item) => item.quizId) })));
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to list codes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await actorForCodes(request);
    const body = await request.json() as { courseId?: unknown; count?: unknown; lessonIds?: unknown; quizIds?: unknown };
    const courseId = typeof body.courseId === "string" ? body.courseId : "";
    const count = Math.max(1, Math.min(500, Number(body.count) || 1));
    const course = await findManagedCourseForTenant(actor.tenantId, courseId, actor);
    if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const lessonIds = Array.isArray(body.lessonIds) ? body.lessonIds.filter((id): id is string => typeof id === "string" && course.lessons.some((lesson) => lesson.id === id)) : [];
    const quizIds = Array.isArray(body.quizIds) ? body.quizIds.filter((id): id is string => typeof id === "string" && course.quizzes.some((quiz) => quiz.id === id)) : [];
    const created = await prisma.$transaction(async (tx) => Promise.all(Array.from({ length: count }, async () => {
      for (let tries = 0; tries < 5; tries++) {
        try {
          return await tx.activationCode.create({ data: { tenantId: actor.tenantId, courseId: course.id, code: generateCode(), lessons: { create: lessonIds.map((lessonId) => ({ lessonId })) }, quizzes: { create: quizIds.map((quizId) => ({ quizId })) } } });
        } catch (error) { if (tries === 4) throw error; }
      }
      throw new Error("CODE_GENERATION_FAILED");
    })));
    return NextResponse.json({ created, count: created.length });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to create codes" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await actorForCodes(request);
    const body = await request.json() as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
    if (!ids.length) return NextResponse.json({ error: "No codes selected" }, { status: 400 });
    const deleted = await prisma.activationCode.deleteMany({ where: { id: { in: ids }, tenantId: actor.tenantId, ...(actor.role === "TEACHER" ? { course: { createdById: actor.userId } } : {}) } });
    return NextResponse.json({ success: true, deleted: deleted.count });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to delete codes" }, { status: 500 });
  }
}
