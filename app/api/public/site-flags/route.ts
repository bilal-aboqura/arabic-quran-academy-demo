import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireTenant(request);
    // TenantSettings does not yet include website feature flags. Do not expose
    // the legacy singleton flag across tenant boundaries.
    return NextResponse.json({ teachersEnabled: false });
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    return tenantError ?? NextResponse.json({ error: "Unable to resolve tenant" }, { status: 500 });
  }
}
