import Link from "next/link";
import { getPlatformOverviewMetrics } from "@/modules/platform/service";

export default async function PlatformAdminOverviewPage() {
  const metrics = await getPlatformOverviewMetrics();

  const statCards = [
    {
      title: "Total Academies / Tenants",
      value: metrics.totalTenants,
      sub: `${metrics.activeTenants} Active · ${metrics.trialTenants} Trial · ${metrics.suspendedTenants} Suspended`,
      icon: "🏢",
      color: "from-blue-500/10 to-indigo-500/10 border-blue-500/20",
    },
    {
      title: "Monthly Recurring Revenue (MRR)",
      value: `${metrics.mrr.toLocaleString()} EGP`,
      sub: `ARR: ${metrics.arr.toLocaleString()} EGP`,
      icon: "💳",
      color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
    },
    {
      title: "Total SaaS Revenue Collected",
      value: `${metrics.totalSaaSRevenue.toLocaleString()} EGP`,
      sub: `From all direct platform setup & renewal invoices`,
      icon: "💰",
      color: "from-amber-500/10 to-yellow-500/10 border-amber-500/20",
    },
    {
      title: "Platform Scale",
      value: `${metrics.totalStudents.toLocaleString()} Students`,
      sub: `${metrics.totalTeachers} Teachers · ${metrics.totalCourses} Courses`,
      icon: "👥",
      color: "from-purple-500/10 to-pink-500/10 border-purple-500/20",
    },
    {
      title: "New Signups This Month",
      value: metrics.newTenantsThisMonth,
      sub: `Academy growth this billing cycle`,
      icon: "✨",
      color: "from-cyan-500/10 to-sky-500/10 border-cyan-500/20",
    },
    {
      title: "Upcoming Renewals & Alerts",
      value: `${metrics.upcomingRenewals} Renewals`,
      sub: `${metrics.expiredSubscriptions} Expired / Overdue subscriptions`,
      icon: "⚠️",
      color: "from-rose-500/10 to-orange-500/10 border-rose-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Platform Administration Overview
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            High-level SaaS health, revenue metrics, academy distribution, and subscription state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/platform-admin/tenants"
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
          >
            + Manage Academies
          </Link>
          <Link
            href="/platform-admin/plans"
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-medium text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
          >
            Manage SaaS Plans
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className={`flex flex-col justify-between rounded-xl border bg-gradient-to-br p-5 shadow-sm ${stat.color} bg-[var(--color-surface)]`}
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                {stat.title}
              </span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                {stat.value}
              </div>
              <p className="mt-1 text-xs font-medium text-[var(--color-muted)]">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Academies */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--color-foreground)]">Recent Academies / Signups</h2>
            <p className="text-xs text-[var(--color-muted)]">
              The latest academies registered on the NexaClass SaaS infrastructure.
            </p>
          </div>
          <Link
            href="/platform-admin/tenants"
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            View All ({metrics.totalTenants}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="pb-3 pt-2">Academy</th>
                <th className="pb-3 pt-2">Owner</th>
                <th className="pb-3 pt-2">Domain</th>
                <th className="pb-3 pt-2">SaaS Plan</th>
                <th className="pb-3 pt-2">Status</th>
                <th className="pb-3 pt-2">Created</th>
                <th className="pb-3 pt-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {metrics.recentTenants.map((tenant) => {
                const owner = tenant.memberships[0]?.user;
                return (
                  <tr key={tenant.id} className="hover:bg-[var(--color-border)]/20">
                    <td className="py-3">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {tenant.nameAr || tenant.name}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">{tenant.slug}</p>
                    </td>
                    <td className="py-3">
                      <p className="text-xs font-medium text-[var(--color-foreground)]">
                        {owner?.name || "—"}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">{owner?.email || "—"}</p>
                    </td>
                    <td className="py-3 text-xs text-[var(--color-muted)]">
                      {tenant.domains[0]?.hostname || `${tenant.slug}.localhost`}
                    </td>
                    <td className="py-3">
                      <span className="rounded bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-600 dark:text-teal-400">
                        {tenant.saasSubscription?.plan?.name || "No Plan"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          tenant.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : tenant.status === "SUSPENDED"
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-[var(--color-muted)]">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/platform-admin/tenants/${tenant.id}`}
                        className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] hover:border-[var(--color-primary)]"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
