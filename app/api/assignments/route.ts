import { NextRequest, NextResponse } from "next/server";
import { createAssignmentForTenant, listAssignmentsForStudentTenant, listManagedAssignmentsForTenant } from "@/modules/assignments/repository";
import { canManageCourse } from "@/modules/tenants/authorization";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request);
    if (actor.role === "STUDENT") {
      return NextResponse.json({ assignments: await listAssignmentsForStudentTenant({ tenantId: actor.tenantId, actor }) });
    }
    if (!canManageCourse(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const courseId = new URL(request.url).searchParams.get("courseId")?.trim() || "";
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    const assignments = await listManagedAssignmentsForTenant({ tenantId: actor.tenantId, courseId, actor });
    return assignments ? NextResponse.json({ assignments }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to load assignments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request);
    if (!canManageCourse(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    const title = typeof body.title === "string" ? body.title : "";
    if (!courseId || !title.trim()) return NextResponse.json({ error: "courseId and title are required" }, { status: 400 });
    const deadline = typeof body.deadline === "string" && body.deadline ? new Date(body.deadline) : null;
    if (deadline && Number.isNaN(deadline.getTime())) return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
    const assignment = await createAssignmentForTenant({
      tenantId: actor.tenantId, courseId, actor,
      input: {
        title, description: typeof body.description === "string" ? body.description : "",
        deadline, maxGrade: typeof body.maxGrade === "number" ? body.maxGrade : undefined,
        isPublished: body.isPublished === true, moduleId: typeof body.moduleId === "string" ? body.moduleId : null,
      },
    });
    return assignment ? NextResponse.json({ assignment }, { status: 201 }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create assignment" }, { status: 400 });
  }
}
