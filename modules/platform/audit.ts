import { prisma } from "@/lib/prisma";
import type { PlatformActor } from "./authorization";

export async function logPlatformAction(args: {
  actor: PlatformActor;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: args.actor.userId },
      select: { email: true },
    });

    return await prisma.auditLog.create({
      data: {
        actorUserId: args.actor.userId,
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId,
        metadata: {
          ...args.metadata,
          actorEmail: user?.email,
          platformAdminId: args.actor.administratorId,
        },
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to write platform audit log:", error);
    return null;
  }
}

export async function listPlatformAuditLogs(options?: {
  limit?: number;
  action?: string;
  targetType?: string;
}) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { tenantId: null },
        { action: { in: ["SITE_TEMPLATE_APPLIED", "SITE_TEMPLATE_CHANGED", "SITE_INITIALIZED_FROM_TEMPLATE"] } },
      ],
      ...(options?.action ? { action: options.action } : {}),
      ...(options?.targetType ? { targetType: options.targetType } : {}),
    },
    include: {
      actorUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
  });
}
