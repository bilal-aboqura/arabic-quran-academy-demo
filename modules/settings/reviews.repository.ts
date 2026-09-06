import { prisma } from "@/lib/prisma";

export async function listReviewsForTenant(tenantId: string) {
  return prisma.review.findMany({ where: { tenantId }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export async function createReviewForTenant(tenantId: string, input: {
  text: string; textEn: string | null; authorName: string; authorTitle: string | null; authorTitleEn: string | null;
  avatarLetter: string | null; imageUrl: string | null; order: number;
}) {
  return prisma.review.create({ data: { tenantId, ...input } });
}
