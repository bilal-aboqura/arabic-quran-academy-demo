import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getTenantCourseContentAccess } from "@/modules/courses/repository";
import type { TenantActor } from "@/modules/tenants/types";

type AnswerInput = Record<string, unknown>;

const objectiveTypes = new Set(["MULTIPLE_CHOICE", "TRUE_FALSE"]);

export function gradeObjectiveAnswers(
  questions: Array<{ id: string; type: string; options: Array<{ id: string; isCorrect: boolean }> }>,
  answers: AnswerInput,
) {
  const objectiveQuestions = questions.filter((question) => objectiveTypes.has(question.type));
  const score = objectiveQuestions.reduce((total, question) => {
    const selectedOptionId = typeof answers[question.id] === "string" ? answers[question.id] : null;
    return total + (selectedOptionId && question.options.some((option) => option.id === selectedOptionId && option.isCorrect) ? 1 : 0);
  }, 0);
  return { score, totalQuestions: objectiveQuestions.length };
}

/**
 * This module is intentionally the only quiz data entry point for tenant
 * requests. A quiz has no direct tenant column, so every lookup repeats the
 * Quiz -> Course -> Tenant boundary instead of accepting an unscoped quiz ID.
 */
export async function getAccessibleQuizForTenant(args: {
  tenantId: string;
  quizId: string;
  actor: TenantActor;
}) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: args.quizId, course: { tenantId: args.tenantId } },
    include: {
      course: { select: { id: true, tenantId: true, createdById: true, title: true, titleAr: true, slug: true, price: true, maxQuizAttempts: true, isPublished: true } },
      questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!quiz || !quiz.course.tenantId) return null;
  if (!quiz.course.isPublished && args.actor.role === "STUDENT") return null;
  // Product availability is enforced at the same boundary as entitlement;
  // hiding a card in the browser is not sufficient to close a quiz.
  if (args.actor.role === "STUDENT" && (!quiz.isPublished || (quiz.availableFrom && quiz.availableFrom > new Date()) || (quiz.availableUntil && quiz.availableUntil <= new Date()))) return null;

  const access = await getTenantCourseContentAccess(args.tenantId, quiz.course, args.actor);
  if (access.mode === "none" || (access.mode === "partial" && !access.allowedQuizIds.has(quiz.id))) return null;
  return quiz;
}

export function studentQuizDto(quiz: NonNullable<Awaited<ReturnType<typeof getAccessibleQuizForTenant>>>, attemptsUsed: number) {
  const maxAttempts = quiz.maxAttempts ?? quiz.course.maxQuizAttempts;
  return {
    id: quiz.id,
    title: quiz.title,
    courseId: quiz.courseId,
    order: quiz.order,
    timeLimitMinutes: quiz.timeLimitMinutes,
    passingScore: quiz.passingScore,
    course: { id: quiz.course.id, slug: quiz.course.slug, title: quiz.course.title, titleAr: quiz.course.titleAr },
    // Correctness is deliberately not serialized. Client code must never have
    // enough information to calculate its own score before submission.
    questions: quiz.questions.map((question) => ({
      id: question.id,
      type: question.type,
      questionText: question.questionText,
      order: question.order,
      options: question.options.map((option) => ({ id: option.id, text: option.text })),
    })),
    attemptsUsed,
    maxQuizAttempts: maxAttempts,
    canAttempt: maxAttempts == null || attemptsUsed < maxAttempts,
  };
}

export async function countQuizAttemptsForTenant(args: { tenantId: string; userId: string; courseId?: string; quizId?: string }) {
  if (!args.courseId && !args.quizId) throw new Error("courseId or quizId is required");
  return prisma.quizAttempt.count({
    where: {
      tenantId: args.tenantId,
      userId: args.userId,
      ...(args.quizId ? { quizId: args.quizId } : { quiz: { courseId: args.courseId!, course: { tenantId: args.tenantId } } }),
      quiz: args.quizId ? { course: { tenantId: args.tenantId } } : { courseId: args.courseId!, course: { tenantId: args.tenantId } },
    },
  });
}

export async function startQuizAttemptForTenant(args: { tenantId: string; quizId: string; actor: TenantActor }) {
  if (args.actor.role !== "STUDENT") return { error: "FORBIDDEN" as const };
  const quiz = await getAccessibleQuizForTenant(args);
  if (!quiz) return { error: "NOT_FOUND" as const };

  const attemptsUsed = await countQuizAttemptsForTenant({ tenantId: args.tenantId, userId: args.actor.userId, quizId: quiz.id });
  const maxAttempts = quiz.maxAttempts ?? quiz.course.maxQuizAttempts;
  if (maxAttempts != null && attemptsUsed >= maxAttempts) return { error: "LIMIT" as const };

  const attempt = await prisma.quizAttempt.create({
    data: {
      tenantId: args.tenantId,
      studentMembershipId: args.actor.membershipId,
      userId: args.actor.userId,
      quizId: quiz.id,
      // An unsubmitted attempt has submittedAt = null; score is never a
      // browser-controlled value.
      score: 0,
      totalQuestions: 0,
    },
    select: { id: true, startedAt: true },
  });
  return { attempt, quiz };
}

/**
 * Grades only canonical options held by the server. The legacy table lacks an
 * Answers are retained as a sanitized JSON snapshot for later staff review;
 * answer keys are never included. QuizAttempt's membership and submittedAt
 * fields make cross-user/cross-tenant and repeated submission impossible.
 */
export async function submitQuizAttemptForTenant(args: {
  tenantId: string;
  quizId: string;
  attemptId: string;
  actor: TenantActor;
  answers: AnswerInput;
}) {
  if (args.actor.role !== "STUDENT") return { error: "FORBIDDEN" as const };
  const quiz = await getAccessibleQuizForTenant(args);
  if (!quiz) return { error: "NOT_FOUND" as const };

  const attempt = await prisma.quizAttempt.findFirst({
    where: {
      id: args.attemptId,
      tenantId: args.tenantId,
      studentMembershipId: args.actor.membershipId,
      userId: args.actor.userId,
      quizId: quiz.id,
      submittedAt: null,
      quiz: { course: { tenantId: args.tenantId } },
    },
    select: { id: true, startedAt: true },
  });
  if (!attempt) return { error: "ATTEMPT_NOT_FOUND" as const };

  // A client timer is only UX; this server check is authoritative where a
  // configured limit exists. Submission still grades the answers received.
  const sanitizedAnswers: Prisma.JsonObject = {};
  for (const question of quiz.questions) {
    const answer = args.answers[question.id];
    if (objectiveTypes.has(question.type)) {
      if (typeof answer === "string" && question.options.some((option) => option.id === answer)) sanitizedAnswers[question.id] = answer;
    } else if (typeof answer === "string") {
      // Keep essay data bounded while retaining it for a later review flow.
      sanitizedAnswers[question.id] = answer.slice(0, 10_000);
    }
  }
  const submittedAt = new Date();
  const timeExpired = quiz.timeLimitMinutes != null && submittedAt.getTime() > attempt.startedAt.getTime() + quiz.timeLimitMinutes * 60_000;
  // A client timer is merely a convenience. Once the server deadline passes,
  // answers supplied afterwards are not eligible for objective credit.
  const normallyGraded = gradeObjectiveAnswers(quiz.questions, sanitizedAnswers);
  const graded = timeExpired ? { score: 0, totalQuestions: normallyGraded.totalQuestions } : normallyGraded;

  const finalized = await prisma.quizAttempt.updateMany({
    where: { id: attempt.id, tenantId: args.tenantId, studentMembershipId: args.actor.membershipId, userId: args.actor.userId, quizId: quiz.id, submittedAt: null },
    data: { score: graded.score, totalQuestions: graded.totalQuestions, answers: sanitizedAnswers, submittedAt },
  });
  if (finalized.count !== 1) return { error: "ATTEMPT_NOT_FOUND" as const };
  const percentage = graded.totalQuestions > 0 ? Math.round((graded.score / graded.totalQuestions) * 10000) / 100 : null;
  const passed = quiz.passingScore == null ? null : percentage !== null && percentage >= quiz.passingScore;
  return { result: { attemptId: attempt.id, score: graded.score, totalQuestions: graded.totalQuestions, submittedAt: submittedAt.toISOString(), timeExpired, percentage, passed } };
}

export async function getQuizAttemptResultForTenant(args: { tenantId: string; quizId: string; attemptId: string; actor: TenantActor }) {
  const quiz = await getAccessibleQuizForTenant({ tenantId: args.tenantId, quizId: args.quizId, actor: args.actor });
  if (!quiz) return null;
  const attempt = await prisma.quizAttempt.findFirst({
    where: {
      id: args.attemptId,
      tenantId: args.tenantId,
      quizId: quiz.id,
      submittedAt: { not: null },
      quiz: { course: { tenantId: args.tenantId } },
      ...(args.actor.role === "STUDENT" ? { userId: args.actor.userId, studentMembershipId: args.actor.membershipId } : {}),
    },
    select: { id: true, score: true, totalQuestions: true, startedAt: true, submittedAt: true, answers: true },
  });
  if (!attempt) return null;
  return { attemptId: attempt.id, score: attempt.score, totalQuestions: attempt.totalQuestions, startedAt: attempt.startedAt, submittedAt: attempt.submittedAt, answers: attempt.answers };
}
