import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageWallet } from "@/modules/tenants/authorization";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import {
  StudentDetailView,
  type StudentCourseEnrollment,
  type StudentQuizAttemptRow,
  type StudentAssignmentRow,
  type StudentWalletTransactionRow,
  type StudentSubscriptionRow,
} from "./StudentDetailView";

type Props = {
  params: Promise<{ id: string }>;
};

function isSubscriptionValid(expiresAt: Date): boolean {
  return expiresAt.getTime() > Date.now();
}

export default async function StudentDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const actor = await requireDashboardTenantActor("MANAGE_STUDENTS");
  const { id } = await params;

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: actor.tenantId,
      role: "STUDENT",
      status: "ACTIVE",
      OR: [{ userId: id }, { id }],
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      studentAccount: {
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      },
      studentEnrollments: {
        where: { tenantId: actor.tenantId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              slug: true,
              price: true,
              _count: { select: { lessons: true, quizzes: true } },
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!membership) notFound();

  const [courseProgressList, quizAttempts, assignmentSubmissions, subscriptions, allCourses] =
    await Promise.all([
      prisma.courseProgress.findMany({
        where: {
          tenantId: actor.tenantId,
          studentMembershipId: membership.id,
        },
      }),
      prisma.quizAttempt.findMany({
        where: {
          tenantId: actor.tenantId,
          studentMembershipId: membership.id,
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true, titleAr: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          tenantId: actor.tenantId,
          studentMembershipId: membership.id,
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              maxGrade: true,
              course: { select: { id: true, title: true, titleAr: true, slug: true } },
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        take: 50,
      }),
      prisma.userPlatformSubscription.findMany({
        where: {
          tenantId: actor.tenantId,
          userId: membership.userId,
        },
        include: {
          plan: { select: { id: true, name: true, durationKind: true } },
        },
        orderBy: { expiresAt: "desc" },
      }),
      prisma.course.findMany({
        where: { tenantId: actor.tenantId },
        select: { id: true, title: true, titleAr: true },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      }),
    ]);

  const progressByCourse = new Map(courseProgressList.map((cp) => [cp.courseId, cp]));

  const enrollmentsDto: StudentCourseEnrollment[] = membership.studentEnrollments.map((enr) => {
    const cp = progressByCourse.get(enr.courseId);
    return {
      id: enr.id,
      courseId: enr.courseId,
      title: enr.course.title,
      titleAr: enr.course.titleAr,
      slug: enr.course.slug,
      price: Number(enr.course.price),
      lessonsCount: enr.course._count.lessons,
      quizzesCount: enr.course._count.quizzes,
      enrolledAt: enr.enrolledAt.toISOString(),
      progressPercent: cp ? Math.round(Number(cp.progressPercent)) : 0,
      completedLessons: cp?.completedLessons ?? 0,
      lastAccessedAt: cp?.lastViewedAt ? cp.lastViewedAt.toISOString() : null,
    };
  });

  const quizAttemptsDto: StudentQuizAttemptRow[] = quizAttempts.map((attempt) => {
    const pct = attempt.totalQuestions > 0 ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0;
    return {
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.title,
      courseTitle: attempt.quiz.course.titleAr || attempt.quiz.course.title,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: pct,
      passed: pct >= 50,
      createdAt: attempt.createdAt.toISOString(),
    };
  });

  const assignmentsDto: StudentAssignmentRow[] = assignmentSubmissions.map((sub) => ({
    id: sub.id,
    assignmentId: sub.assignmentId,
    assignmentTitle: sub.assignment.title,
    courseTitle: sub.assignment.course.titleAr || sub.assignment.course.title,
    status: sub.status,
    score: sub.grade != null ? Number(sub.grade) : null,
    maxScore: sub.assignment.maxGrade,
    submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
    feedback: sub.feedback,
  }));

  const walletTransactionsDto: StudentWalletTransactionRow[] = (
    membership.studentAccount?.transactions ?? []
  ).map((tx) => ({
    id: tx.id,
    kind: tx.kind,
    amount: Number(tx.amount),
    referenceType: tx.referenceType,
    referenceId: tx.referenceId,
    createdAt: tx.createdAt.toISOString(),
  }));

  const subscriptionsDto: StudentSubscriptionRow[] = subscriptions.map((sub) => ({
    id: sub.id,
    planName: sub.plan?.name ?? "Custom Plan",
    pricePaid: Number(sub.pricePaid),
    expiresAt: sub.expiresAt.toISOString(),
    createdAt: sub.createdAt.toISOString(),
    isActive: isSubscriptionValid(sub.expiresAt),
  }));

  const isOwnerOrAdmin = actor.role === "OWNER" || actor.role === "ADMIN";

  return (
    <StudentDetailView
      student={{
        id: membership.userId,
        membershipId: membership.id,
        name: membership.displayName || membership.user.name || "Student",
        email: membership.user.email,
        student_number: membership.studentNumber,
        guardian_number: membership.guardianNumber,
        copyright_code: membership.copyrightCode,
        balance: Number(membership.studentAccount?.balance ?? 0),
        createdAt: membership.createdAt.toISOString(),
      }}
      enrollments={enrollmentsDto}
      quizAttempts={quizAttemptsDto}
      assignments={assignmentsDto}
      walletTransactions={walletTransactionsDto}
      subscriptions={subscriptionsDto}
      availableCourses={allCourses}
      canManageEnrollments={isOwnerOrAdmin}
      canManageWallet={canManageWallet(actor)}
    />
  );
}
