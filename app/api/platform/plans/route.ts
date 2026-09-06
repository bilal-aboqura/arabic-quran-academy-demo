import { NextRequest, NextResponse } from "next/server";
import { getPlatformActor } from "@/modules/platform/actor";
import { listSaaSPlans, upsertSaaSPlan, type SaaSPlanInput } from "@/modules/platform/saas.repository";

export async function GET() {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await listSaaSPlans(false);
  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as SaaSPlanInput;
    const plan = await upsertSaaSPlan({ actor, input: body });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create SaaS plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
