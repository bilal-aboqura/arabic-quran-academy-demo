import { NextRequest, NextResponse } from "next/server";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { canManageCourse } from "@/modules/tenants/authorization";
import { findManagedCourseForTenant } from "@/modules/courses/repository";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    if (!canManageCourse(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const course = await findManagedCourseForTenant(actor.tenantId, id, actor);
    if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(course.quizzes.map((quiz) => ({ id: quiz.id, title: quiz.title })));
  } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to list quizzes" }, { status: 500 }); }
}
