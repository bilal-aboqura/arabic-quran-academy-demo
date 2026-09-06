import { prisma } from "@/lib/prisma";

function assertTenantId(tenantId: string): void {
  if (!tenantId) throw new Error("Tenant context is required");
}

export async function listHomeworkForTenant({ tenantId, studentName }: { tenantId: string; studentName?: string }) {
  assertTenantId(tenantId);
  return prisma.homeworkSubmission.findMany({
    where: {
      tenantId,
      ...(studentName ? { user: { name: { contains: studentName, mode: "insensitive" } } } : {}),
    },
    include: { user: true, course: true, lesson: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listHomeworkForTeacherTenant({ tenantId, teacherUserId, studentName }: { tenantId: string; teacherUserId: string; studentName?: string }) {
  assertTenantId(tenantId);
  return prisma.homeworkSubmission.findMany({
    where: {
      tenantId,
      course: { tenantId, createdById: teacherUserId },
      ...(studentName ? { user: { name: { contains: studentName, mode: "insensitive" } } } : {}),
    },
    include: { user: true, course: true, lesson: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listHomeworkForTenantStudent({ tenantId, userId, courseId, lessonId }: { tenantId: string; userId: string; courseId?: string; lessonId?: string }) {
  assertTenantId(tenantId);
  return prisma.homeworkSubmission.findMany({
    where: { tenantId, userId, ...(courseId ? { courseId } : {}), ...(lessonId ? { lessonId } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

export async function createHomeworkForTenant({
  tenantId,
  userId,
  courseId,
  lessonId,
  submissionType,
  linkUrl,
  fileUrl,
  fileName,
}: {
  tenantId: string;
  userId: string;
  courseId: string;
  lessonId?: string | null;
  submissionType: string;
  linkUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
}) {
  assertTenantId(tenantId);
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findFirst({ where: { tenantId, userId, courseId } });
    const lesson = lessonId
      ? await tx.lesson.findFirst({ where: { id: lessonId, courseId, course: { tenantId } }, select: { id: true } })
      : null;
    if (!enrollment || (lessonId && !lesson)) return null;
    return tx.homeworkSubmission.create({
      data: { tenantId, userId, courseId, lessonId: lessonId ?? null, submissionType, linkUrl: linkUrl ?? null, fileUrl: fileUrl ?? null, fileName: fileName ?? null },
    });
  });
}

export async function deleteHomeworkForTenant({ tenantId, ids, teacherUserId }: { tenantId: string; ids: string[]; teacherUserId?: string }) {
  assertTenantId(tenantId);
  return prisma.homeworkSubmission.deleteMany({
    where: {
      tenantId,
      id: { in: ids },
      ...(teacherUserId ? { course: { tenantId, createdById: teacherUserId } } : {}),
    },
  });
}
