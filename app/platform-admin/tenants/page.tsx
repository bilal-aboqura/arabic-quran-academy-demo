import { listTenantsWithFilters } from "@/modules/platform/service";
import { listSaaSPlans } from "@/modules/platform/saas.repository";
import { TenantsManager } from "./TenantsManager";

export default async function PlatformAdminTenantsPage() {
  const [{ tenants }, plans] = await Promise.all([
    listTenantsWithFilters({ limit: 100 }),
    listSaaSPlans(false),
  ]);

  const planOptions = plans.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    price: Number(p.price),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          Academies & Tenants
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage all customer academies, provision new tenants, monitor plan subscriptions, and review usage.
        </p>
      </div>

      <TenantsManager initialTenants={JSON.parse(JSON.stringify(tenants))} plans={planOptions} />
    </div>
  );
}
