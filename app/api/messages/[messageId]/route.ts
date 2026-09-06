import { NextRequest, NextResponse } from "next/server";
import { deleteMessageForTenant } from "@/modules/messaging/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  const { messageId } = await params;
  const result = await deleteMessageForTenant({ tenantId: actor.tenantId, messageId, senderId: actor.userId });
  if (!result.count) return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
