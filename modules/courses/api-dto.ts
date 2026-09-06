import type { TenantCourseContentAccess } from "@/modules/courses/repository";

type CourseRecord = {
  id: string;
  tenantId: string | null;
  title: string;
  titleAr: string | null;
  slug: string;
  description: string;
  descriptionEn: string | null;
  shortDesc: string | null;
  shortDescEn: string | null;
  imageUrl: string | null;
  price: unknown;
  duration: string | null;
  level: string | null;
  isPublished: boolean;
  category: {
    id: string;
    name: string;
    nameAr: string | null;
    slug: string;
    tenantId: string | null;
  } | null;
  lessons: Array<{
    id: string;
    title: string;
    titleAr: string | null;
    slug: string;
    content: string | null;
    videoUrl: string | null;
    pdfUrl: string | null;
    duration: number | null;
    order: number;
    acceptsHomework: boolean;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    order: number;
    timeLimitMinutes: number | null;
    _count: { questions: number };
  }>;
};

/**
 * Public callers receive marketing data only. Content fields are emitted only
 * after tenant membership and a tenant-scoped entitlement were checked.
 */
export function toTenantCourseApiDto(course: CourseRecord, access: TenantCourseContentAccess) {
  const include = (id: string, allowed: Set<string>) =>
    access.mode === "full" || (access.mode === "partial" && allowed.has(id));

  return {
    id: course.id,
    title: course.title,
    titleAr: course.titleAr,
    slug: course.slug,
    description: course.description,
    descriptionEn: course.descriptionEn,
    shortDesc: course.shortDesc,
    shortDescEn: course.shortDescEn,
    imageUrl: course.imageUrl,
    price: course.price,
    duration: course.duration,
    level: course.level,
    isPublished: course.isPublished,
    // During the bridge migration the category FK is not tenant-composite.
    // Do not leak a malformed cross-tenant category even if legacy data has
    // an invalid relationship; the enforcement migration will make this
    // database-invalid once all writers are migrated.
    category: course.category && course.category.tenantId === course.tenantId
      ? { id: course.category.id, name: course.category.name, nameAr: course.category.nameAr, slug: course.category.slug }
      : null,
    lessonCount: course.lessons.length,
    quizCount: course.quizzes.length,
    contentAccess: access.mode,
    lessons:
      access.mode === "none"
        ? []
        : course.lessons
            .filter((lesson) => include(lesson.id, access.allowedLessonIds))
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              titleAr: lesson.titleAr,
              slug: lesson.slug,
              content: lesson.content,
              videoUrl: lesson.videoUrl,
              pdfUrl: lesson.pdfUrl,
              duration: lesson.duration,
              order: lesson.order,
              acceptsHomework: lesson.acceptsHomework,
            })),
    quizzes:
      access.mode === "none"
        ? []
        : course.quizzes
            .filter((quiz) => include(quiz.id, access.allowedQuizIds))
            .map((quiz) => ({
              id: quiz.id,
              title: quiz.title,
              order: quiz.order,
              timeLimitMinutes: quiz.timeLimitMinutes,
              questionCount: quiz._count.questions,
            })),
  };
}
