import { prisma } from "@/lib/prisma";
import { canTenant } from "@/modules/tenants/authorization";
import type { TenantActor } from "@/modules/tenants/types";
import { saveContentSchema } from "./content-config";

export async function saveManagedContent(actor: TenantActor, input: unknown) {
  if (!canTenant(actor, "MANAGE_WEBSITE")) throw new Error("FORBIDDEN");
  const values = saveContentSchema.parse(input);
  if (new Set(values.sections.map(section => section.id)).size !== values.sections.length) throw new Error("INVALID_SECTION_SET");
  return prisma.$transaction(async tx => {
    const page = await tx.sitePage.findFirst({ where: { id: values.pageId, isHome: true, site: { tenantId: actor.tenantId, templateId: { not: null } } }, include: { sections: true } });
    if (!page) throw new Error("PAGE_NOT_FOUND");
    if (page.sections.length !== values.sections.length || page.sections.some(section => !values.sections.some(item => item.id === section.id))) throw new Error("INVALID_SECTION_SET");
    for (const [sortOrder, section] of values.sections.entries()) {
      const existing = page.sections.find(item => item.id === section.id)!;
      const previous = existing.config && typeof existing.config === "object" && !Array.isArray(existing.config) ? existing.config : {};
      const result = await tx.pageSection.updateMany({ where: { id: section.id, pageId: page.id, updatedAt: new Date(section.updatedAt) }, data: { enabled: section.enabled, sortOrder, config: { ...previous, ...section.config } } });
      if (result.count !== 1) throw new Error("CONTENT_CONFLICT");
    }
    return tx.pageSection.findMany({ where: { pageId: page.id }, orderBy: { sortOrder: "asc" } });
  });
}
