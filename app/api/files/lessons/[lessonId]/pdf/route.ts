import { NextRequest, NextResponse } from "next/server";
import { downloadFromR2 } from "@/lib/r2";
import { findAccessibleLessonForTenant } from "@/modules/courses/repository";
import { isTenantObjectKeyForActor } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export const runtime = "nodejs";

/** Returns a tenant course PDF only after the normal course entitlement check. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    const { lessonId } = await params;
    const lesson = await findAccessibleLessonForTenant(actor.tenantId, lessonId, actor);
    if (!lesson?.pdfUrl || !isTenantObjectKeyForActor({ tenantId: actor.tenantId, kind: "attachments", key: lesson.pdfUrl })) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const file = await downloadFromR2(lesson.pdfUrl);
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to retrieve file" }, { status: 500 });
  }
}
