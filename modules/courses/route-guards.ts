import { requireTenant, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

/**
 * Legacy mutation/assessment routes remain disabled until their replacements
 * can preserve tenant ownership and transactional integrity. This guard makes
 * that failure explicit and prevents a global compatibility fallback.
 */
export async function unavailableUntilTenantMigration(request: Request): Promise<Response> {
  try {
    await requireTenant(request);
  } catch (error) {
    const response = tenantRequestErrorResponse(error);
    if (response) return response;
    throw error;
  }
  return Response.json(
    { error: "This endpoint is temporarily unavailable while tenant migration is completed.", code: "TENANT_MIGRATION_REQUIRED" },
    { status: 503 },
  );
}
