import { prisma } from "@/lib/prisma";
import type { TenantActor } from "@/modules/tenants/types";

/**
 * This repository is deliberately tenant-bound. Do not add a course lookup
 * here that accepts only a resource ID: IDs are opaque, not tenant authority.
 */
const publicCourseContentInclude = {
  category: {
    select: { id: true, name: true, nameAr: true, slug: true, tenantId: true },
  },
  lessons: { orderBy: { order: "asc" as const } },
  quizzes: {
    orderBy: { order: "asc" as const },
    include: { _count: { select: { questions: true } } },
  },
};

// Marketing data is intentionally narrower than learning content. Public
// course pages must never fetch video/PDF/body fields and then rely on React
// to hide them from an anonymous visitor.
const publicCourseMarketingInclude = {
  category: { select: { id: true, name: true, nameAr: true, slug: true, tenantId: true } },
};

const courseOutlineInclude = {
  lessons: {
    orderBy: { order: "asc" as const },
    select: { id: true, slug: true, title: true, titleAr: true, duration: true, order: true, acceptsHomework: true },
  },
  quizzes: {
    orderBy: { order: "asc" as const },
    select: { id: true, title: true, order: true, _count: { select: { questions: true } } },
  },
};

export type TenantCourseContentAccess =
  | { mode: "none"; allowedLessonIds: Set<string>; allowedQuizIds: Set<string> }
  | { mode: "full"; allowedLessonIds: Set<string>; allowedQuizIds: Set<string> }
  | { mode: "partial"; allowedLessonIds: Set<string>; allowedQuizIds: Set<string> };

export async function findPublishedCourseByIdForTenant(tenantId: string, courseId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, tenantId, isPublished: true },
    include: publicCourseContentInclude,
  });
}

export async function findPublishedCourseBySlugForTenant(tenantId: string, slug: string) {
  return prisma.course.findFirst({
    where: { slug, tenantId, isPublished: true },
    include: publicCourseContentInclude,
  });
}

/** Public-only course metadata. Never add lesson bodies or asset URLs here. */
export async function findPublishedCourseMarketingBySlugForTenant(tenantId: string, slug: string) {
  return prisma.course.findFirst({
    where: { slug, tenantId, isPublished: true },
    include: publicCourseMarketingInclude,
  });
}

/** Returns the course outline after a caller has already established access. */
export async function findCourseOutlineForTenant(tenantId: string, courseId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, tenantId, isPublished: true },
    include: courseOutlineInclude,
  });
}

export async function listPublishedCoursesForTenant(tenantId: string) {
  return prisma.course.findMany({
    where: { tenantId, isPublished: true },
    include: { category: { select: { id: true, name: true, nameAr: true, slug: true } }, _count: { select: { lessons: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
}

/** Dashboard listing; teacher ownership is enforced in the query itself. */
export async function listManagedCoursesForTenant(tenantId: string, actor: TenantActor) {
  return prisma.course.findMany({
    where: actor.role === "TEACHER"
      ? { tenantId, createdById: actor.userId }
      : { tenantId },
    include: {
      category: { select: { id: true, name: true, nameAr: true } },
      _count: { select: { lessons: true, enrollments: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
}

export async function listCategoriesForTenant(tenantId: string, actor: TenantActor) {
  return prisma.category.findMany({
    where: actor.role === "TEACHER"
      ? { tenantId, createdById: actor.userId }
      : { tenantId },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function deleteCategoryForTenant(tenantId: string, categoryId: string, actor: TenantActor): Promise<boolean> {
  const category = await prisma.category.findFirst({
    where: actor.role === "TEACHER"
      ? { id: categoryId, tenantId, createdById: actor.userId }
      : { id: categoryId, tenantId },
    select: { id: true },
  });
  if (!category) return false;
  await prisma.category.delete({ where: { id: category.id } });
  return true;
}

export async function createCategoryForTenant(args: {
  tenantId: string; actor: TenantActor; name: string; nameAr?: string | null; slug: string;
  description?: string | null; imageUrl?: string | null; order?: number;
}) {
  return prisma.category.create({
    data: {
      tenantId: args.tenantId, createdById: args.actor.userId, name: args.name, nameAr: args.nameAr ?? null,
      slug: args.slug, description: args.description ?? null, imageUrl: args.imageUrl ?? null, order: args.order ?? 0,
    },
  });
}

export async function updateCategoryForTenant(args: {
  tenantId: string; categoryId: string; actor: TenantActor; name?: string; nameAr?: string | null;
  description?: string | null; imageUrl?: string | null; order?: number;
}) {
  const category = await prisma.category.findFirst({
    where: args.actor.role === "TEACHER"
      ? { id: args.categoryId, tenantId: args.tenantId, createdById: args.actor.userId }
      : { id: args.categoryId, tenantId: args.tenantId },
    select: { id: true },
  });
  if (!category) return null;
  return prisma.category.update({
    where: { id: category.id },
    data: {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.nameAr !== undefined ? { nameAr: args.nameAr } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.imageUrl !== undefined ? { imageUrl: args.imageUrl } : {}),
      ...(args.order !== undefined ? { order: args.order } : {}),
    },
  });
}

export type CourseWriteInput = {
  title: string; titleAr: string; slug: string; description: string; descriptionEn: string;
  shortDesc?: string | null; shortDescEn?: string | null; imageUrl?: string | null; price?: number;
  categoryId?: string | null; isPublished?: boolean; maxQuizAttempts?: number | null; acceptsHomework?: boolean;
  lessons?: Array<{ title: string; titleAr?: string | null; content?: string | null; videoUrl?: string | null; pdfUrl?: string | null; acceptsHomework?: boolean }>;
  quizzes?: Array<{ title: string; timeLimitMinutes?: number | null }>;
};

export async function createCourseForTenant(tenantId: string, actor: TenantActor, input: CourseWriteInput) {
  return prisma.$transaction(async (tx) => {
    if (input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: input.categoryId, tenantId }, select: { id: true } });
      if (!category) throw new Error("CATEGORY_NOT_IN_TENANT");
    }
    return tx.course.create({
      data: {
        tenantId, createdById: actor.userId, title: input.title, titleAr: input.titleAr, slug: input.slug,
        description: input.description, descriptionEn: input.descriptionEn, shortDesc: input.shortDesc ?? null,
        shortDescEn: input.shortDescEn ?? null, imageUrl: input.imageUrl ?? null, price: input.price ?? 0,
        categoryId: input.categoryId ?? null, isPublished: input.isPublished ?? true,
        maxQuizAttempts: input.maxQuizAttempts ?? null, acceptsHomework: input.acceptsHomework ?? false,
        lessons: { create: (input.lessons ?? []).map((lesson, index) => ({
          title: lesson.title, titleAr: lesson.titleAr ?? null, slug: `${input.slug}-${index + 1}`,
          content: lesson.content ?? null, videoUrl: lesson.videoUrl ?? null, pdfUrl: lesson.pdfUrl ?? null,
          order: index, acceptsHomework: lesson.acceptsHomework ?? false,
        })) },
        quizzes: { create: (input.quizzes ?? []).map((quiz, index) => ({ title: quiz.title, order: (input.lessons?.length ?? 0) + index, timeLimitMinutes: quiz.timeLimitMinutes ?? null })) },
      },
    });
  });
}

function canManageCourseRecord(actor: TenantActor, course: { createdById: string | null }) {
  return actor.role === "OWNER" || actor.role === "ADMIN" || actor.role === "ASSISTANT" || (actor.role === "TEACHER" && course.createdById === actor.userId);
}

const managementCourseInclude = { category: true, lessons: { orderBy: { order: "asc" as const } }, quizzes: { orderBy: { order: "asc" as const }, include: { questions: { orderBy: { order: "asc" as const }, include: { options: true } } } } };

export async function findManagedCourseForTenant(tenantId: string, courseId: string, actor: TenantActor) {
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId }, include: managementCourseInclude });
  return course && canManageCourseRecord(actor, course) ? course : null;
}

type StableOption = { id?: string; text: string; isCorrect: boolean };
type StableQuestion = { id?: string; type: string; questionText: string; options: StableOption[] };
type StableQuiz = { id?: string; title: string; timeLimitMinutes?: number | null; questions: StableQuestion[] };
type StableLesson = { id?: string; title: string; titleAr?: string | null; content?: string | null; videoUrl?: string | null; pdfUrl?: string | null; acceptsHomework?: boolean; playbackRequiredMinutes?: number; playbackMaxAttempts?: number };

export async function updateManagedCourseForTenant(args: { tenantId: string; courseId: string; actor: TenantActor; input: Omit<Partial<CourseWriteInput>, "lessons" | "quizzes"> & { lessons: StableLesson[]; quizzes: StableQuiz[] } }) {
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.findFirst({ where: { id: args.courseId, tenantId: args.tenantId }, include: managementCourseInclude });
    if (!course || !canManageCourseRecord(args.actor, course)) return null;
    if (args.input.categoryId) {
      const category = await tx.category.findFirst({ where: { id: args.input.categoryId, tenantId: args.tenantId }, select: { id: true } });
      if (!category) throw new Error("CATEGORY_NOT_IN_TENANT");
    }
    await tx.course.update({ where: { id: course.id }, data: {
      ...(args.input.title !== undefined ? { title: args.input.title } : {}), ...(args.input.titleAr !== undefined ? { titleAr: args.input.titleAr } : {}),
      ...(args.input.description !== undefined ? { description: args.input.description } : {}), ...(args.input.descriptionEn !== undefined ? { descriptionEn: args.input.descriptionEn } : {}),
      ...(args.input.shortDesc !== undefined ? { shortDesc: args.input.shortDesc } : {}), ...(args.input.shortDescEn !== undefined ? { shortDescEn: args.input.shortDescEn } : {}),
      ...(args.input.imageUrl !== undefined ? { imageUrl: args.input.imageUrl } : {}), ...(args.input.price !== undefined ? { price: args.input.price } : {}),
      ...(args.input.categoryId !== undefined ? { categoryId: args.input.categoryId } : {}), ...(args.input.isPublished !== undefined ? { isPublished: args.input.isPublished } : {}),
      ...(args.input.maxQuizAttempts !== undefined ? { maxQuizAttempts: args.input.maxQuizAttempts } : {}), ...(args.input.acceptsHomework !== undefined ? { acceptsHomework: args.input.acceptsHomework } : {}),
    } });
    const oldLessonIds = new Set(course.lessons.map((x) => x.id));
    const submittedLessonIds = args.input.lessons.flatMap((x) => x.id && oldLessonIds.has(x.id) ? [x.id] : []);
    await tx.lesson.deleteMany({ where: { courseId: course.id, ...(submittedLessonIds.length ? { id: { notIn: submittedLessonIds } } : {}) } });
    for (let index = 0; index < args.input.lessons.length; index++) { const lesson = args.input.lessons[index]; const data = { title: lesson.title, titleAr: lesson.titleAr ?? null, content: lesson.content ?? null, videoUrl: lesson.videoUrl ?? null, pdfUrl: lesson.pdfUrl ?? null, order: index, acceptsHomework: lesson.acceptsHomework ?? false, playbackRequiredMinutes: lesson.playbackRequiredMinutes ?? 15, playbackMaxAttempts: lesson.playbackMaxAttempts ?? 3 }; if (lesson.id && oldLessonIds.has(lesson.id)) await tx.lesson.update({ where: { id: lesson.id }, data }); else await tx.lesson.create({ data: { ...data, courseId: course.id, slug: `${course.slug}-lesson-${Date.now()}-${index}` } }); }
    const oldQuizIds = new Set(course.quizzes.map((x) => x.id)); const submittedQuizIds = args.input.quizzes.flatMap((x) => x.id && oldQuizIds.has(x.id) ? [x.id] : []);
    await tx.quiz.deleteMany({ where: { courseId: course.id, ...(submittedQuizIds.length ? { id: { notIn: submittedQuizIds } } : {}) } });
    for (let qi = 0; qi < args.input.quizzes.length; qi++) { const quizInput = args.input.quizzes[qi]; const quiz = quizInput.id && oldQuizIds.has(quizInput.id) ? await tx.quiz.update({ where: { id: quizInput.id }, data: { title: quizInput.title, order: args.input.lessons.length + qi, timeLimitMinutes: quizInput.timeLimitMinutes ?? null }, include: { questions: { include: { options: true } } } }) : await tx.quiz.create({ data: { courseId: course.id, title: quizInput.title, order: args.input.lessons.length + qi, timeLimitMinutes: quizInput.timeLimitMinutes ?? null }, include: { questions: { include: { options: true } } } }); const oldQuestionIds = new Set(quiz.questions.map((x) => x.id)); const submittedQuestionIds = quizInput.questions.flatMap((x) => x.id && oldQuestionIds.has(x.id) ? [x.id] : []); await tx.question.deleteMany({ where: { quizId: quiz.id, ...(submittedQuestionIds.length ? { id: { notIn: submittedQuestionIds } } : {}) } }); for (let qti=0;qti<quizInput.questions.length;qti++){ const questionInput=quizInput.questions[qti]; const question=questionInput.id && oldQuestionIds.has(questionInput.id) ? await tx.question.update({where:{id:questionInput.id},data:{type:questionInput.type,questionText:questionInput.questionText,order:qti},include:{options:true}}) : await tx.question.create({data:{quizId:quiz.id,type:questionInput.type,questionText:questionInput.questionText,order:qti},include:{options:true}}); const oldOptionIds=new Set(question.options.map((x)=>x.id)); const submittedOptionIds=questionInput.options.flatMap((x)=>x.id&&oldOptionIds.has(x.id)?[x.id]:[]); await tx.questionOption.deleteMany({where:{questionId:question.id,...(submittedOptionIds.length?{id:{notIn:submittedOptionIds}}:{})}}); for(const option of questionInput.options){ if(option.id&&oldOptionIds.has(option.id)) await tx.questionOption.update({where:{id:option.id},data:{text:option.text,isCorrect:option.isCorrect}}); else await tx.questionOption.create({data:{questionId:question.id,text:option.text,isCorrect:option.isCorrect}}); } } }
    return tx.course.findFirst({ where: { id: course.id, tenantId: args.tenantId }, include: managementCourseInclude });
  });
}

export async function deleteManagedCourseForTenant(tenantId: string, courseId: string, actor: TenantActor) {
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId }, select: { id: true, createdById: true } });
  if (!course || !canManageCourseRecord(actor, course)) return false;
  await prisma.course.delete({ where: { id: course.id } }); return true;
}

export async function findAccessibleLessonForTenant(tenantId: string, lessonId: string, actor: TenantActor) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, course: { tenantId, isPublished: true } },
    include: { course: { select: { id: true, tenantId: true, createdById: true, price: true } } },
  });
  if (!lesson) return null;
  const access = await getTenantCourseContentAccess(tenantId, lesson.course, actor);
  const allowed = access.mode === "full" || (access.mode === "partial" && access.allowedLessonIds.has(lesson.id));
  return allowed ? lesson : null;
}

/** Protected lesson lookup through Course -> Tenant. This is the only slug
 * lookup used by public lesson pages; a lesson slug is never globally valid. */
export async function findAccessibleLessonBySlugForTenant(args: {
  tenantId: string;
  courseId: string;
  lessonSlug: string;
  actor: TenantActor;
}) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      slug: args.lessonSlug,
      courseId: args.courseId,
      course: { tenantId: args.tenantId, isPublished: true },
    },
    include: {
      course: { select: { id: true, tenantId: true, createdById: true, price: true, slug: true, title: true, titleAr: true } },
    },
  });
  if (!lesson) return null;
  const access = await getTenantCourseContentAccess(args.tenantId, lesson.course, args.actor);
  const allowed = access.mode === "full" || (access.mode === "partial" && access.allowedLessonIds.has(lesson.id));
  return allowed ? { lesson, access } : null;
}

type TenantCourseForAccess = {
  id: string;
  tenantId: string | null;
  createdById: string | null;
  price: { toString(): string } | number | string;
};

function noAccess(): TenantCourseContentAccess {
  return { mode: "none", allowedLessonIds: new Set(), allowedQuizIds: new Set() };
}

function fullAccess(): TenantCourseContentAccess {
  return { mode: "full", allowedLessonIds: new Set(), allowedQuizIds: new Set() };
}

function isPaidCourse(price: TenantCourseForAccess["price"]): boolean {
  return Number(price) > 0;
}

/**
 * Computes access only after the caller has resolved the request hostname and
 * active membership. Every entitlement query repeats the tenant predicate.
 */
export async function getTenantCourseContentAccess(
  tenantId: string,
  course: TenantCourseForAccess,
  actor: TenantActor | null,
): Promise<TenantCourseContentAccess> {
  if (!actor || actor.tenantId !== tenantId || course.tenantId !== tenantId) return noAccess();

  if (actor.role === "OWNER" || actor.role === "ADMIN" || actor.role === "ASSISTANT") {
    return fullAccess();
  }

  if (actor.role === "TEACHER") {
    return course.createdById === actor.userId ? fullAccess() : noAccess();
  }

  if (actor.role !== "STUDENT") return noAccess();

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId, userId: actor.userId, courseId: course.id },
    select: { id: true },
  });
  if (enrollment) return fullAccess();

  // The existing paid-course subscription is tenant scoped by the schema
  // bridge. Free courses do not receive subscription-only access, preserving
  // the legacy business rule.
  if (isPaidCourse(course.price)) {
    const subscription = await prisma.userPlatformSubscription.findFirst({
      where: { tenantId, userId: actor.userId, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (subscription) return fullAccess();
  }

  const codes = await prisma.activationCode.findMany({
    where: { tenantId, courseId: course.id, usedByUserId: actor.userId, usedAt: { not: null } },
    select: {
      lessons: { select: { lessonId: true } },
      quizzes: { select: { quizId: true } },
    },
  });

  if (codes.some((code) => code.lessons.length === 0 && code.quizzes.length === 0)) {
    return fullAccess();
  }

  const allowedLessonIds = new Set(codes.flatMap((code) => code.lessons.map((lesson) => lesson.lessonId)));
  const allowedQuizIds = new Set(codes.flatMap((code) => code.quizzes.map((quiz) => quiz.quizId)));
  return allowedLessonIds.size || allowedQuizIds.size
    ? { mode: "partial", allowedLessonIds, allowedQuizIds }
    : noAccess();
}
