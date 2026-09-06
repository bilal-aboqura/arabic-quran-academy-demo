import { prisma } from "@/lib/prisma";
import { listSaaSPlans } from "@/modules/platform/saas.repository";

export default async function PlatformAdminFeaturesPage() {
  const [plans, tenantsWithOverrides] = await Promise.all([
    listSaaSPlans(false),
    prisma.tenantSubscription.findMany({
      where: {
        NOT: { featureFlagOverrides: { equals: {} } },
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        plan: { select: { name: true } },
      },
    }),
  ]);

  const featureCatalog = [
    {
      key: "customDomain",
      name: "Custom Domain Mapping",
      desc: "Allows the academy to bind their own domain (e.g. academy.com) with SSL and routing.",
    },
    {
      key: "multiTeacher",
      name: "Multiple Teachers & Staff",
      desc: "Enables creating independent teacher accounts, course assignments, and staff roles.",
    },
    {
      key: "advancedAnalytics",
      name: "Advanced SaaS Analytics",
      desc: "Deep analytics for course engagement, video drop-offs, quiz metrics, and financial reporting.",
    },
    {
      key: "websiteBuilder",
      name: "Dynamic Website Builder",
      desc: "Public landing page section builder with hero presets, about, FAQ, and testimonials.",
    },
    {
      key: "store",
      name: "Digital Bookstore & Store",
      desc: "Allows selling digital PDFs, course workbooks, and materials with watermarking.",
    },
    {
      key: "quizzes",
      name: "Secure Quizzes & Exam Engine",
      desc: "Timed quizzes, randomized questions, server-side grading, and passing score gates.",
    },
    {
      key: "assignments",
      name: "Homework & Assignments",
      desc: "Assignment submissions, late tracking, teacher review, grading, and feedback.",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          Platform Feature Flags & Capabilities
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Global feature catalogue, standard plan availability, and custom tenant overrides.
        </p>
      </div>

      {/* Feature Catalog */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureCatalog.map((feat) => (
          <div
            key={feat.key}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🚩</span>
              <h2 className="text-sm font-bold text-[var(--color-foreground)]">{feat.name}</h2>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)] leading-relaxed">{feat.desc}</p>
            <div className="mt-3 font-mono text-[11px] text-[var(--color-muted)]">
              key: <code>{feat.key}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Defaults Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">
          Feature Availability by SaaS Plan
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="p-3">Plan</th>
                <th className="p-3 text-center">Custom Domain</th>
                <th className="p-3 text-center">Multi-Teacher</th>
                <th className="p-3 text-center">Analytics</th>
                <th className="p-3 text-center">Website Builder</th>
                <th className="p-3 text-center">Quizzes & Store</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {plans.map((p) => {
                const flags = (p.featureFlags as Record<string, boolean>) || {};
                return (
                  <tr key={p.id} className="hover:bg-[var(--color-border)]/20">
                    <td className="p-3 font-semibold text-[var(--color-foreground)]">
                      {p.name} ({p.code})
                    </td>
                    <td className="p-3 text-center">
                      {flags.customDomain ? "✅" : "❌"}
                    </td>
                    <td className="p-3 text-center">
                      {flags.multiTeacher ? "✅" : "❌"}
                    </td>
                    <td className="p-3 text-center">
                      {flags.advancedAnalytics ? "✅" : "❌"}
                    </td>
                    <td className="p-3 text-center">✅ Included</td>
                    <td className="p-3 text-center">✅ Included</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Overrides */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">
          Active Tenant Overrides ({tenantsWithOverrides.length})
        </h2>
        {tenantsWithOverrides.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)]">
            No academies currently have custom feature overrides. All tenants inherit their plan defaults.
          </p>
        ) : (
          <div className="space-y-3">
            {tenantsWithOverrides.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs"
              >
                <div>
                  <span className="font-bold text-[var(--color-foreground)]">{sub.tenant.name}</span>
                  <span className="ml-2 text-[var(--color-muted)]">({sub.plan.name})</span>
                </div>
                <div className="font-mono text-[11px] text-[var(--color-muted)]">
                  {JSON.stringify(sub.featureFlagOverrides)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
