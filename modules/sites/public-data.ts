import { prisma } from "@/lib/prisma";

export async function getTenantWebsiteContent(tenantId: string) {
  const [categories, teachers, testimonials, counts] = await Promise.all([
    prisma.category.findMany({
      // Categories can represent school stages, not only course filters.
      // Keep teacher-created stages visible even before their first course is published.
      where: { tenantId },
      select: { id: true, slug: true, name: true, nameAr: true, description: true, imageUrl: true, _count: { select: { courses: { where: { isPublished: true } } } } },
      orderBy: [{ order: "asc" }, { name: "asc" }], take: 12,
    }),
    prisma.tenantMembership.findMany({
      where: { tenantId, role: "TEACHER", status: "ACTIVE" },
      select: { id: true, userId: true, displayName: true, teacherSubject: true, teacherAvatarUrl: true, teacherBio: true, teacherLanguages: true, user: { select: { name: true } } },
      orderBy: [{ teacherHomepageOrder: "asc" }, { joinedAt: "asc" }], take: 12,
    }),
    prisma.review.findMany({
      where: { tenantId }, select: { id: true, text: true, textEn: true, authorName: true, authorTitle: true, authorTitleEn: true, imageUrl: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }], take: 12,
    }),
    Promise.all([
      prisma.course.count({ where: { tenantId, isPublished: true } }),
      prisma.tenantMembership.count({ where: { tenantId, role: "STUDENT", status: "ACTIVE" } }),
      prisma.tenantMembership.count({ where: { tenantId, role: "TEACHER", status: "ACTIVE" } }),
      prisma.enrollment.count({ where: { tenantId } }),
    ]),
  ]);
  return {
    categories,
    teachers: teachers.map((teacher) => ({ ...teacher, name: teacher.displayName || teacher.user.name, bio: teacher.teacherBio || undefined, languages: teacher.teacherLanguages || undefined })),
    testimonials,
    stats: { courses: counts[0], students: counts[1], teachers: counts[2], enrollments: counts[3] },
  };
}
