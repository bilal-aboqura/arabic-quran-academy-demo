import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformActor } from "@/modules/platform/actor";
import { recordTenantSaaSPayment } from "@/modules/platform/service";

export async function GET(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  const subscriptions = await prisma.tenantSubscription.findMany({
    where: status && status !== "ALL" ? { status: status as never } : undefined,
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          domains: { where: { isPrimary: true }, select: { hostname: true } },
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ subscriptions });
}

export async function POST(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as {
      tenantId: string;
      planId?: string;
      amount: number;
      currency?: string;
      periodMonths?: number;
      provider?: string;
      notes?: string;
    };

    if (!body.tenantId || typeof body.amount !== "number") {
      return NextResponse.json({ error: "tenantId and amount are required" }, { status: 400 });
    }

    const invoice = await recordTenantSaaSPayment({
      actor,
      tenantId: body.tenantId,
      planId: body.planId,
      amount: body.amount,
      currency: body.currency,
      periodMonths: body.periodMonths,
      provider: body.provider,
      notes: body.notes,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record SaaS payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
