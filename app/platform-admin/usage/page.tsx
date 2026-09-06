import { prisma } from "@/lib/prisma";

export default async function PlatformAdminUsagePage() {
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

  const stats = [
    { label: "Total Academies", val: totalTenants, icon: "🏢" },
    { label: "Total Platform Users", val: totalUsers, icon: "👤" },
    { label: "Total Courses Published", val: totalCourses, icon: "📚" },
    { label: "Total Video Lessons", val: totalLessons, icon: "🎬" },
    { label: "Student Enrollments", val: totalEnrollments, icon: "🎓" },
    { label: "Assignment Submissions", val: totalAssignments, icon: "📝" },
    { label: "Quiz Attempts Graded", val: totalQuizAttempts, icon: "⏱️" },
    { label: "Total Student Orders", val: totalOrders, icon: "🛍️" },
    { label: "Wallet Ledger Entries", val: totalBalanceTransactions, icon: "💳" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          Platform Infrastructure & Resource Usage
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Aggregated resource consumption, activity metrics, and top customer distribution across the platform.
        </p>
      </div>

      {/* Aggregate Stats */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                {s.val.toLocaleString()}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                {s.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Academies */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">
            Top Academies by Community Scale
          </h2>
          <div className="space-y-3">
            {topTenantsByStudents.map((t, idx) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[var(--color-muted)]">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-[var(--color-foreground)]">{t.name}</p>
                    <p className="text-[11px] text-[var(--color-muted)]">{t.slug}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-[var(--color-foreground)]">
                    {t._count.memberships}
                  </span>
                  <p className="text-[10px] text-[var(--color-muted)]">Total Members</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">
            Top Academies by Catalog Size
          </h2>
          <div className="space-y-3">
            {topTenantsByCourses.map((t, idx) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[var(--color-muted)]">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-[var(--color-foreground)]">{t.name}</p>
                    <p className="text-[11px] text-[var(--color-muted)]">{t.slug}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-[var(--color-foreground)]">
                    {t._count.courses}
                  </span>
                  <p className="text-[10px] text-[var(--color-muted)]">Courses</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
