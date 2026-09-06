import { NextRequest, NextResponse } from "next/server";
import { getPlatformActor } from "@/modules/platform/actor";
import { listTenantsWithFilters, createTenantWithPlan } from "@/modules/platform/service";

export async function GET(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const planId = url.searchParams.get("planId") ?? undefined;
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "25", 10);

  const result = await listTenantsWithFilters({ search, status, planId, page, limit });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as {
      name: string;
      nameAr?: string;
      slug: string;
      ownerEmail: string;
      ownerName?: string;
      planId: string;
      trialDays?: number;
    };

    if (!body.name || !body.slug || !body.ownerEmail || !body.planId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tenant = await createTenantWithPlan({
      actor,
      name: body.name,
      nameAr: body.nameAr,
      slug: body.slug,
      ownerEmail: body.ownerEmail,
      ownerName: body.ownerName || body.name,
      planId: body.planId,
      trialDays: body.trialDays,
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tenant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
