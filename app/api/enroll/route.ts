import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEnrollmentForTenant, findEnrollmentForTenant } from "@/modules/enrollments/repository";
import { purchaseCourseWithTenantBalance, TenantCommerceError } from "@/modules/commerce/tenant-wallet";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function POST(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (actor.role !== "STUDENT") return NextResponse.json({ error: "يجب تسجيل الدخول كطالب" }, { status: 403 });
  const courseId = new URL(request.url).searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "معرف الدورة مطلوب" }, { status: 400 });
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: actor.tenantId, isPublished: true } });
  if (!course) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  if (Number(course.price) > 0) {
    try {
      const purchased = await purchaseCourseWithTenantBalance({
        tenantId: actor.tenantId,
        userId: actor.userId,
        courseId,
        idempotencyKey: request.headers.get("idempotency-key"),
      });
      return NextResponse.json({ success: true, message: purchased.alreadyEnrolled ? "مسجّل في هذه الدورة مسبقاً" : "تم التسجيل بنجاح", ...purchased });
    } catch (error) {
      if (error instanceof TenantCommerceError) {
        const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : error.code === "INSUFFICIENT_BALANCE" ? 400 : 409;
        return NextResponse.json({ error: error.message, code: error.code }, { status });
      }
      console.error("tenant paid enrollment", error);
      return NextResponse.json({ error: "تعذر إتمام عملية التسجيل" }, { status: 500 });
    }
  }
  if (await findEnrollmentForTenant({ tenantId: actor.tenantId, userId: actor.userId, courseId })) return NextResponse.json({ error: "مسجّل في هذه الدورة مسبقاً" }, { status: 400 });
  const enrollment = await createEnrollmentForTenant({ tenantId: actor.tenantId, userId: actor.userId, courseId });
  if (!enrollment) return NextResponse.json({ error: "الدورة غير موجودة أو العضوية غير صالحة" }, { status: 404 });
  return NextResponse.json({ success: true, message: "تم التسجيل بنجاح" });
}
