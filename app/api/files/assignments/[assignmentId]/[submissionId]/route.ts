import { NextRequest, NextResponse } from "next/server";
import { downloadFromR2 } from "@/lib/r2";
import { getAssignmentSubmissionFileForTenant } from "@/modules/assignments/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest, { params }: { params: Promise<{ assignmentId: string; submissionId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    const { assignmentId, submissionId } = await params;
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!key) return NextResponse.json({ error: "File key is required" }, { status: 400 });
    const file = await getAssignmentSubmissionFileForTenant({ tenantId: actor.tenantId, assignmentId, submissionId, storageKey: key, actor });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const result = await downloadFromR2(file.storageKey);
    return new NextResponse(result.body, {
      headers: {
        "Content-Type": result.contentType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName || "assignment-file")}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to download file" }, { status: 500 });
  }
}
