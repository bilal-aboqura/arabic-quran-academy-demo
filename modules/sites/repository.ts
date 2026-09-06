import { PageSectionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canManageTenant } from "@/modules/tenants/authorization";
import type { TenantActor } from "@/modules/tenants/types";

const pageSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const variants: Record<PageSectionType, readonly string[]> = {
  HERO: ["split", "centered", "image-right", "portrait", "academy", "cinematic", "calm", "conversion", "dynamic"],
  COURSES: ["grid", "featured", "catalog", "spotlight", "clean", "primary-offer", "trending"], ABOUT: ["default", "image-left", "authority", "editorial", "poster"],
  STATS: ["cards", "inline", "band"], TEACHERS: ["grid", "featured", "roster"], TESTIMONIALS: ["cards", "carousel", "quotes", "spotlight", "dark", "simple", "funnel", "ticker"],
  FAQ: ["accordion", "columns", "minimal", "bold"], CONTACT: ["form", "compact", "clean", "final"], CTA: ["banner", "card", "personal", "academy", "cinematic", "offer", "bold"],
  CATEGORIES: ["rail", "pills", "blocks"], FEATURES: ["personal", "academy", "packages", "process", "benefits"],
  RESULTS: ["stories", "metrics", "proof", "bold"], VIDEO: ["curriculum"], SOCIAL_PROOF: ["authority", "deliverables"],
};

function assertManager(actor: TenantActor) { if (!canManageTenant(actor)) throw new Error("FORBIDDEN"); }
function assertSlug(slug: string) { if (!pageSlug.test(slug)) throw new Error("INVALID_PAGE_SLUG"); }
function assertSection(type: PageSectionType, variant: string, config: unknown) {
  if (!variants[type].includes(variant)) throw new Error("INVALID_SECTION_VARIANT");
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("INVALID_SECTION_CONFIG");
}

async function siteForTenant(tenantId: string) {
  return prisma.site.upsert({ where: { tenantId }, update: {}, create: { tenantId } });
}

export async function listSitePagesForTenant(args: { tenantId: string; actor: TenantActor }) {
  assertManager(args.actor);
  const site = await siteForTenant(args.tenantId);
  return prisma.sitePage.findMany({ where: { siteId: site.id }, include: { sections: { orderBy: { sortOrder: "asc" } } }, orderBy: [{ isHome: "desc" }, { createdAt: "asc" }] });
}

export async function createSitePageForTenant(args: { tenantId: string; actor: TenantActor; title: string; slug: string; isHome?: boolean; isPublished?: boolean }) {
  assertManager(args.actor); assertSlug(args.slug);
  if (!args.title.trim()) throw new Error("PAGE_TITLE_REQUIRED");
  const site = await siteForTenant(args.tenantId);
  return prisma.$transaction(async (tx) => {
    if (args.isHome) await tx.sitePage.updateMany({ where: { siteId: site.id, isHome: true }, data: { isHome: false } });
    return tx.sitePage.create({ data: { siteId: site.id, title: args.title.trim().slice(0, 160), slug: args.slug, isHome: args.isHome ?? false, isPublished: args.isPublished ?? false } });
  });
}

export async function createPageSectionForTenant(args: { tenantId: string; pageId: string; actor: TenantActor; type: PageSectionType; variant: string; config: Prisma.JsonObject }) {
  assertManager(args.actor); assertSection(args.type, args.variant, args.config);
  const page = await prisma.sitePage.findFirst({ where: { id: args.pageId, site: { tenantId: args.tenantId } }, select: { id: true } });
  if (!page) return null;
  const last = await prisma.pageSection.findFirst({ where: { pageId: page.id }, select: { sortOrder: true }, orderBy: { sortOrder: "desc" } });
  return prisma.pageSection.create({ data: { pageId: page.id, type: args.type, variant: args.variant, config: args.config, sortOrder: (last?.sortOrder ?? -1) + 1 } });
}

export async function reorderPageSectionsForTenant(args: { tenantId: string; pageId: string; actor: TenantActor; sectionIds: string[] }) {
  assertManager(args.actor);
  if (new Set(args.sectionIds).size !== args.sectionIds.length) return { error: "INVALID_SECTION_SET" as const };
  const current = await prisma.pageSection.findMany({ where: { pageId: args.pageId, page: { site: { tenantId: args.tenantId } } }, select: { id: true } });
  if (current.length !== args.sectionIds.length || current.some((section) => !args.sectionIds.includes(section.id))) return { error: "INVALID_SECTION_SET" as const };
  await prisma.$transaction(args.sectionIds.map((id, sortOrder) => prisma.pageSection.update({ where: { id }, data: { sortOrder } })));
  return { ok: true as const };
}

/** Update only a page owned by the active tenant. A home page remains unique
 * per site even while editors toggle it from different browser sessions. */
export async function updateSitePageForTenant(args: {
  tenantId: string; pageId: string; actor: TenantActor;
  title?: string; slug?: string; isHome?: boolean; isPublished?: boolean;
}) {
  assertManager(args.actor);
  if (args.slug !== undefined) assertSlug(args.slug);
  if (args.title !== undefined && !args.title.trim()) throw new Error("PAGE_TITLE_REQUIRED");
  const page = await prisma.sitePage.findFirst({
    where: { id: args.pageId, site: { tenantId: args.tenantId } },
    select: { id: true, siteId: true },
  });
  if (!page) return null;

  return prisma.$transaction(async (tx) => {
    if (args.isHome) {
      await tx.sitePage.updateMany({ where: { siteId: page.siteId, isHome: true, id: { not: page.id } }, data: { isHome: false } });
    }
    return tx.sitePage.update({
      where: { id: page.id },
      data: {
        ...(args.title !== undefined ? { title: args.title.trim().slice(0, 160) } : {}),
        ...(args.slug !== undefined ? { slug: args.slug } : {}),
        ...(args.isHome !== undefined ? { isHome: args.isHome } : {}),
        ...(args.isPublished !== undefined ? { isPublished: args.isPublished } : {}),
      },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });
  });
}

/** Section mutations always resolve the page through Site -> Tenant. Config
 * is JSON-only and variants remain tied to a small section-type allowlist. */
export async function updatePageSectionForTenant(args: {
  tenantId: string; sectionId: string; actor: TenantActor;
  type?: PageSectionType; variant?: string; config?: Prisma.JsonObject; enabled?: boolean;
}) {
  assertManager(args.actor);
  const section = await prisma.pageSection.findFirst({
    where: { id: args.sectionId, page: { site: { tenantId: args.tenantId } } },
    select: { id: true, type: true, variant: true, config: true },
  });
  if (!section) return null;
  const type = args.type ?? section.type;
  const variant = args.variant ?? section.variant;
  const config = args.config ?? (section.config as Prisma.JsonObject);
  assertSection(type, variant, config);
  return prisma.pageSection.update({
    where: { id: section.id },
    data: {
      ...(args.type !== undefined ? { type } : {}),
      ...(args.variant !== undefined ? { variant } : {}),
      ...(args.config !== undefined ? { config } : {}),
      ...(args.enabled !== undefined ? { enabled: args.enabled } : {}),
    },
  });
}

export async function deleteSitePageForTenant(args: { tenantId: string; pageId: string; actor: TenantActor }) {
  assertManager(args.actor);
  const page = await prisma.sitePage.findFirst({ where: { id: args.pageId, site: { tenantId: args.tenantId } }, select: { id: true } });
  if (!page) return false;
  await prisma.sitePage.delete({ where: { id: page.id } });
  return true;
}

export async function deletePageSectionForTenant(args: { tenantId: string; sectionId: string; actor: TenantActor }) {
  assertManager(args.actor);
  const section = await prisma.pageSection.findFirst({ where: { id: args.sectionId, page: { site: { tenantId: args.tenantId } } }, select: { id: true } });
  if (!section) return false;
  await prisma.pageSection.delete({ where: { id: section.id } });
  return true;
}

/** Public rendering selects only a published page belonging to the resolved tenant. */
export async function getPublishedSitePageForTenant(tenantId: string, slug: string) {
  return prisma.sitePage.findFirst({ where: { slug, isPublished: true, site: { tenantId } }, select: { id: true, slug: true, title: true, isHome: true, sections: { where: { enabled: true }, orderBy: { sortOrder: "asc" }, select: { id: true, type: true, variant: true, config: true, sortOrder: true } } } });
}

/** Home uses an explicit flag rather than a magic slug, so an editor may
 * rename its URL without accidentally changing the root tenant experience. */
export async function getPublishedSiteHomeForTenant(tenantId: string) {
  return prisma.sitePage.findFirst({ where: { isHome: true, isPublished: true, site: { tenantId, status: "PUBLISHED" } }, select: { id: true, slug: true, title: true, isHome: true, site: { select: { template: { select: { code: true, version: true, defaultTheme: true } }, templateVersion: true, themeOverrides: true } }, sections: { where: { enabled: true }, orderBy: { sortOrder: "asc" }, select: { id: true, type: true, variant: true, config: true, sortOrder: true } } } });
}
