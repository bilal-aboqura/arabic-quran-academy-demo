import { prisma } from "@/lib/prisma";

export type TenantStoreProductDto = {
  id: string;
  title: string;
  description: string;
  price: number;
  costPrice: number;
  imageUrl: string | null;
  pdfUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

/** The anonymous storefront must never receive a source asset URL or margin data. */
export type PublicTenantStoreProductDto = Pick<TenantStoreProductDto,
  "id" | "title" | "description" | "price" | "imageUrl" | "isActive" | "sortOrder" | "createdAt">;

function productDto(product: {
  id: string; title: string; description: string; price: { toString(): string }; costPrice: { toString(): string };
  imageUrl: string | null; pdfUrl: string | null; isActive: boolean; sortOrder: number; createdAt: Date;
}): TenantStoreProductDto {
  return {
    id: product.id, title: product.title, description: product.description,
    price: Number(product.price), costPrice: Number(product.costPrice), imageUrl: product.imageUrl,
    pdfUrl: product.pdfUrl, isActive: product.isActive, sortOrder: product.sortOrder,
    createdAt: product.createdAt.toISOString(),
  };
}

export async function listPublicStoreProductsForTenant(tenantId: string): Promise<PublicTenantStoreProductDto[]> {
  const products = await prisma.storeProduct.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return products.map((product) => {
    const dto = productDto(product);
    return {
      id: dto.id, title: dto.title, description: dto.description, price: dto.price,
      imageUrl: dto.imageUrl, isActive: dto.isActive, sortOrder: dto.sortOrder, createdAt: dto.createdAt,
    };
  });
}

export async function listStoreProductsForTenant(tenantId: string): Promise<TenantStoreProductDto[]> {
  const products = await prisma.storeProduct.findMany({
    where: { tenantId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return products.map(productDto);
}

export async function createStoreProductForTenant(tenantId: string, input: {
  title: string; description: string; price: number; costPrice: number; imageUrl: string | null; pdfUrl: string; isActive: boolean;
}) {
  return prisma.storeProduct.create({ data: { tenantId, ...input } });
}

export async function updateStoreProductForTenant(tenantId: string, id: string, input: {
  title?: string; description?: string; price?: number; costPrice?: number; imageUrl?: string | null; pdfUrl?: string | null; isActive?: boolean;
}) {
  return prisma.storeProduct.updateMany({ where: { id, tenantId }, data: input });
}

export async function deleteStoreProductForTenant(tenantId: string, id: string) {
  return prisma.storeProduct.deleteMany({ where: { id, tenantId } });
}

export async function getStorePurchasesForTenantStudent(tenantId: string, userId: string) {
  return prisma.userStorePurchase.findMany({ where: { tenantId, userId }, select: { productId: true } });
}

/** Admin reporting stays inside one tenant even though User identity is global. */
export async function getStoreAdminReportingForTenant(tenantId: string) {
  const purchases = await prisma.userStorePurchase.findMany({
    where: { tenantId, product: { tenantId } },
    include: { user: { select: { name: true, email: true } }, product: { select: { title: true, costPrice: true } } },
    orderBy: { createdAt: "desc" },
  });
  const byProduct = new Map<string, { productId: string; productTitle: string; unitsSold: number; revenue: number; costTotal: number; profit: number }>();
  for (const purchase of purchases) {
    const price = Number(purchase.pricePaid);
    const cost = Number(purchase.product.costPrice);
    const current = byProduct.get(purchase.productId) ?? { productId: purchase.productId, productTitle: purchase.product.title, unitsSold: 0, revenue: 0, costTotal: 0, profit: 0 };
    current.unitsSold += 1; current.revenue += price; current.costTotal += cost; current.profit += price - cost;
    byProduct.set(purchase.productId, current);
  }
  const revenue = purchases.reduce((sum, purchase) => sum + Number(purchase.pricePaid), 0);
  const totalCost = purchases.reduce((sum, purchase) => sum + Number(purchase.product.costPrice), 0);
  return {
    purchases: purchases.map((purchase) => ({ purchaseId: purchase.id, userId: purchase.userId, studentName: purchase.user.name ?? "", studentEmail: purchase.user.email ?? "", productId: purchase.productId, productTitle: purchase.product.title, pricePaid: Number(purchase.pricePaid), createdAt: purchase.createdAt.toISOString() })),
    stats: { purchasesCount: purchases.length, buyersCount: new Set(purchases.map((purchase) => purchase.userId)).size, soldProductsCount: byProduct.size, revenue, totalCost, totalProfit: revenue - totalCost, profitMarginPercent: revenue ? ((revenue - totalCost) / revenue) * 100 : null, byProduct: [...byProduct.values()] },
  };
}

export type TenantSubscriptionPlanDto = {
  id: string; name: string; description: string; imageUrl: string | null; durationKind: string; price: number; isActive: boolean; sortOrder: number;
};

function planDto(plan: { id: string; name: string; description: string; imageUrl: string | null; durationKind: string; price: { toString(): string }; isActive: boolean; sortOrder: number }): TenantSubscriptionPlanDto {
  return { ...plan, price: Number(plan.price) };
}

export async function listSubscriptionPlansForTenant(tenantId: string, activeOnly = false): Promise<TenantSubscriptionPlanDto[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { tenantId, ...(activeOnly ? { isActive: true } : {}) }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return plans.map(planDto);
}

export async function createSubscriptionPlanForTenant(tenantId: string, input: {
  name: string; description: string; imageUrl: string | null; durationKind: string; price: number; isActive: boolean;
}) {
  return prisma.subscriptionPlan.create({ data: { tenantId, ...input } });
}

export async function updateSubscriptionPlanForTenant(tenantId: string, id: string, input: {
  name?: string; description?: string; imageUrl?: string | null; durationKind?: string; price?: number; isActive?: boolean;
}) {
  return prisma.subscriptionPlan.updateMany({ where: { id, tenantId }, data: input });
}

export async function deleteSubscriptionPlanForTenant(tenantId: string, id: string) {
  return prisma.subscriptionPlan.deleteMany({ where: { id, tenantId } });
}

export type TenantStudentSubscriptionDto = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string | null;
  planName: string | null;
  pricePaid: number;
  expiresAtIso: string;
  createdAtIso: string;
  isActive: boolean;
};

export async function listTenantStudentSubscriptions(tenantId: string): Promise<TenantStudentSubscriptionDto[]> {
  const rows = await prisma.userPlatformSubscription.findMany({
    where: { tenantId },
    include: {
      user: { select: { name: true, email: true } },
      plan: { select: { name: true } },
    },
    orderBy: [{ expiresAt: "desc" }, { createdAt: "desc" }],
  });
  const now = Date.now();
  return rows.map((r) => {
    const expDate = r.expiresAt;
    const creDate = r.createdAt;
    return {
      id: r.id,
      userId: r.userId,
      userName: r.user.name ?? "",
      userEmail: r.user.email ?? "",
      planId: r.planId,
      planName: r.plan?.name ?? null,
      pricePaid: Number(r.pricePaid),
      expiresAtIso: expDate.toISOString(),
      createdAtIso: creDate.toISOString(),
      isActive: expDate.getTime() > now,
    };
  });
}

export async function updateTenantStudentSubscriptionExpiry(tenantId: string, id: string, expiresAt: Date) {
  const result = await prisma.userPlatformSubscription.updateMany({
    where: { id, tenantId },
    data: { expiresAt },
  });
  if (result.count === 0) {
    throw new Error("سجل الاشتراك غير موجود");
  }
  return result;
}

export async function deleteTenantStudentSubscription(tenantId: string, id: string) {
  const result = await prisma.userPlatformSubscription.deleteMany({
    where: { id, tenantId },
  });
  if (result.count === 0) {
    throw new Error("سجل الاشتراك غير موجود");
  }
  return result;
}

