import { getTenantActor } from "@/modules/tenants/actor";
import { TenantAuthorizationError, requireTenantPermission, type TenantPermission } from "@/modules/tenants/authorization";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import type { TenantActor, TenantContext } from "@/modules/tenants/types";

/** A controlled failure type for request handlers and server actions. */
export class TenantRequestError extends TenantAuthorizationError {
  constructor(code: "TENANT_NOT_FOUND" | "MEMBERSHIP_REQUIRED" | "TENANT_FORBIDDEN") {
    super(code);
  }
}

/**
 * The authoritative request-to-tenant boundary. It deliberately resolves only
 * the Host header: query strings, request bodies and cookies cannot select a
 * tenant. Internal platform tooling needs a separately reviewed entry point.
 */
export async function resolveTenantFromRequest(request: Pick<Request, "headers">): Promise<TenantContext | null> {
  return resolveTenantFromHostname(request.headers.get("host"));
}

export async function requireTenant(request: Pick<Request, "headers">): Promise<TenantContext> {
  const tenant = await resolveTenantFromRequest(request);
  if (!tenant) throw new TenantRequestError("TENANT_NOT_FOUND");
  return tenant;
}

export async function requireTenantActor(request: Pick<Request, "headers">): Promise<TenantActor> {
  const tenant = await requireTenant(request);
  const actor = await getTenantActor(tenant);
  if (!actor) throw new TenantRequestError("MEMBERSHIP_REQUIRED");
  return actor;
}

export async function requireRequestTenantPermission(
  request: Pick<Request, "headers">,
  permission: TenantPermission,
): Promise<TenantActor> {
  const actor = await requireTenantActor(request);
  requireTenantPermission(actor, permission);
  return actor;
}

/** Avoid leaking tenant/resource existence from API routes. */
export function tenantRequestErrorResponse(error: unknown): Response | null {
  if (!(error instanceof TenantRequestError) && !(error instanceof TenantAuthorizationError)) return null;

  if (error.code === "TENANT_NOT_FOUND") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (error.code === "MEMBERSHIP_REQUIRED") {
    return Response.json({ error: "Authentication and tenant membership required" }, { status: 401 });
  }
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
