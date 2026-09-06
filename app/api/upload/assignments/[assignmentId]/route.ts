import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { checkRequestRateLimit } from "@/lib/security/rate-limit";
import { getAssignmentUploadTargetForTenant } from "@/modules/assignments/repository";
import { buildTenantObjectKey } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  if (!checkRequestRateLimit(request, { scope: "upload-assignment", limit: 20, windowMs: 15 * 60_000 }).allowed) {
    return NextResponse.json({ error: "Too many upload attempts" }, { status: 429 });
  }
  try {
    const actor = await requireTenantActor(request);
    if (actor.role !== "STUDENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { assignmentId } = await params;
    if (!(await getAssignmentUploadTargetForTenant({ tenantId: actor.tenantId, assignmentId, actor }))) {
      return NextResponse.json({ error: "Assignment is not available" }, { status: 404 });
    }
    if (!isR2Configured()) return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !acceptedTypes.has(file.type)) {
      return NextResponse.json({ error: "Only PDF, JPEG, PNG, and WebP files are supported" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File exceeds the 10 MB limit" }, { status: 400 });
    const key = buildTenantObjectKey({ tenantId: actor.tenantId, kind: "assignments", fileName: file.name });
    await uploadToR2(Buffer.from(await file.arrayBuffer()), key, file.type);
    return NextResponse.json({ key, fileName: file.name });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to upload assignment file" }, { status: 400 });
  }
}
