import { NextRequest, NextResponse } from "next/server";
import { getPlatformActor } from "@/modules/platform/actor";
import { listPlatformAuditLogs } from "@/modules/platform/audit";

export async function GET(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const action = url.searchParams.get("action") ?? undefined;
  const targetType = url.searchParams.get("targetType") ?? undefined;

  const logs = await listPlatformAuditLogs({ limit, action, targetType });
  return NextResponse.json({ logs });
}
