import { NextRequest, NextResponse } from "next/server";
import { canManageTenant } from "@/modules/tenants/authorization";
import {
  getTenantCopyrightOverlayStyle,
  updateTenantCopyrightOverlayStyle,
} from "@/modules/settings/admin.repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

type CopyrightOverlayStyle = "floating" | "watermark";

function normalizeStyle(input: unknown): CopyrightOverlayStyle {
  const s = String(input ?? "").trim().toLowerCase();
  return s === "watermark" ? "watermark" : "floating";
}

export async function GET(request: NextRequest) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (!canManageTenant(actor)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const style = await getTenantCopyrightOverlayStyle(actor.tenantId);
    return NextResponse.json({ copyrightOverlayStyle: style });
  } catch {
    return NextResponse.json({ error: "فشل جلب الإعدادات" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let actor;
  try {
    actor = await requireTenantActor(request);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (!canManageTenant(actor)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  try {
    const style = normalizeStyle(body.copyrightOverlayStyle);
    await updateTenantCopyrightOverlayStyle(actor.tenantId, style);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
  }
}
