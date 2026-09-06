import { NextRequest, NextResponse } from "next/server";
import { listAssignmentSubmissionsForTenant, submitAssignmentForTenant } from "@/modules/assignments/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    const { assignmentId } = await params;
    const submissions = await listAssignmentSubmissionsForTenant({ tenantId: actor.tenantId, assignmentId, actor });
    return submissions ? NextResponse.json({ submissions }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to load submissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    if (actor.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { assignmentId } = await params;
    const body = await request.json() as { textContent?: unknown; files?: unknown };
    const files = Array.isArray(body.files)
      ? body.files.filter((file): file is { storageKey: string; fileName?: string | null } => !!file && typeof file === "object" && typeof (file as { storageKey?: unknown }).storageKey === "string")
      : undefined;
    const result = await submitAssignmentForTenant({ tenantId: actor.tenantId, assignmentId, actor, textContent: typeof body.textContent === "string" ? body.textContent : null, files });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 403 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit assignment" }, { status: 400 });
  }
}
