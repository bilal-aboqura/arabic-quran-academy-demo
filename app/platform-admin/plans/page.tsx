import { listSaaSPlans } from "@/modules/platform/saas.repository";
import { PlansManager } from "./PlansManager";

export default async function PlatformAdminPlansPage() {
  const plans = await listSaaSPlans(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          NexaClass SaaS Plans
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Configure commercial pricing tiers, trial terms, student/course scale limits, and bundle feature capabilities.
        </p>
      </div>

      <PlansManager initialPlans={plans.map((plan) => ({
        ...plan,
        price: Number(plan.price),
        featureFlags: plan.featureFlags && typeof plan.featureFlags === "object" && !Array.isArray(plan.featureFlags) ? plan.featureFlags as Record<string, unknown> : {},
        limits: plan.limits && typeof plan.limits === "object" && !Array.isArray(plan.limits) ? plan.limits as Record<string, unknown> : {},
      }))} />
    </div>
  );
}
