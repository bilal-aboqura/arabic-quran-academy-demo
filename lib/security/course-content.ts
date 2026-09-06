import {
  getAllowedLessonIdsForUserCourse,
  getAllowedQuizIdsForUserCourse,
  getEnrollment,
  hasFullCourseAccessAsStudent,
} from "@/lib/db";
import { canManageCourse } from "@/lib/permissions";
import type { ActiveActor } from "@/lib/security/session";

type UnknownRecord = Record<string, unknown>;

export type CourseContentSource = {
  course: UnknownRecord;
  lessons: UnknownRecord[];
  quizzes: Array<UnknownRecord & { _count?: { questions?: number } }>;
};

type ContentAccess = "none" | "partial" | "full";

function stringValue(row: UnknownRecord, camel: string, snake = camel): string | null {
  const value = row[camel] ?? row[snake];
  return typeof value === "string" ? value : null;
}

function value<T>(row: UnknownRecord, camel: string, snake = camel): T | null {
  return (row[camel] ?? row[snake] ?? null) as T | null;
}

function publicCourseDto(course: UnknownRecord, lessonCount: number, quizCount: number) {
  const category = value<UnknownRecord>(course, "category");
  return {
    id: stringValue(course, "id"),
    title: stringValue(course, "title"),
    titleAr: stringValue(course, "titleAr", "title_ar"),
    slug: stringValue(course, "slug"),
    description: stringValue(course, "description"),
    descriptionEn: stringValue(course, "descriptionEn", "description_en"),
    shortDesc: stringValue(course, "shortDesc", "short_desc"),
    shortDescEn: stringValue(course, "shortDescEn", "short_desc_en"),
    imageUrl: stringValue(course, "imageUrl", "image_url"),
    price: value(course, "price"),
    duration: value(course, "duration"),
    level: value(course, "level"),
    isPublished: value(course, "isPublished", "is_published"),
    category: category
      ? {
          id: stringValue(category, "id"),
          name: stringValue(category, "name"),
          nameAr: stringValue(category, "nameAr", "name_ar"),
          slug: stringValue(category, "slug"),
        }
      : null,
    lessonCount,
    quizCount,
  };
}

function lessonDto(lesson: UnknownRecord) {
  return {
    id: stringValue(lesson, "id"),
    title: stringValue(lesson, "title"),
    titleAr: stringValue(lesson, "titleAr", "title_ar"),
    slug: stringValue(lesson, "slug"),
    content: stringValue(lesson, "content"),
    videoUrl: stringValue(lesson, "videoUrl", "video_url"),
    pdfUrl: stringValue(lesson, "pdfUrl", "pdf_url"),
    duration: value(lesson, "duration"),
    order: value(lesson, "order"),
    acceptsHomework: value(lesson, "acceptsHomework", "accepts_homework"),
  };
}

function quizDto(quiz: UnknownRecord & { _count?: { questions?: number } }) {
  return {
    id: stringValue(quiz, "id"),
    title: stringValue(quiz, "title"),
    order: value(quiz, "order"),
    timeLimitMinutes: value(quiz, "timeLimitMinutes", "time_limit_minutes"),
    questionCount: Number(quiz._count?.questions ?? 0),
  };
}

async function getContentAccess(
  source: CourseContentSource,
  actor: ActiveActor | null,
): Promise<{ mode: ContentAccess; allowedLessonIds: Set<string>; allowedQuizIds: Set<string> }> {
  if (!actor) return { mode: "none", allowedLessonIds: new Set(), allowedQuizIds: new Set() };

  const courseId = stringValue(source.course, "id");
  if (!courseId) return { mode: "none", allowedLessonIds: new Set(), allowedQuizIds: new Set() };

  if (actor.role === "ADMIN" || actor.role === "ASSISTANT_ADMIN") {
    return { mode: "full", allowedLessonIds: new Set(), allowedQuizIds: new Set() };
  }

  const createdById = stringValue(source.course, "createdById", "created_by_id");
  if (canManageCourse(actor.role, actor.userId, createdById)) {
    return { mode: "full", allowedLessonIds: new Set(), allowedQuizIds: new Set() };
  }

  if (actor.role !== "STUDENT") {
    return { mode: "none", allowedLessonIds: new Set(), allowedQuizIds: new Set() };
  }

  const [enrollment, fullCourse] = await Promise.all([
    getEnrollment(actor.userId, courseId),
    hasFullCourseAccessAsStudent(actor.userId, courseId),
  ]);
  if (enrollment || fullCourse) {
    return { mode: "full", allowedLessonIds: new Set(), allowedQuizIds: new Set() };
  }

  const [lessonIds, quizIds] = await Promise.all([
    getAllowedLessonIdsForUserCourse(actor.userId, courseId),
    getAllowedQuizIdsForUserCourse(actor.userId, courseId),
  ]);
  if (lessonIds.length || quizIds.length) {
    return {
      mode: "partial",
      allowedLessonIds: new Set(lessonIds),
      allowedQuizIds: new Set(quizIds),
    };
  }

  return { mode: "none", allowedLessonIds: new Set(), allowedQuizIds: new Set() };
}

/**
 * Produces an API-safe course representation. Unauthenticated callers only
 * receive marketing metadata and counts; private URLs and lesson bodies are
 * emitted only after a server-side entitlement check.
 */
export async function toCourseApiDto(source: CourseContentSource, actor: ActiveActor | null) {
  const access = await getContentAccess(source, actor);
  const course = publicCourseDto(source.course, source.lessons.length, source.quizzes.length);
  const canSee = (id: string | null, allowedIds: Set<string>) =>
    access.mode === "full" || (access.mode === "partial" && !!id && allowedIds.has(id));

  return {
    ...course,
    contentAccess: access.mode,
    lessons:
      access.mode === "none"
        ? []
        : source.lessons
            .filter((lesson) => canSee(stringValue(lesson, "id"), access.allowedLessonIds))
            .map(lessonDto),
    quizzes:
      access.mode === "none"
        ? []
        : source.quizzes
            .filter((quiz) => canSee(stringValue(quiz, "id"), access.allowedQuizIds))
            .map(quizDto),
  };
}
