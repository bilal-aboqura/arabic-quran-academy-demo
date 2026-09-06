import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformActor } from "@/modules/platform/actor";

export async function GET() {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalTenants,
    totalUsers,
    totalCourses,
    totalLessons,
    totalEnrollments,
    totalAssignments,
    totalQuizAttempts,
    totalOrders,
    totalBalanceTransactions,
    topTenantsByStudents,
    topTenantsByCourses,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.enrollment.count(),
    prisma.assignmentSubmission.count(),
    prisma.quizAttempt.count(),
    prisma.order.count(),
    prisma.tenantBalanceTransaction.count(),
    prisma.tenant.findMany({
      take: 10,
      orderBy: { memberships: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        _count: { select: { memberships: true, courses: true } },
      },
    }),
    prisma.tenant.findMany({
      take: 10,
      orderBy: { courses: { _count: "desc" } },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        _count: { select: { courses: true, memberships: true } },
      },
    }),
  ]);

  return NextResponse.json({
    totals: {
      totalTenants,
      totalUsers,
      totalCourses,
      totalLessons,
      totalEnrollments,
      totalAssignments,
      totalQuizAttempts,
      totalOrders,
      totalBalanceTransactions,
    },
    topTenantsByStudents,
    topTenantsByCourses,
  });
}
