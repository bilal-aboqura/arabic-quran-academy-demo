import { NextRequest, NextResponse } from "next/server";
import { downloadFromR2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { isTenantObjectKeyForActor } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export const runtime = "nodejs";

/** Streams a message attachment only to one of that conversation's members. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    const { messageId } = await params;
    const message = await prisma.message.findFirst({
      where: { id: messageId, tenantId: actor.tenantId },
      include: { conversation: { select: { staffUserId: true, studentUserId: true } } },
    });
    if (!message || !message.fileUrl || !message.conversation ||
      (message.conversation.staffUserId !== actor.userId && message.conversation.studentUserId !== actor.userId) ||
      !isTenantObjectKeyForActor({ tenantId: actor.tenantId, kind: "messages", actorUserId: message.senderId, key: message.fileUrl })) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const file = await downloadFromR2(message.fileUrl);
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(message.fileName || "attachment")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to retrieve file" }, { status: 500 });
  }
}
