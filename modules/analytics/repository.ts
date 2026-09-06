import { prisma } from "@/lib/prisma";
import { canViewTenantAnalytics } from "@/modules/tenants/authorization";
import type { TenantActor } from "@/modules/tenants/types";

/**
 * Tenant-bound dashboard reporting.  Do not add aggregate helpers here that
 * accept only a user or course id: a tenant is a mandatory part of every
 * predicate so a dashboard can never accidentally aggregate the platform.
 */
export type TenantAnalyticsAttempt = {
  userId: string;
  quizId: string;
  userName: string | null;
  userEmail: string | null;
  courseTitle: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  createdAt: Date;
};

export type TenantAnalyticsStudent = {
  student: { id: string; name: string; email: string };
  enrollments: Array<{ course: { title: string; titleAr: string | null } }>;
  userAttempts: TenantAnalyticsAttempt[];
};

export type TenantAnalytics = {
  studentsCount: number;
  coursesCount: number;
  totalEnrollments: number;
  attemptsCount: number;
  homeworkSubmissionsCount: number;
  courseRevenue: number;
  storeRevenue: number;
  subscriptionRevenue: number;
  attempts: TenantAnalyticsAttempt[];
  studentsWithDetails: TenantAnalyticsStudent[];
};

function ownedCourseWhere(tenantId: string, actor: TenantActor) {
  return actor.role === "TEACHER"
    ? { tenantId, createdById: actor.userId }
    : { tenantId };
}

/** Returns only metrics visible to this actor inside its current tenant. */
export async function getTenantAnalytics(tenantId: string, actor: TenantActor): Promise<TenantAnalytics> {
  if (actor.tenantId !== tenantId || !canViewTenantAnalytics(actor)) {
    throw new Error("TENANT_ANALYTICS_FORBIDDEN");
  }

  const courseWhere = ownedCourseWhere(tenantId, actor);
  const enrollmentWhere = { tenantId, course: courseWhere };
  const attemptWhere = { tenantId, quiz: { course: courseWhere } };
  const paymentWhere = { tenantId, course: courseWhere };
  const homeworkWhere = { tenantId, course: courseWhere };

  const [coursesCount, enrollments, attempts, payments, homeworkSubmissionsCount, storePurchases, subscriptions, memberships] = await Promise.all([
    prisma.course.count({ where: courseWhere }),
    prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: { userId: true, course: { select: { title: true, titleAr: true } } },
    }),
    prisma.quizAttempt.findMany({
      where: attemptWhere,
      orderBy: { createdAt: "desc" },
      select: {
        userId: true, quizId: true, score: true, totalQuestions: true, createdAt: true,
        user: { select: { name: true, email: true } },
        quiz: { select: { title: true, course: { select: { title: true } } } },
      },
    }),
    prisma.payment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
    prisma.homeworkSubmission.count({ where: homeworkWhere }),
    prisma.userStorePurchase.aggregate({ where: { tenantId }, _sum: { pricePaid: true } }),
    prisma.userPlatformSubscription.aggregate({ where: { tenantId }, _sum: { pricePaid: true } }),
    actor.role === "TEACHER"
      ? Promise.resolve([])
      : prisma.tenantMembership.findMany({
          where: { tenantId, role: "STUDENT", status: "ACTIVE" },
          select: { userId: true, user: { select: { name: true, email: true } } },
        }),
  ]);

  const attemptsDto: TenantAnalyticsAttempt[] = attempts.map((attempt) => ({
    userId: attempt.userId,
    quizId: attempt.quizId,
    userName: attempt.user.name,
    userEmail: attempt.user.email,
    courseTitle: attempt.quiz.course.title,
    quizTitle: attempt.quiz.title,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    createdAt: attempt.createdAt,
  }));

  // Teachers see only students with an enrollment in one of their courses;
  // staff see all student memberships in this tenant, never global User rows.
  const studentsById = new Map<string, { id: string; name: string; email: string }>();
  if (actor.role === "TEACHER") {
    const enrolledUsers = await prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: { user: { select: { id: true, name: true, email: true } } },
    });
    for (const enrollment of enrolledUsers) studentsById.set(enrollment.user.id, enrollment.user);
  } else {
    for (const membership of memberships) {
      studentsById.set(membership.userId, { id: membership.userId, ...membership.user });
    }
  }

  const enrollmentsByUser = new Map<string, Array<{ course: { title: string; titleAr: string | null } }>>();
  for (const enrollment of enrollments) {
    const bucket = enrollmentsByUser.get(enrollment.userId) ?? [];
    bucket.push({ course: enrollment.course });
    enrollmentsByUser.set(enrollment.userId, bucket);
  }
  const attemptsByUser = new Map<string, TenantAnalyticsAttempt[]>();
  for (const attempt of attemptsDto) {
    const bucket = attemptsByUser.get(attempt.userId) ?? [];
    bucket.push(attempt);
    attemptsByUser.set(attempt.userId, bucket);
  }

  return {
    studentsCount: studentsById.size,
    coursesCount,
    totalEnrollments: enrollments.length,
    attemptsCount: attemptsDto.length,
    homeworkSubmissionsCount,
    courseRevenue: Number(payments._sum.amount ?? 0),
    storeRevenue: Number(storePurchases._sum.pricePaid ?? 0),
    subscriptionRevenue: Number(subscriptions._sum.pricePaid ?? 0),
    attempts: attemptsDto,
    studentsWithDetails: [...studentsById.values()].map((student) => ({
      student,
      enrollments: enrollmentsByUser.get(student.id) ?? [],
      userAttempts: attemptsByUser.get(student.id) ?? [],
    })),
  };
}
