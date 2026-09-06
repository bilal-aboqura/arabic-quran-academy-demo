import { NextRequest, NextResponse } from "next/server";
import { downloadFromR2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/modules/tenants/authorization";
import { isTenantObjectKeyForActor } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export const runtime = "nodejs";

/** Allows a student to retrieve only their own submission and staff only work they manage. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ submissionId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    const { submissionId } = await params;
    const submission = await prisma.homeworkSubmission.findFirst({
      where: { id: submissionId, tenantId: actor.tenantId },
      include: { course: { select: { createdById: true } } },
    });
    const isSubmitter = submission?.userId === actor.userId;
    const managesCourse = !!submission && canManageCourse(actor) &&
      (actor.role !== "TEACHER" || submission.course.createdById === actor.userId);
    if (!submission?.fileUrl || (!isSubmitter && !managesCourse) ||
      !isTenantObjectKeyForActor({ tenantId: actor.tenantId, kind: "homework", key: submission.fileUrl })) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const file = await downloadFromR2(submission.fileUrl);
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(submission.fileName || "submission")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to retrieve file" }, { status: 500 });
  }
}
