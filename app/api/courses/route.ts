import { NextRequest, NextResponse } from "next/server";
import { createCourseForTenant, listPublishedCoursesForTenant, type CourseWriteInput } from "@/modules/courses/repository";
import { requireRequestTenantPermission, resolveTenantFromRequest, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

/** Public catalog: host-derived tenant is mandatory. */
export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "الدورات غير موجودة" }, { status: 404 });
    return NextResponse.json(await listPublishedCoursesForTenant(tenant.tenantId));
  } catch (error) {
    console.error("API courses:", error);
    return NextResponse.json({ error: "فشل جلب الدورات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_COURSES");
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const title = typeof body?.titleEn === "string" ? body.titleEn.trim() : typeof body?.title === "string" ? body.title.trim() : "";
    const titleAr = typeof body?.titleAr === "string" ? body.titleAr.trim() : title;
    const description = typeof body?.descriptionAr === "string" ? body.descriptionAr.trim() : typeof body?.description === "string" ? body.description.trim() : "";
    const descriptionEn = typeof body?.descriptionEn === "string" ? body.descriptionEn.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!title || !titleAr || !description || !descriptionEn || !slug) return NextResponse.json({ error: "العنوان والوصف والرابط مطلوبان" }, { status: 400 });
    const lessons = Array.isArray(body?.lessons) ? body.lessons.filter((x): x is Record<string, unknown> => !!x && typeof x === "object").map((x) => ({ title: typeof x.title === "string" ? x.title.trim() || "حصة" : "حصة", titleAr: typeof x.titleAr === "string" ? x.titleAr.trim() || null : null, content: typeof x.content === "string" ? x.content.trim() || null : null, videoUrl: typeof x.videoUrl === "string" ? x.videoUrl.trim() || null : null, pdfUrl: typeof x.pdfUrl === "string" ? x.pdfUrl.trim() || null : null, acceptsHomework: x.acceptsHomework === true })) : [];
    const quizzes = Array.isArray(body?.quizzes) ? body.quizzes.filter((x): x is Record<string, unknown> => !!x && typeof x === "object").map((x) => ({ title: typeof x.title === "string" ? x.title.trim() || "اختبار" : "اختبار", timeLimitMinutes: typeof x.timeLimitMinutes === "number" && x.timeLimitMinutes > 0 ? Math.floor(x.timeLimitMinutes) : null })) : [];
    const input: CourseWriteInput = { title, titleAr, slug, description, descriptionEn, lessons, quizzes,
      shortDesc: typeof body?.shortDescAr === "string" ? body.shortDescAr.trim() || null : null,
      shortDescEn: typeof body?.shortDescEn === "string" ? body.shortDescEn.trim() || null : null,
      imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      price: typeof body?.price === "number" && body.price >= 0 ? body.price : 0,
      categoryId: typeof body?.categoryId === "string" && body.categoryId.trim() ? body.categoryId.trim() : null,
      maxQuizAttempts: typeof body?.maxQuizAttempts === "number" && body.maxQuizAttempts > 0 ? Math.floor(body.maxQuizAttempts) : null,
      acceptsHomework: body?.acceptsHomework === true };
    const course = await createCourseForTenant(actor.tenantId, actor, input);
    return NextResponse.json({ id: course.id, title: course.title, slug: course.slug }, { status: 201 });
  } catch (error) {
    const response = tenantRequestErrorResponse(error);
    if (response) return response;
    if (error instanceof Error && error.message === "CATEGORY_NOT_IN_TENANT") return NextResponse.json({ error: "القسم غير صالح" }, { status: 400 });
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "رابط الدورة مستخدم مسبقاً" }, { status: 409 });
    console.error("API course POST:", error);
    return NextResponse.json({ error: "فشل إنشاء الدورة" }, { status: 500 });
  }
}
