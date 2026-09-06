import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAcademyStudentExtras } from '@/modules/sites/academy-student';
import { getTenantActor } from "@/modules/tenants/actor";
import { canViewTenantAnalytics } from "@/modules/tenants/authorization";
import { getTenantAnalytics } from "@/modules/analytics/repository";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { listContinueLearningForTenant } from "@/modules/learning/progress.repository";
import {
  StudentDashboardView,
  type StudentEnrolledCourse,
  type StudentRecentQuiz,
  type StudentRecentAssignment,
  type StudentPendingAssignment,
  type StudentActiveSubscription,
  type StudentRecentPurchase,
} from "./StudentDashboardView";
import {
  StaffDashboardView,
  type StaffEnrollmentRow,
  type StaffQuizAttemptRow,
  type StaffPendingSubmissionRow,
} from "./StaffDashboardView";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const requestHeaders = await headers();
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) redirect("/");

  const tenantActor = await getTenantActor(tenant);
  if (!tenantActor) redirect("/login");

  const isStudent = tenantActor.role === "STUDENT";

  if (isStudent) {
    const [
      membership,
      continueLearning,
      enrollments,
      courseProgressList,
      recentQuizAttempts,
      submittedAssignments,
      activeSubscription,
      storeOrders,
    ] = await Promise.all([
      prisma.tenantMembership.findUnique({
        where: {
          tenantId_userId: {
            tenantId: tenant.tenantId,
            userId: session.user.id,
          },
        },
        include: {
          studentAccount: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          },
        },
      }),
      listContinueLearningForTenant({
        tenantId: tenant.tenantId,
        actor: tenantActor,
      }),
      prisma.enrollment.findMany({
        where: {
          tenantId: tenant.tenantId,
          userId: session.user.id,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              titleAr: true,
              slug: true,
              imageUrl: true,
              price: true,
              _count: { select: { lessons: true } },
            },
          },
        },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.courseProgress.findMany({
        where: {
          tenantId: tenant.tenantId,
          studentMembershipId: tenantActor.membershipId,
        },
      }),
      prisma.quizAttempt.findMany({
        where: {
          tenantId: tenant.tenantId,
          studentMembershipId: tenantActor.membershipId,
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
        take: 5,
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          tenantId: tenant.tenantId,
          studentMembershipId: tenantActor.membershipId,
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
        take: 5,
      }),
      prisma.userPlatformSubscription.findFirst({
        where: {
          tenantId: tenant.tenantId,
          userId: session.user.id,
          expiresAt: { gt: new Date() },
        },
        include: {
          plan: { select: { id: true, name: true, durationKind: true } },
        },
        orderBy: { expiresAt: "desc" },
      }),
      prisma.order.findMany({
        where: {
          tenantId: tenant.tenantId,
          userId: session.user.id,
          status: "PAID",
        },
        include: {
          items: {
            select: {
              id: true,
              kind: true,
              title: true,
              unitAmountMinor: true,
              quantity: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    const pendingAssignmentsRaw = enrolledCourseIds.length > 0
      ? await prisma.assignment.findMany({
          where: {
            tenantId: tenant.tenantId,
            isPublished: true,
            courseId: { in: enrolledCourseIds },
            submissions: { none: { studentMembershipId: tenantActor.membershipId } },
          },
          include: {
            course: { select: { id: true, title: true, titleAr: true, slug: true } },
          },
          orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
          take: 5,
        })
      : [];

    const progressByCourse = new Map(courseProgressList.map((cp) => [cp.courseId, cp]));

    const enrolledCoursesDto: StudentEnrolledCourse[] = enrollments.map((enr) => {
      const cp = progressByCourse.get(enr.courseId);
      return {
        id: enr.id,
        courseId: enr.courseId,
        title: enr.course.title,
        titleAr: enr.course.titleAr,
        slug: enr.course.slug,
        imageUrl: enr.course.imageUrl,
        lessonsCount: enr.course._count.lessons,
        completedLessons: cp?.completedLessons ?? 0,
        progressPercent: cp ? Math.round(Number(cp.progressPercent)) : 0,
      };
    });

    const recentQuizzesDto: StudentRecentQuiz[] = recentQuizAttempts.map((q) => {
      const pct = q.totalQuestions > 0 ? Math.round((q.score / q.totalQuestions) * 100) : 0;
      return {
        id: q.id,
        quizId: q.quizId,
        quizTitle: q.quiz.title,
        courseTitle: q.quiz.course.titleAr || q.quiz.course.title,
        score: q.score,
        totalQuestions: q.totalQuestions,
        percentage: pct,
        passed: pct >= 50,
        createdAt: q.createdAt.toISOString(),
      };
    });

    const submittedAssignmentsDto: StudentRecentAssignment[] = submittedAssignments.map((sa) => ({
      id: sa.id,
      assignmentId: sa.assignmentId,
      assignmentTitle: sa.assignment.title,
      courseTitle: sa.assignment.course.titleAr || sa.assignment.course.title,
      status: sa.status,
      grade: sa.grade != null ? Number(sa.grade) : null,
      maxGrade: sa.assignment.maxGrade,
      submittedAt: sa.submittedAt.toISOString(),
      feedback: sa.feedback,
    }));

    const pendingAssignmentsDto: StudentPendingAssignment[] = pendingAssignmentsRaw.map((pa) => ({
      id: pa.id,
      title: pa.title,
      courseTitle: pa.course.titleAr || pa.course.title,
      maxGrade: pa.maxGrade,
      deadline: pa.deadline ? pa.deadline.toISOString() : null,
    }));

    const activeSubscriptionDto: StudentActiveSubscription | null = activeSubscription
      ? {
          id: activeSubscription.id,
          planName: activeSubscription.plan?.name ?? "Subscription Plan",
          expiresAt: activeSubscription.expiresAt.toISOString(),
          durationKind: activeSubscription.plan?.durationKind ?? "MONTHLY",
        }
      : null;

    const recentPurchasesDto: StudentRecentPurchase[] = storeOrders.map((o) => ({
      id: o.id,
      totalAmount: o.amountMinor / 100,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        title: i.title,
        unitPrice: i.unitAmountMinor / 100,
      })),
    }));

    return (
      <StudentDashboardView
        academyExtras={await getAcademyStudentExtras(tenant.tenantId, tenantActor)}
        userName={membership?.displayName || session.user.name || "Student"}
        walletBalance={Number(membership?.studentAccount?.balance ?? 0)}
        copyrightCode={membership?.copyrightCode ?? null}
        enrolledCourses={enrolledCoursesDto}
        continueLearning={continueLearning}
        recentQuizzes={recentQuizzesDto}
        submittedAssignments={submittedAssignmentsDto}
        pendingAssignments={pendingAssignmentsDto}
        activeSubscription={activeSubscriptionDto}
        recentPurchases={recentPurchasesDto}
      />
    );
  }

  // Staff Experience (OWNER, ADMIN, ASSISTANT, TEACHER)
  const [analytics, recentEnrollments, recentAttempts, pendingSubmissions] = await Promise.all([
    canViewTenantAnalytics(tenantActor)
      ? getTenantAnalytics(tenant.tenantId, tenantActor)
      : {
          studentsCount: 0,
          coursesCount: 0,
          totalEnrollments: 0,
          courseRevenue: 0,
        },
    prisma.enrollment.findMany({
      where: { tenantId: tenant.tenantId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, titleAr: true, slug: true } },
      },
      orderBy: { enrolledAt: "desc" },
      take: 5,
    }),
    prisma.quizAttempt.findMany({
      where: { tenantId: tenant.tenantId },
      include: {
        quiz: { select: { id: true, title: true } },
        studentMembership: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        tenantId: tenant.tenantId,
        status: "SUBMITTED",
      },
      include: {
        assignment: { select: { id: true, title: true } },
        studentMembership: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
  ]);

  const recentEnrollmentsDto: StaffEnrollmentRow[] = recentEnrollments.map((e) => ({
    id: e.id,
    studentName: e.user.name || "Student",
    studentEmail: e.user.email,
    courseTitle: e.course.titleAr || e.course.title,
    enrolledAt: e.enrolledAt.toISOString(),
  }));

  const recentQuizAttemptsDto: StaffQuizAttemptRow[] = recentAttempts.map((q) => {
    const pct = q.totalQuestions > 0 ? Math.round((q.score / q.totalQuestions) * 100) : 0;
    return {
      id: q.id,
      studentName: q.studentMembership.displayName || q.studentMembership.user.name || "Student",
      quizTitle: q.quiz.title,
      score: q.score,
      totalQuestions: q.totalQuestions,
      percentage: pct,
      passed: pct >= 50,
      createdAt: q.createdAt.toISOString(),
    };
  });

  const pendingSubmissionsDto: StaffPendingSubmissionRow[] = pendingSubmissions.map((s) => ({
    id: s.id,
    studentName: s.studentMembership.displayName || s.studentMembership.user.name || "Student",
    assignmentTitle: s.assignment.title,
    submittedAt: s.submittedAt.toISOString(),
  }));

  return (
    <StaffDashboardView
      userName={session.user.name || "Instructor"}
      role={tenantActor.role}
      analytics={analytics}
      recentEnrollments={recentEnrollmentsDto}
      recentQuizAttempts={recentQuizAttemptsDto}
      pendingSubmissions={pendingSubmissionsDto}
    />
  );
}
