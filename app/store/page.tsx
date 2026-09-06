import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { getTenantActor } from "@/modules/tenants/actor";
import { listPublicStoreProductsForTenant, getStorePurchasesForTenantStudent } from "@/modules/commerce/repository";
import { prisma } from "@/lib/prisma";
import { StoreBrowseClient } from "./StoreBrowseClient";
import { StorePageReadyBeacon } from "./StorePageReadyBeacon";

export default async function StorePage() {
  const requestHeaders = await headers();
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) notFound();
  const session = await getServerSession(authOptions);
  const products = await listPublicStoreProductsForTenant(tenant.tenantId).catch(() => []);

  let isSubscribed = false;
  let purchasedProductIds: string[] = [];
  const actor = await getTenantActor(tenant);
  if (actor?.role === "STUDENT") {
    const [subscription, purchases] = await Promise.all([
      prisma.userPlatformSubscription.findFirst({
        where: { tenantId: tenant.tenantId, userId: actor.userId, expiresAt: { gt: new Date() } }, select: { id: true },
      }),
      getStorePurchasesForTenantStudent(tenant.tenantId, actor.userId),
    ]);
    isSubscribed = Boolean(subscription);
    purchasedProductIds = purchases.map((purchase) => purchase.productId);
  }

  return (
    <>
      <StorePageReadyBeacon />
      <StoreBrowseClient
        products={products}
        isSubscribed={isSubscribed}
        isLoggedIn={!!session}
        purchasedProductIds={purchasedProductIds}
      />
    </>
  );
}
