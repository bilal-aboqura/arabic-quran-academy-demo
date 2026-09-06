import { NextRequest, NextResponse } from "next/server";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { getTenantSettingsForAdmin, tenantSettingsPatchSchema, updateTenantSettingsForAdmin } from "@/modules/settings/admin.repository";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_SETTINGS");
    return NextResponse.json(await getTenantSettingsForAdmin(actor.tenantId));
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to read tenant settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_SETTINGS");
    const body = tenantSettingsPatchSchema.parse(await request.json());
    return NextResponse.json(await updateTenantSettingsForAdmin(actor.tenantId, body));
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    return NextResponse.json({ error: "Invalid tenant settings" }, { status: 400 });
  }
}
