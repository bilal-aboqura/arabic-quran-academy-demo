import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/modules/tenants/authorization";
import type { TenantActor } from "@/modules/tenants/types";
import { getTenantCourseContentAccess } from "@/modules/courses/repository";

export type QuizProductSettingsInput = {
  maxAttempts?: number | null;
  passingScore?: number | null;
  isPublished?: boolean;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
};

type QuizSettingsRecord = {
  id: string;
  maxAttempts: number | null;
  passingScore: number | null;
  isPublished: boolean;
  availableFrom: Date | null;
  availableUntil: Date | null;
  course: { id: string; tenantId: string; createdById: string | null; maxQuizAttempts: number | null; price: unknown };
};

function teacherOwnsCourse(actor: TenantActor, course: { createdById: string | null }) {
  return actor.role !== "TEACHER" || course.createdById === actor.userId;
}

function assertSettings(input: QuizProductSettingsInput, current: Pick<QuizSettingsRecord, "maxAttempts" | "passingScore" | "availableFrom" | "availableUntil">) {
  const maxAttempts = input.maxAttempts === undefined ? current.maxAttempts : input.maxAttempts;
  const passingScore = input.passingScore === undefined ? current.passingScore : input.passingScore;
  const availableFrom = input.availableFrom === undefined ? current.availableFrom : input.availableFrom;
  const availableUntil = input.availableUntil === undefined ? current.availableUntil : input.availableUntil;
  if (maxAttempts != null && (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100)) {
    throw new Error("INVALID_MAX_ATTEMPTS");
  }
  if (passingScore != null && (!Number.isInteger(passingScore) || passingScore < 0 || passingScore > 100)) {
    throw new Error("INVALID_PASSING_SCORE");
  }
  if (availableFrom && availableUntil && availableFrom >= availableUntil) throw new Error("INVALID_AVAILABILITY_WINDOW");
}

/** A percentage is server-derived; no browser score is ever accepted here. */
export function quizAttemptSummary(attempt: { score: number; totalQuestions: number }, passingScore: number | null) {
  const percentage = attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 10000) / 100 : null;
  return {
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percentage,
    passed: passingScore == null ? null : percentage != null && percentage >= passingScore,
  };
}

export function isQuizAvailableAt(settings: Pick<QuizSettingsRecord, "isPublished" | "availableFrom" | "availableUntil">, now = new Date()) {
  return settings.isPublished
    && (!settings.availableFrom || settings.availableFrom <= now)
    && (!settings.availableUntil || settings.availableUntil > now);
}

export function effectiveQuizAttemptLimit(settings: Pick<QuizSettingsRecord, "maxAttempts" | "course">) {
  return settings.maxAttempts ?? settings.course.maxQuizAttempts;
}

async function findQuizSettingsForTenant(tenantId: string, quizId: string) {
  return prisma.quiz.findFirst({
    where: { id: quizId, course: { tenantId } },
    select: {
      id: true, maxAttempts: true, passingScore: true, isPublished: true, availableFrom: true, availableUntil: true,
      course: { select: { id: true, tenantId: true, createdById: true, maxQuizAttempts: true, price: true } },
    },
  });
}

/** Tenant-bound setting lookup for authoring and student availability UI. */
export async function getQuizProductSettingsForTenant(args: { tenantId: string; quizId: string }) {
  const quiz = await findQuizSettingsForTenant(args.tenantId, args.quizId);
  if (!quiz) return null;
  return {
    quizId: quiz.id,
    maxAttempts: quiz.maxAttempts,
    effectiveMaxAttempts: effectiveQuizAttemptLimit(quiz),
    passingScore: quiz.passingScore,
    isPublished: quiz.isPublished,
    availableFrom: quiz.availableFrom,
    availableUntil: quiz.availableUntil,
    isAvailable: isQuizAvailableAt(quiz),
  };
}

/**
 * Settings writes use membership authority and repeat the Quiz -> Course ->
 * Tenant predicate. Teachers may only mutate quizzes in courses they own.
 */
export async function updateQuizProductSettingsForTenant(args: {
  tenantId: string;
  quizId: string;
  actor: TenantActor;
  input: QuizProductSettingsInput;
}) {
  if (!canManageCourse(args.actor)) return null;
  const quiz = await findQuizSettingsForTenant(args.tenantId, args.quizId);
  if (!quiz || !teacherOwnsCourse(args.actor, quiz.course)) return null;
  assertSettings(args.input, quiz);
  return prisma.quiz.update({
    where: { id: quiz.id },
    data: {
      ...(args.input.maxAttempts !== undefined ? { maxAttempts: args.input.maxAttempts } : {}),
      ...(args.input.passingScore !== undefined ? { passingScore: args.input.passingScore } : {}),
      ...(args.input.isPublished !== undefined ? { isPublished: args.input.isPublished } : {}),
      ...(args.input.availableFrom !== undefined ? { availableFrom: args.input.availableFrom } : {}),
      ...(args.input.availableUntil !== undefined ? { availableUntil: args.input.availableUntil } : {}),
    },
    select: { id: true, maxAttempts: true, passingScore: true, isPublished: true, availableFrom: true, availableUntil: true },
  });
}

/**
 * Student attempt history deliberately does not select answer snapshots. It
 * requires current tenant-course entitlement before returning any result.
 */
export async function getStudentQuizAttemptHistoryForTenant(args: { tenantId: string; quizId: string; actor: TenantActor }) {
  if (args.actor.role !== "STUDENT") return null;
  const quiz = await findQuizSettingsForTenant(args.tenantId, args.quizId);
  if (!quiz) return null;
  const access = await getTenantCourseContentAccess(args.tenantId, quiz.course, args.actor);
  if (access.mode === "none" || (access.mode === "partial" && !access.allowedQuizIds.has(quiz.id))) return null;
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      tenantId: args.tenantId,
      studentMembershipId: args.actor.membershipId,
      userId: args.actor.userId,
      quizId: quiz.id,
      submittedAt: { not: null },
      quiz: { course: { tenantId: args.tenantId } },
    },
    select: { id: true, score: true, totalQuestions: true, startedAt: true, submittedAt: true },
    orderBy: { submittedAt: "desc" },
  });
  return attempts.map((attempt) => ({
    attemptId: attempt.id,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    ...quizAttemptSummary(attempt, quiz.passingScore),
  }));
}

/** Staff history includes sanitized answer snapshots for grading/review only. */
export async function getTeacherQuizAttemptHistoryForTenant(args: { tenantId: string; quizId: string; actor: TenantActor }) {
  if (!canManageCourse(args.actor)) return null;
  const quiz = await findQuizSettingsForTenant(args.tenantId, args.quizId);
  if (!quiz || !teacherOwnsCourse(args.actor, quiz.course)) return null;
  const attempts = await prisma.quizAttempt.findMany({
    where: { tenantId: args.tenantId, quizId: quiz.id, submittedAt: { not: null }, quiz: { course: { tenantId: args.tenantId } } },
    select: {
      id: true, score: true, totalQuestions: true, startedAt: true, submittedAt: true, answers: true,
      studentMembership: { select: { id: true, displayName: true, user: { select: { id: true, name: true } } } },
    },
    orderBy: { submittedAt: "desc" },
  });
  return attempts.map((attempt) => ({
    attemptId: attempt.id,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    answers: attempt.answers,
    student: {
      membershipId: attempt.studentMembership.id,
      displayName: attempt.studentMembership.displayName ?? attempt.studentMembership.user.name,
      userId: attempt.studentMembership.user.id,
    },
    ...quizAttemptSummary(attempt, quiz.passingScore),
  }));
}
