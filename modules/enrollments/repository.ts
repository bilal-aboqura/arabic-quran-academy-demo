import { prisma } from "@/lib/prisma";

function assertTenantId(tenantId: string): void {
  if (!tenantId) throw new Error("Tenant context is required");
}

export async function findEnrollmentForTenant({ tenantId, userId, courseId }: { tenantId: string; userId: string; courseId: string }) {
  assertTenantId(tenantId);
  return prisma.enrollment.findFirst({
    where: { tenantId, userId, courseId, course: { tenantId } },
  });
}

export async function listEnrollmentsForTenantStudent({ tenantId, userId }: { tenantId: string; userId: string }) {
  assertTenantId(tenantId);
  return prisma.enrollment.findMany({
    where: { tenantId, userId, course: { tenantId } },
    include: { course: true, studentMembership: true },
    orderBy: { enrolledAt: "desc" },
  });
}

/**
 * Creates an entitlement only after proving both the student membership and
 * course belong to the same trusted tenant context.
 */
export async function createEnrollmentForTenant({ tenantId, userId, courseId }: { tenantId: string; userId: string; courseId: string }) {
  assertTenantId(tenantId);
  return prisma.$transaction(async (tx) => {
    const [studentMembership, course] = await Promise.all([
      tx.tenantMembership.findFirst({
        where: { tenantId, userId, role: "STUDENT", status: "ACTIVE" },
        select: { id: true },
      }),
      tx.course.findFirst({ where: { id: courseId, tenantId }, select: { id: true } }),
    ]);
    if (!studentMembership || !course) return null;

    const existing = await tx.enrollment.findFirst({ where: { tenantId, userId, courseId } });
    if (existing) return existing;
    return tx.enrollment.create({
      data: { tenantId, userId, studentMembershipId: studentMembership.id, courseId },
    });
  });
}

export async function deleteEnrollmentForTenant({ tenantId, userId, courseId }: { tenantId: string; userId: string; courseId: string }) {
  assertTenantId(tenantId);
  return prisma.enrollment.deleteMany({ where: { tenantId, userId, courseId } });
}
