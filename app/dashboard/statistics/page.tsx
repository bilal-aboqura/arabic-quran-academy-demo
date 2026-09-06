import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { getTenantAnalytics } from "@/modules/analytics/repository";
import { getTenantActor } from "@/modules/tenants/actor";
import { canViewTenantAnalytics } from "@/modules/tenants/authorization";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import StatisticsContent from "./StatisticsContent";

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const requestHeaders = await headers();
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) redirect(process.env.NODE_ENV === "production" ? "/" : "/dashboard");
  const actor = await getTenantActor(tenant);
  if (!actor || !canViewTenantAnalytics(actor)) redirect("/dashboard");

  const [analytics, t] = await Promise.all([
    getTenantAnalytics(tenant.tenantId, actor),
    getServerTranslator(),
  ]);

  return (
    <StatisticsContent
      studentsCount={analytics.studentsCount}
      totalEnrollments={analytics.totalEnrollments}
      attemptsCount={analytics.attemptsCount}
      totalEarnings={analytics.courseRevenue}
      attempts={analytics.attempts.map((attempt) => ({ ...attempt, createdAt: attempt.createdAt.toISOString() }))}
      studentsWithDetails={analytics.studentsWithDetails.map((student) => ({
        ...student,
        userAttempts: student.userAttempts.map((attempt) => ({ ...attempt, createdAt: attempt.createdAt.toISOString() })),
      }))}
      titleSuffix={actor.role === "TEACHER" ? t("dashboard.statisticsPage.titleSuffixTeacher", "(your courses)") : ""}
    />
  );
}
