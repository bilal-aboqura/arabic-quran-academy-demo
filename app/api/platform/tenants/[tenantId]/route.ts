import { NextRequest, NextResponse } from "next/server";
import { TenantStatus, TenantSubscriptionStatus } from "@prisma/client";
import { getPlatformActor } from "@/modules/platform/actor";
import { getTenantDetail, updateTenantDetails } from "@/modules/platform/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId } = await params;
  const tenant = await getTenantDetail(tenantId);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  return NextResponse.json({ tenant });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { tenantId } = await params;
    const body = await request.json() as {
      name?: string;
      nameAr?: string;
      status?: TenantStatus;
      planId?: string;
      subscriptionStatus?: TenantSubscriptionStatus;
      currentPeriodEnd?: string | null;
      trialEndsAt?: string | null;
      featureFlagOverrides?: Record<string, boolean>;
      limitOverrides?: Record<string, number | null>;
      extendMonths?: number;
    };

    let currentPeriodEnd = body.currentPeriodEnd ? new Date(body.currentPeriodEnd) : undefined;
    if (body.extendMonths && body.extendMonths > 0) {
      const now = new Date();
      currentPeriodEnd = new Date(now.setUTCMonth(now.getUTCMonth() + body.extendMonths));
    }

    const trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : undefined;

    const tenant = await updateTenantDetails({
      actor,
      tenantId,
      name: body.name,
      nameAr: body.nameAr,
      status: body.status,
      planId: body.planId,
      subscriptionStatus: body.subscriptionStatus,
      currentPeriodEnd,
      trialEndsAt,
      featureFlagOverrides: body.featureFlagOverrides,
      limitOverrides: body.limitOverrides,
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update tenant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
