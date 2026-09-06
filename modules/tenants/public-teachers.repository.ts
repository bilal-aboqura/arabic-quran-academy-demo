import { prisma } from "@/lib/prisma";

export type TenantPublicTeacher = {
  id: string;
  name: string;
  teacherSubject: string | null;
  teacherAvatarUrl: string | null;
  courses: { id: string; title: string; slug: string }[];
};

/** Public teacher cards are always constrained by the resolved tenant. */
export async function listPublicTeachersForTenant(tenantId: string): Promise<TenantPublicTeacher[]> {
  const teachers = await prisma.tenantMembership.findMany({
    where: { tenantId, role: "TEACHER", status: "ACTIVE" },
    select: {
      userId: true,
      displayName: true,
      teacherSubject: true,
      teacherAvatarUrl: true,
      user: {
        select: {
          name: true,
          coursesCreated: {
            where: { tenantId, isPublished: true },
            select: { id: true, title: true, slug: true },
          },
        },
      },
    },
    orderBy: [{ teacherHomepageOrder: "asc" }, { displayName: "asc" }],
  });

  return teachers.map((teacher) => ({
    id: teacher.userId,
    name: teacher.displayName || teacher.user.name,
    teacherSubject: teacher.teacherSubject,
    teacherAvatarUrl: teacher.teacherAvatarUrl,
    courses: teacher.user.coursesCreated,
  }));
}
