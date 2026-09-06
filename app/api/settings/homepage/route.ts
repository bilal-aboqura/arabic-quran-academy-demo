import { NextRequest, NextResponse } from "next/server";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { getTenantPublicSettings } from "@/modules/settings/tenant-settings";

/**
 * Public tenant branding, resolved solely from the trusted request hostname.
 * The legacy global HomepageSetting singleton is deliberately not a fallback.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await resolveTenantFromHostname(request.headers.get("host"));
    if (!context) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const settings = await getTenantPublicSettings(context.tenantId);
    if (!settings) {
      return NextResponse.json({ error: "Tenant settings unavailable" }, { status: 404 });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("API settings/homepage:", error);
    return NextResponse.json({ error: "Unable to resolve tenant settings" }, { status: 500 });
  }
}
