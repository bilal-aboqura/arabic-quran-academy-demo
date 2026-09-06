import { NextRequest, NextResponse } from "next/server";
import { createMessageForTenant, getConversationForTenant } from "@/modules/messaging/repository";
import { isTenantObjectKeyForActor } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function POST(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  let body: { conversationId?: string; messageType?: string; content?: string; fileKey?: string; fileName?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const conversationId = body.conversationId?.trim();
  const type = body.messageType === "image" || body.messageType === "file" ? body.messageType : "text";
  if (!conversationId || (type === "text" && !body.content?.trim())) return NextResponse.json({ error: "محتوى الرسالة غير صالح" }, { status: 400 });
  if (type !== "text" && !isTenantObjectKeyForActor({ tenantId: actor.tenantId, kind: "messages", actorUserId: actor.userId, key: body.fileKey?.trim() ?? "" })) return NextResponse.json({ error: "ملف الرسالة غير صالح" }, { status: 400 });
  const conversation = await getConversationForTenant({ tenantId: actor.tenantId, conversationId });
  if (!conversation || (conversation.staffUserId !== actor.userId && conversation.studentUserId !== actor.userId)) return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });
  const message = await createMessageForTenant({ tenantId: actor.tenantId, conversationId, senderId: actor.userId, messageType: type, content: type === "text" ? body.content?.trim() : null, fileUrl: type === "text" ? null : body.fileKey?.trim(), fileName: body.fileName?.trim() || null });
  if (!message) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  return NextResponse.json(message);
}
