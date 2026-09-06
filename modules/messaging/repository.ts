import { prisma } from "@/lib/prisma";

function assertTenantId(tenantId: string): void {
  if (!tenantId) throw new Error("Tenant context is required");
}

export async function listConversationsForTenantParticipant({ tenantId, userId, participant }: { tenantId: string; userId: string; participant: "staff" | "student" }) {
  assertTenantId(tenantId);
  return prisma.conversation.findMany({
    where: { tenantId, ...(participant === "staff" ? { staffUserId: userId } : { studentUserId: userId }) },
    include: { staffUser: true, studentUser: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getConversationForTenant({ tenantId, conversationId }: { tenantId: string; conversationId: string }) {
  assertTenantId(tenantId);
  return prisma.conversation.findFirst({ where: { id: conversationId, tenantId } });
}

export async function getConversationMessagesForTenant({ tenantId, conversationId }: { tenantId: string; conversationId: string }) {
  assertTenantId(tenantId);
  return prisma.message.findMany({ where: { tenantId, conversationId }, orderBy: { createdAt: "asc" } });
}

/**
 * Memberships are checked inside the transaction. The temporary legacy unique
 * constraint may reject the same global pair in a second tenant; that failure
 * is intentionally not treated as permission to return the other tenant's row.
 */
export async function getOrCreateConversationForTenant({ tenantId, staffUserId, studentUserId }: { tenantId: string; staffUserId: string; studentUserId: string }) {
  assertTenantId(tenantId);
  return prisma.$transaction(async (tx) => {
    const [staff, student] = await Promise.all([
      tx.tenantMembership.findFirst({ where: { tenantId, userId: staffUserId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"] } }, select: { id: true } }),
      tx.tenantMembership.findFirst({ where: { tenantId, userId: studentUserId, status: "ACTIVE", role: "STUDENT" }, select: { id: true } }),
    ]);
    if (!staff || !student) return null;
    const existing = await tx.conversation.findFirst({ where: { tenantId, staffUserId, studentUserId } });
    if (existing) return existing;
    return tx.conversation.create({ data: { tenantId, staffUserId, studentUserId } });
  });
}

export async function createMessageForTenant({ tenantId, conversationId, senderId, messageType, content, fileUrl, fileName }: {
  tenantId: string;
  conversationId: string;
  senderId: string;
  messageType: string;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}) {
  assertTenantId(tenantId);
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({ where: { id: conversationId, tenantId } });
    if (!conversation || (conversation.staffUserId !== senderId && conversation.studentUserId !== senderId)) return null;
    const message = await tx.message.create({
      data: { tenantId, conversationId, senderId, messageType, content: content ?? null, fileUrl: fileUrl ?? null, fileName: fileName ?? null },
    });
    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return message;
  });
}

export async function deleteMessageForTenant({ tenantId, messageId, senderId }: { tenantId: string; messageId: string; senderId: string }) {
  assertTenantId(tenantId);
  return prisma.message.deleteMany({ where: { tenantId, id: messageId, senderId } });
}
