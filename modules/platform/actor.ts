import { getActiveActor } from "@/lib/security/session";
import { prisma } from "@/lib/prisma";
import type { PlatformActor } from "@/modules/platform/authorization";

/**
 * Resolves an explicit active platform-administrator grant. In particular, a
 * TenantMembership OWNER/ADMIN and the legacy User.role grant no authority
 * here.
 */
export async function getPlatformActor(): Promise<PlatformActor | null> {
  const sessionActor = await getActiveActor();
  if (!sessionActor) return null;
  const grant = await prisma.platformAdministrator.findFirst({
    where: { userId: sessionActor.userId, isActive: true },
    select: { id: true },
  });
  return grant ? { userId: sessionActor.userId, administratorId: grant.id } : null;
}
