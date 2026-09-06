import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getTenantCourseContentAccess } from "@/modules/courses/repository";
import type { TenantActor } from "@/modules/tenants/types";

const MAX_POSITION_SECONDS = 7 * 24 * 60 * 60;

export type LearningProgressSnapshot = {
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  completed: boolean;
  lastViewedAt: Date;
  completedAt: Date | null;
};

export type ContinueLearningItem = LearningProgressSnapshot & {
  course: { id: string; slug: string; title: string; titleAr: string | null; imageUrl: string | null };
  nextLesson: { id: string; slug: string; title: string; titleAr: string | null } | null;
};

function positionSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_POSITION_SECONDS, Math.floor(value)));
}

async function requireActiveStudentMembership(args: { tenantId: string; actor: TenantActor }) {
  if (args.actor.role !== "STUDENT") return null;
  return prisma.tenantMembership.findFirst({
    where: {
      id: args.actor.membershipId,
      tenantId: args.tenantId,
      userId: args.actor.userId,
      role: "STUDENT",
      status: "ACTIVE",
    },
    select: { id: true },
  });
}

async function resolveAccessibleLesson(args: { tenantId: string; courseId: string; lessonId: string; actor: TenantActor }) {
  const membership = await requireActiveStudentMembership(args);
  if (!membership) return { error: "FORBIDDEN" as const };

  const lesson = await prisma.lesson.findFirst({
    where: { id: args.lessonId, courseId: args.courseId, course: { tenantId: args.tenantId, isPublished: true } },
    select: {
      id: true,
      courseId: true,
      course: { select: { id: true, tenantId: true, createdById: true, price: true } },
    },
  });
  if (!lesson) return { error: "NOT_FOUND" as const };

  const access = await getTenantCourseContentAccess(args.tenantId, lesson.course, args.actor);
  if (access.mode === "none" || (access.mode === "partial" && !access.allowedLessonIds.has(lesson.id))) {
    return { error: "FORBIDDEN" as const };
  }
  return { membershipId: membership.id, lesson };
}

function snapshotFrom(row: {
  courseId: string; completedLessons: number; totalLessons: number; progressPercent: number;
  completed: boolean; lastViewedAt: Date; completedAt: Date | null;
}): LearningProgressSnapshot {
  return {
    courseId: row.courseId,
    completedLessons: row.completedLessons,
    totalLessons: row.totalLessons,
    progressPercent: row.progressPercent,
    completed: row.completed,
    lastViewedAt: row.lastViewedAt,
    completedAt: row.completedAt,
  };
}

async function recomputeCourseProgress(tx: Prisma.TransactionClient, args: {
  tenantId: string;
  membershipId: string;
  courseId: string;
  viewedAt: Date;
}) {
  const [totalLessons, completedLessons] = await Promise.all([
    tx.lesson.count({ where: { courseId: args.courseId, course: { tenantId: args.tenantId } } }),
    tx.lessonProgress.count({
      where: { tenantId: args.tenantId, studentMembershipId: args.membershipId, courseId: args.courseId, completed: true },
    }),
  ]);
  const completed = totalLessons > 0 && completedLessons >= totalLessons;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const compound = {
    tenantId_studentMembershipId_courseId: {
      tenantId: args.tenantId,
      studentMembershipId: args.membershipId,
      courseId: args.courseId,
    },
  };
  return tx.courseProgress.upsert({
    where: compound,
    create: {
      tenantId: args.tenantId,
      studentMembershipId: args.membershipId,
      courseId: args.courseId,
      completedLessons,
      totalLessons,
      progressPercent,
      completed,
      lastViewedAt: args.viewedAt,
      completedAt: completed ? args.viewedAt : null,
    },
    update: {
      completedLessons,
      totalLessons,
      progressPercent,
      completed,
      lastViewedAt: args.viewedAt,
      // A course may become incomplete when staff add a lesson; clear its
      // former completion timestamp rather than falsely retaining it.
      completedAt: completed ? args.viewedAt : null,
    },
  });
}

/**
 * Persists a server-side resume point. Completion is an explicit authenticated
 * action, and is irreversible until content changes force a course roll-up
 * recalculation. No localStorage state is read by this service.
 */
export async function recordLessonProgressForTenant(args: {
  tenantId: string;
  courseId: string;
  lessonId: string;
  actor: TenantActor;
  positionSeconds: number;
  markCompleted?: boolean;
}) {
  const subject = await resolveAccessibleLesson(args);
  if ("error" in subject) return subject;
  const viewedAt = new Date();
  const completedAt = args.markCompleted ? viewedAt : undefined;

  const courseProgress = await prisma.$transaction(async (tx) => {
    await tx.lessonProgress.upsert({
      where: {
        tenantId_studentMembershipId_lessonId: {
          tenantId: args.tenantId,
          studentMembershipId: subject.membershipId,
          lessonId: subject.lesson.id,
        },
      },
      create: {
        tenantId: args.tenantId,
        studentMembershipId: subject.membershipId,
        courseId: subject.lesson.courseId,
        lessonId: subject.lesson.id,
        positionSeconds: positionSeconds(args.positionSeconds),
        completed: args.markCompleted ?? false,
        lastViewedAt: viewedAt,
        completedAt: args.markCompleted ? viewedAt : null,
      },
      update: {
        positionSeconds: positionSeconds(args.positionSeconds),
        lastViewedAt: viewedAt,
        ...(args.markCompleted ? { completed: true, completedAt } : {}),
      },
    });
    return recomputeCourseProgress(tx, {
      tenantId: args.tenantId,
      membershipId: subject.membershipId,
      courseId: subject.lesson.courseId,
      viewedAt,
    });
  });

  return { lessonId: subject.lesson.id, courseProgress: snapshotFrom(courseProgress) };
}

/** Returns the persisted course roll-up only to the active student membership. */
export async function getCourseProgressForTenant(args: { tenantId: string; courseId: string; actor: TenantActor }) {
  const membership = await requireActiveStudentMembership(args);
  if (!membership) return null;
  const course = await prisma.course.findFirst({
    where: { id: args.courseId, tenantId: args.tenantId },
    select: { id: true, tenantId: true, createdById: true, price: true },
  });
  if (!course) return null;
  const access = await getTenantCourseContentAccess(args.tenantId, course, args.actor);
  if (access.mode === "none") return null;
  const progress = await prisma.courseProgress.findFirst({
    where: { tenantId: args.tenantId, studentMembershipId: membership.id, courseId: course.id },
  });
  return progress ? snapshotFrom(progress) : null;
}

/**
 * Continue-learning is server derived. The first incomplete ordered lesson is
 * returned alongside the roll-up, so callers never calculate it from a stale
 * browser cache.
 */
export async function listContinueLearningForTenant(args: { tenantId: string; actor: TenantActor; take?: number }): Promise<ContinueLearningItem[]> {
  const membership = await requireActiveStudentMembership(args);
  if (!membership) return [];
  const progressRows = await prisma.courseProgress.findMany({
    where: {
      tenantId: args.tenantId,
      studentMembershipId: membership.id,
      completed: false,
      course: { tenantId: args.tenantId },
    },
    include: {
      course: {
        select: {
          id: true, slug: true, title: true, titleAr: true, imageUrl: true,
          lessons: { select: { id: true, slug: true, title: true, titleAr: true, order: true, createdAt: true }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
        },
      },
    },
    orderBy: { lastViewedAt: "desc" },
    take: Math.max(1, Math.min(args.take ?? 12, 50)),
  });
  const courseIds = progressRows.map((row) => row.courseId);
  const completedRows = courseIds.length
    ? await prisma.lessonProgress.findMany({
        where: { tenantId: args.tenantId, studentMembershipId: membership.id, courseId: { in: courseIds }, completed: true },
        select: { courseId: true, lessonId: true },
      })
    : [];
  const completedByCourse = new Map<string, Set<string>>();
  for (const row of completedRows) {
    const set = completedByCourse.get(row.courseId) ?? new Set<string>();
    set.add(row.lessonId);
    completedByCourse.set(row.courseId, set);
  }
  return progressRows.map((row) => ({
    ...snapshotFrom(row),
    course: row.course,
    nextLesson: row.course.lessons.find((lesson) => !completedByCourse.get(row.courseId)?.has(lesson.id)) ?? null,
  }));
}
