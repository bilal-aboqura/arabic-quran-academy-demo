import { prisma } from "@/lib/prisma";
import { normalizeHostname, tenantSlugFromWildcardHostname } from "@/modules/tenants/hostname";
import type { TenantContext } from "@/modules/tenants/types";

/**
 * Resolves tenant identity exclusively from a hostname. The browser never
 * supplies a tenantId. Unknown/suspended production hosts resolve to null.
 */
export async function resolveTenantFromHostname(hostHeader: string | null | undefined): Promise<TenantContext | null> {
  const hostname = normalizeHostname(hostHeader);
  if (!hostname) return null;

  const configuredDomain = await prisma.tenantDomain.findFirst({
    where: { hostname, status: "ACTIVE", tenant: { status: "ACTIVE" } },
    select: { kind: true, tenant: { select: { id: true, slug: true } } },
  });
  if (configuredDomain) {
    return {
      tenantId: configuredDomain.tenant.id,
      tenantSlug: configuredDomain.tenant.slug,
      hostname,
      domainKind: configuredDomain.kind,
    };
  }

  const wildcardSlug = tenantSlugFromWildcardHostname(hostname);
  if (wildcardSlug) {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: wildcardSlug, status: "ACTIVE" },
      select: { id: true, slug: true },
    });
    if (tenant) {
      return { tenantId: tenant.id, tenantSlug: tenant.slug, hostname, domainKind: "SUBDOMAIN" };
    }
  }

  // Local development requires an explicit opt-in mapping. It cannot select a
  // tenant from a query string, cookie, or request body.
  if (process.env.NODE_ENV !== "production" && (hostname === "localhost" || hostname === "127.0.0.1")) {
    const devSlug = process.env.NEXACLASS_DEV_TENANT_SLUG?.trim().toLowerCase();
    if (!devSlug) return null;
    const tenant = await prisma.tenant.findFirst({
      where: { slug: devSlug, status: "ACTIVE" },
      select: { id: true, slug: true },
    });
    if (tenant) {
      return { tenantId: tenant.id, tenantSlug: tenant.slug, hostname, domainKind: "DEVELOPMENT" };
    }
  }

  return null;
}
