import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformActor } from "@/modules/platform/actor";
import { logPlatformAction } from "@/modules/platform/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json() as {
      name?: string;
      description?: string;
      price?: number;
      currency?: string;
      billingIntervalMonths?: number;
      trialMonths?: number;
      isActive?: boolean;
      featureFlags?: Record<string, boolean>;
      limits?: Record<string, number | null>;
    };

    const plan = await prisma.saaSPlan.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.currency ? { currency: body.currency.toUpperCase() } : {}),
        ...(body.billingIntervalMonths ? { billingIntervalMonths: body.billingIntervalMonths } : {}),
        ...(body.trialMonths !== undefined ? { trialMonths: body.trialMonths } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.featureFlags ? { featureFlags: body.featureFlags } : {}),
        ...(body.limits ? { limits: body.limits } : {}),
      },
    });

    await logPlatformAction({
      actor,
      action: "UPDATE_SAAS_PLAN",
      targetType: "SAAS_PLAN",
      targetId: plan.id,
      metadata: { code: plan.code, name: plan.name, price: Number(plan.price) },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update SaaS plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const plan = await prisma.saaSPlan.update({
      where: { id },
      data: { isActive: false },
    });

    await logPlatformAction({
      actor,
      action: "ARCHIVE_SAAS_PLAN",
      targetType: "SAAS_PLAN",
      targetId: plan.id,
      metadata: { code: plan.code },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to archive SaaS plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
