import { prisma } from "@/lib/prisma";
import { SubscriptionsManager } from "./SubscriptionsManager";

export default async function PlatformAdminSubscriptionsPage() {
  const subscriptions = await prisma.tenantSubscription.findMany({
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          domains: { where: { isPrimary: true }, select: { hostname: true } },
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          Tenant SaaS Subscriptions
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Real-time billing cycles, active terms, renewal deadlines, and overdue subscriptions across all academies.
        </p>
      </div>

      <SubscriptionsManager initialSubscriptions={subscriptions.map((subscription) => ({ ...subscription, plan: { ...subscription.plan, price: Number(subscription.plan.price) } }))} />
    </div>
  );
}
