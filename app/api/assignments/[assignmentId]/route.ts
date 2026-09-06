import { NextRequest, NextResponse } from "next/server";
import { deleteAssignmentForTenant, updateAssignmentForTenant } from "@/modules/assignments/repository";
import { canManageCourse } from "@/modules/tenants/authorization";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    if (!canManageCourse(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { assignmentId } = await params;
    const body = await request.json() as Record<string, unknown>;
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    const deadline = body.deadline === null ? null : typeof body.deadline === "string" ? new Date(body.deadline) : undefined;
    if (deadline instanceof Date && Number.isNaN(deadline.getTime())) return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
    const assignment = await updateAssignmentForTenant({
      tenantId: actor.tenantId, courseId, assignmentId, actor,
      input: {
        ...(typeof body.title === "string" ? { title: body.title } : {}),
        ...(typeof body.description === "string" || body.description === null ? { description: body.description as string | null } : {}),
        ...(deadline !== undefined ? { deadline } : {}),
        ...(typeof body.maxGrade === "number" ? { maxGrade: body.maxGrade } : {}),
        ...(typeof body.isPublished === "boolean" ? { isPublished: body.isPublished } : {}),
        ...(typeof body.moduleId === "string" || body.moduleId === null ? { moduleId: body.moduleId as string | null } : {}),
      },
    });
    return assignment ? NextResponse.json({ assignment }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update assignment" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    if (!canManageCourse(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { assignmentId } = await params;
    const courseId = new URL(request.url).searchParams.get("courseId")?.trim() || "";
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    return await deleteAssignmentForTenant({ tenantId: actor.tenantId, courseId, assignmentId, actor })
      ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to delete assignment" }, { status: 500 });
  }
}
