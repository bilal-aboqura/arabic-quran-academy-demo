import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlatformActor } from "@/modules/platform/actor";

export async function GET(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  const invoices = await prisma.saaSInvoice.findMany({
    where: tenantId ? { tenantId } : undefined,
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      plan: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ invoices });
}
