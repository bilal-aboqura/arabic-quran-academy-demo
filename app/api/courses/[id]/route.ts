import { NextRequest, NextResponse } from "next/server";
import { toTenantCourseApiDto } from "@/modules/courses/api-dto";
import { findPublishedCourseByIdForTenant, getTenantCourseContentAccess } from "@/modules/courses/repository";
import { getTenantActor } from "@/modules/tenants/actor";
import { resolveTenantFromRequest } from "@/modules/tenants/request-context";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const tenant = await resolveTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
    }
    const course = await findPublishedCourseByIdForTenant(tenant.tenantId, id);
    if (!course) return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });

    const actor = await getTenantActor(tenant);
    const access = await getTenantCourseContentAccess(tenant.tenantId, course, actor);
    return NextResponse.json(toTenantCourseApiDto(course, access));
  } catch (error) {
    console.error("API course:", error);
    return NextResponse.json(
      { error: "فشل جلب الدورة" },
      { status: 500 }
    );
  }
}
