import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTenantActor } from "@/modules/tenants/actor";
import { canTenant, type TenantPermission } from "@/modules/tenants/authorization";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";

/**
 * Server-component boundary for the tenant dashboard.  Pages must obtain
 * their actor here instead of treating the legacy global role in the session
 * as authority.  The host is the only tenant selector.
 */
export async function requireDashboardTenantActor(permission?: TenantPermission) {
  const requestHeaders = await headers();
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) redirect(process.env.NODE_ENV === "production" ? "/" : "/dashboard");

  const actor = await getTenantActor(tenant);
  if (!actor || (permission && !canTenant(actor, permission))) redirect("/dashboard");
  return actor;
}
