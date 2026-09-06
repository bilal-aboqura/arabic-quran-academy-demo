import { NextRequest, NextResponse } from "next/server";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { tenantSettingsPatchSchema, updateTenantSettingsForAdmin } from "@/modules/settings/admin.repository";

/** Branding is intentionally separate from the general settings endpoint so
 * teachers can update their public identity without access to billing/store settings. */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_WEBSITE");
    const settings = tenantSettingsPatchSchema.parse(await request.json());
    return NextResponse.json(await updateTenantSettingsForAdmin(actor.tenantId, settings));
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Invalid website branding" }, { status: 400 });
  }
}
