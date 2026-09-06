import { prisma } from "@/lib/prisma";

function assertTenantId(tenantId: string): void {
  if (!tenantId) throw new Error("Tenant context is required");
}

export async function listLiveStreamsForTenant({ tenantId, teacherUserId }: { tenantId: string; teacherUserId?: string }) {
  assertTenantId(tenantId);
  return prisma.liveStream.findMany({
    where: { tenantId, ...(teacherUserId ? { course: { tenantId, createdById: teacherUserId } } : {}) },
    include: { course: { select: { id: true, title: true, titleAr: true, slug: true, createdById: true } } },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function findLiveStreamForTenant(tenantId: string, id: string) {
  assertTenantId(tenantId);
  return prisma.liveStream.findFirst({
    where: { tenantId, id, course: { tenantId } },
    include: { course: { select: { id: true, createdById: true } } },
  });
}

export async function createLiveStreamForTenant({ tenantId, courseId, data }: {
  tenantId: string;
  courseId: string;
  data: { title: string; titleAr?: string | null; provider: string; meetingUrl: string; meetingId?: string | null; meetingPassword?: string | null; scheduledAt: Date; description?: string | null; order?: number };
}) {
  assertTenantId(tenantId);
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId }, select: { id: true } });
  if (!course) return null;
  return prisma.liveStream.create({ data: { tenantId, courseId, ...data, order: data.order ?? 0 } });
}

export async function updateLiveStreamForTenant({ tenantId, id, data }: {
  tenantId: string;
  id: string;
  data: { courseId?: string; title?: string; titleAr?: string | null; provider?: string; meetingUrl?: string; meetingId?: string | null; meetingPassword?: string | null; scheduledAt?: Date; description?: string | null; order?: number };
}) {
  assertTenantId(tenantId);
  const existing = await findLiveStreamForTenant(tenantId, id);
  if (!existing) return null;
  if (data.courseId) {
    const course = await prisma.course.findFirst({ where: { id: data.courseId, tenantId }, select: { id: true } });
    if (!course) return null;
  }
  return prisma.liveStream.update({ where: { id }, data });
}

export async function deleteLiveStreamForTenant(tenantId: string, id: string) {
  assertTenantId(tenantId);
  return prisma.liveStream.deleteMany({ where: { tenantId, id } });
}
