import { prisma } from "@/lib/prisma";

function assertTenantId(tenantId: string): void {
  if (!tenantId) throw new Error("Tenant context is required");
}

export async function findActiveStudentMembershipForTenant(tenantId: string, userId: string) {
  assertTenantId(tenantId);
  return prisma.tenantMembership.findFirst({
    where: { tenantId, userId, role: "STUDENT", status: "ACTIVE" },
    include: { user: true },
  });
}

export async function listActiveStudentsForTenant(tenantId: string) {
  assertTenantId(tenantId);
  return prisma.tenantMembership.findMany({
    where: { tenantId, role: "STUDENT", status: "ACTIVE" },
    include: { user: true },
    orderBy: [{ displayName: "asc" }, { createdAt: "asc" }],
  });
}

/** Lists only students enrolled in courses owned by this teacher inside this tenant. */
export async function listTeacherStudentsForTenant({ tenantId, teacherUserId }: { tenantId: string; teacherUserId: string }) {
  assertTenantId(tenantId);
  return prisma.tenantMembership.findMany({
    where: {
      tenantId,
      role: "STUDENT",
      status: "ACTIVE",
      studentEnrollments: {
        some: {
          tenantId,
          course: { tenantId, createdById: teacherUserId },
        },
      },
    },
    include: { user: true },
    orderBy: [{ displayName: "asc" }, { createdAt: "asc" }],
  });
}
