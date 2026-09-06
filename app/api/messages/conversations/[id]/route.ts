import { NextRequest, NextResponse } from "next/server";
import { getConversationForTenant, getConversationMessagesForTenant } from "@/modules/messaging/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  const { id } = await params;
  const conversation = await getConversationForTenant({ tenantId: actor.tenantId, conversationId: id });
  if (!conversation || (conversation.staffUserId !== actor.userId && conversation.studentUserId !== actor.userId)) return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });
  return NextResponse.json({ conversation, messages: await getConversationMessagesForTenant({ tenantId: actor.tenantId, conversationId: id }) });
}
