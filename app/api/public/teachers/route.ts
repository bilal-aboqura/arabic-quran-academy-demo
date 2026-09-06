import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { listPublicTeachersForTenant } from "@/modules/tenants/public-teachers.repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant(request);
    return NextResponse.json({ teachers: await listPublicTeachersForTenant(tenant.tenantId) });
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    return NextResponse.json({ error: "Unable to list teachers" }, { status: 500 });
  }
}
