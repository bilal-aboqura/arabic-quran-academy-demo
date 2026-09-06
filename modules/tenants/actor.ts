import { getActiveActor } from "@/lib/security/session";
import { prisma } from "@/lib/prisma";
import type { TenantActor, TenantContext } from "@/modules/tenants/types";

/** Resolves a current, active membership server-side for a resolved tenant. */
export async function getTenantActor(context: TenantContext): Promise<TenantActor | null> {
  const sessionActor = await getActiveActor();
  if (!sessionActor) return null;

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: context.tenantId,
      userId: sessionActor.userId,
      status: "ACTIVE",
    },
    select: { id: true, role: true },
  });
  if (!membership) return null;

  return {
    ...context,
    userId: sessionActor.userId,
    membershipId: membership.id,
    role: membership.role,
  };
}
