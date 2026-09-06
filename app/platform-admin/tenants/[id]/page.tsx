import { notFound } from "next/navigation";
import Link from "next/link";
import { getTenantDetail } from "@/modules/platform/service";
import { listSaaSPlans } from "@/modules/platform/saas.repository";
import { TenantDetailEditor } from "./TenantDetailEditor";
import { WebsitePanel } from "./WebsitePanel";
import { OwnerAccessPanel } from "./OwnerAccessPanel";

export default async function PlatformAdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tenant, plans] = await Promise.all([
    getTenantDetail(id),
    listSaaSPlans(false),
  ]);

  if (!tenant) notFound();

  const planOptions = plans.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    price: Number(p.price),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <Link href="/platform-admin/tenants" className="hover:text-[var(--color-primary)]">
          ← Academies
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--color-foreground)]">{tenant.name}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            {tenant.nameAr || tenant.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Tenant ID: <code className="font-mono text-xs">{tenant.id}</code> · Slug:{" "}
            <code className="font-mono text-xs">{tenant.slug}</code>
          </p>
        </div>
      </div>

      <WebsitePanel tenantId={tenant.id} slug={tenant.slug} domain={tenant.domains.find((item)=>item.isPrimary)?.hostname||tenant.domains[0]?.hostname||null} site={tenant.site} settings={tenant.settings} />

      <OwnerAccessPanel tenantId={tenant.id} owner={tenant.owner ? { name: tenant.owner.name, email: tenant.owner.email } : null} />

      <TenantDetailEditor tenant={JSON.parse(JSON.stringify(tenant))} plans={planOptions} />
    </div>
  );
}
