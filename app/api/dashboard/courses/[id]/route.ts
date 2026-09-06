import { NextRequest, NextResponse } from "next/server";
import { deleteManagedCourseForTenant, findManagedCourseForTenant, updateManagedCourseForTenant } from "@/modules/courses/repository";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

async function actorForCourse(request: NextRequest) { return requireRequestTenantPermission(request, "MANAGE_COURSES"); }

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await actorForCourse(request); const { id } = await params; const course = await findManagedCourseForTenant(actor.tenantId, id, actor); if (!course) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 }); return NextResponse.json({ ...course, contentOrder: [...course.lessons.map((_, index) => ({ type: "lesson", index })), ...course.quizzes.map((_, index) => ({ type: "quiz", index }))] }); }
  catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "فشل جلب الدورة" }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await actorForCourse(request); const { id } = await params; const body = await request.json();
    if (!Array.isArray(body.lessons) || !Array.isArray(body.quizzes)) return NextResponse.json({ error: "محتوى الدورة مطلوب" }, { status: 400 });
    const course = await updateManagedCourseForTenant({ tenantId: actor.tenantId, courseId: id, actor, input: { title: String(body.titleEn ?? body.title ?? "").trim(), titleAr: String(body.titleAr ?? body.title ?? "").trim(), description: String(body.descriptionAr ?? body.description ?? "").trim(), descriptionEn: String(body.descriptionEn ?? "").trim(), shortDesc: typeof body.shortDescAr === "string" ? body.shortDescAr : null, shortDescEn: typeof body.shortDescEn === "string" ? body.shortDescEn : null, imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null, price: Number(body.price ?? 0), isPublished: body.isPublished !== false, maxQuizAttempts: typeof body.maxQuizAttempts === "number" ? body.maxQuizAttempts : null, categoryId: typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null, acceptsHomework: body.acceptsHomework === true, lessons: body.lessons, quizzes: body.quizzes } });
    if (!course) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 }); return NextResponse.json({ success: true, id: course.id });
  } catch (error) { const response = tenantRequestErrorResponse(error); if (response) return response; if (error instanceof Error && error.message === "CATEGORY_NOT_IN_TENANT") return NextResponse.json({ error: "القسم غير صالح" }, { status: 400 }); console.error("course update", error); return NextResponse.json({ error: "فشل تحديث الدورة" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await actorForCourse(request); const { id } = await params; const deleted = await deleteManagedCourseForTenant(actor.tenantId, id, actor); return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 }); }
  catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "فشل حذف الدورة" }, { status: 500 }); }
}
