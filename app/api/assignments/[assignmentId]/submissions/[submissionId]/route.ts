import { NextRequest, NextResponse } from "next/server";
import { gradeAssignmentSubmissionForTenant } from "@/modules/assignments/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ assignmentId: string; submissionId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    const { assignmentId, submissionId } = await params;
    const body = await request.json() as { grade?: unknown; feedback?: unknown };
    const grade = Number(body.grade);
    if (!Number.isFinite(grade)) return NextResponse.json({ error: "A valid grade is required" }, { status: 400 });
    const result = await gradeAssignmentSubmissionForTenant({ tenantId: actor.tenantId, assignmentId, submissionId, actor, grade, feedback: typeof body.feedback === "string" ? body.feedback : null });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "INVALID_GRADE" ? 400 : result.error === "NOT_FOUND" ? 404 : 403 });
    return NextResponse.json(result);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to review submission" }, { status: 500 });
  }
}
