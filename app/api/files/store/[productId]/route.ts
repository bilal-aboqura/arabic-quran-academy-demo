import { NextRequest, NextResponse } from "next/server";
import { downloadFromR2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { isTenantObjectKeyForActor } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export const runtime = "nodejs";

/** Retrieves a purchased store file without ever exposing its storage key to the browser. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    if (actor.role !== "STUDENT") return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { productId } = await params;
    const product = await prisma.storeProduct.findFirst({
      where: { id: productId, tenantId: actor.tenantId, isActive: true },
      select: { pdfUrl: true, title: true },
    });
    if (!product?.pdfUrl || !isTenantObjectKeyForActor({ tenantId: actor.tenantId, kind: "attachments", key: product.pdfUrl })) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const [purchase, subscription] = await Promise.all([
      prisma.userStorePurchase.findFirst({ where: { tenantId: actor.tenantId, userId: actor.userId, productId }, select: { id: true } }),
      prisma.userPlatformSubscription.findFirst({ where: { tenantId: actor.tenantId, userId: actor.userId, expiresAt: { gt: new Date() } }, select: { id: true } }),
    ]);
    if (!purchase && !subscription) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const file = await downloadFromR2(product.pdfUrl);
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${product.title}.pdf`)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to retrieve file" }, { status: 500 });
  }
}
