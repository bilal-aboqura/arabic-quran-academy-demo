import { Prisma, type PageSectionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdministrator, type PlatformActor } from "@/modules/platform/authorization";
import { SYSTEM_WEBSITE_TEMPLATES, getSystemTemplate } from "./templates";

function jsonObject(value: unknown): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Prisma.JsonObject : {};
}

export function mapSemanticSections(
  definitions: ReadonlyArray<{ type: PageSectionType; variant: string; config: Prisma.JsonObject }>,
  existing: ReadonlyArray<{ type: PageSectionType; config: unknown }>,
) {
  const previous = new Map<PageSectionType, Prisma.JsonObject>();
  for (const item of existing) if (!previous.has(item.type)) previous.set(item.type, jsonObject(item.config));
  return definitions.map((item, sortOrder) => ({
    type: item.type, variant: item.variant, sortOrder, enabled: true,
    config: { ...item.config, ...(previous.get(item.type) ?? {}) } as Prisma.JsonObject,
  }));
}

/** Idempotent and safe in production: this registers shared definitions only. */
export async function registerSystemWebsiteTemplates() {
  await prisma.$transaction(SYSTEM_WEBSITE_TEMPLATES.map((template) => prisma.websiteTemplate.upsert({
    where: { code: template.code },
    create: {
      code: template.code, name: template.name, nameAr: template.nameAr, description: template.description,
      category: template.category, version: template.version, isActive: true,
      defaultTheme: template.defaultTheme, defaultPages: [{ slug: "home", title: "الرئيسية", isHome: true }],
      defaultSections: template.sections, supportedFeatures: template.supportedFeatures,
    },
    update: {
      name: template.name, nameAr: template.nameAr, description: template.description, category: template.category,
      version: template.version, defaultTheme: template.defaultTheme,
      defaultPages: [{ slug: "home", title: "الرئيسية", isHome: true }],
      defaultSections: template.sections, supportedFeatures: template.supportedFeatures,
    },
  })));
}

export async function listWebsiteTemplates(options?: { activeOnly?: boolean }) {
  await registerSystemWebsiteTemplates();
  return prisma.websiteTemplate.findMany({
    where: options?.activeOnly === false ? undefined : { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export async function getWebsiteTemplateByCode(code: string, activeOnly = true) {
  await registerSystemWebsiteTemplates();
  return prisma.websiteTemplate.findFirst({ where: { code, ...(activeOnly ? { isActive: true } : {}) } });
}

export type BrandingInput = {
  siteName?: string; siteNameEn?: string | null; logoUrl?: string | null; faviconUrl?: string | null;
  heroImageUrl?: string | null; primaryColor?: string | null; secondaryColor?: string | null; accentColor?: string | null;
  fontPreference?: string | null; shortAbout?: string | null; seoTitle?: string | null; seoDescription?: string | null;
  phone?: string | null; whatsapp?: string | null; email?: string | null;
  facebook?: string | null; instagram?: string | null; tiktok?: string | null; youtube?: string | null;
};

function optionalString(value: string | null | undefined, max: number) {
  if (value === undefined) return undefined;
  const clean = value?.trim().slice(0, max) || null;
  return clean;
}

const colorPattern = /^#[0-9a-fA-F]{6}$/;
const safeFonts = new Set(["Cairo", "Tajawal", "Alexandria", "Noto Kufi Arabic", "Changa"]);

function normalizeBranding(input: BrandingInput) {
  for (const value of [input.primaryColor, input.secondaryColor, input.accentColor]) {
    if (value && !colorPattern.test(value)) throw new Error("INVALID_BRAND_COLOR");
  }
  if (input.fontPreference && !safeFonts.has(input.fontPreference)) throw new Error("UNSUPPORTED_FONT");
  return input;
}

export async function applyWebsiteTemplate(args: {
  actor: PlatformActor; tenantId: string; templateCode: string; branding?: BrandingInput; publish?: boolean; initializeOnly?: boolean;
}) {
  requirePlatformAdministrator(args.actor);
  normalizeBranding(args.branding ?? {});
  await registerSystemWebsiteTemplates();

  const [tenant, template] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: args.tenantId }, select: { id: true, name: true } }),
    prisma.websiteTemplate.findUnique({ where: { code: args.templateCode } }),
  ]);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  if (!template) throw new Error("TEMPLATE_NOT_FOUND");
  if (!template.isActive) throw new Error("TEMPLATE_INACTIVE");
  const definition = getSystemTemplate(template.code);
  if (!definition) throw new Error("TEMPLATE_DEFINITION_MISSING");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.site.findUnique({
      where: { tenantId: tenant.id },
      include: { template: { select: { code: true } }, pages: { include: { sections: { orderBy: { sortOrder: "asc" } } } } },
    });
    const home = existing?.pages.find((page) => page.isHome) ?? null;
    if (args.initializeOnly && existing?.templateId) return existing;
    if (existing?.templateId === template.id && existing.templateVersion === template.version && home?.sections.length) {
      await updateBranding(tx, tenant.id, args.branding ?? {});
      return existing;
    }

    const sectionPlan = mapSemanticSections(definition.sections, home?.sections ?? []);

    const site = existing
      ? await tx.site.update({ where: { id: existing.id }, data: {
          templateId: template.id, templateVersion: template.version, themeOverrides: {},
          ...(args.publish ? { status: "PUBLISHED", publishedAt: new Date() } : {}),
        } })
      : await tx.site.create({ data: {
          tenantId: tenant.id, templateId: template.id, templateVersion: template.version,
          status: args.publish ? "PUBLISHED" : "DRAFT", publishedAt: args.publish ? new Date() : null,
        } });

    const targetHome = home
      ? await tx.sitePage.update({ where: { id: home.id }, data: { isPublished: args.publish ?? home.isPublished } })
      : await tx.sitePage.create({ data: { siteId: site.id, slug: "home", title: "الرئيسية", isHome: true, isPublished: args.publish ?? true } });
    if (home) await tx.pageSection.deleteMany({ where: { pageId: home.id } });
    await tx.pageSection.createMany({ data: sectionPlan.map((item) => ({ pageId: targetHome.id, ...item })) });
    await updateBranding(tx, tenant.id, args.branding ?? {});

    const oldTemplate = existing?.template?.code ?? null;
    const action = oldTemplate ? "SITE_TEMPLATE_CHANGED" : "SITE_INITIALIZED_FROM_TEMPLATE";
    await tx.auditLog.create({ data: {
      tenantId: tenant.id, actorUserId: args.actor.userId, action, targetType: "SITE", targetId: site.id,
      metadata: { oldTemplate, newTemplate: template.code, version: template.version, platformAdminId: args.actor.administratorId },
    } });
    if (!oldTemplate) await tx.auditLog.create({ data: {
      tenantId: tenant.id, actorUserId: args.actor.userId, action: "SITE_TEMPLATE_APPLIED", targetType: "SITE", targetId: site.id,
      metadata: { oldTemplate: null, newTemplate: template.code, version: template.version, platformAdminId: args.actor.administratorId },
    } });
    return tx.site.findUnique({ where: { id: site.id }, include: { template: true, pages: { include: { sections: { orderBy: { sortOrder: "asc" } } } } } });
  });
}

async function updateBranding(tx: Prisma.TransactionClient, tenantId: string, input: BrandingInput) {
  const current = await tx.tenantSettings.findUnique({ where: { tenantId }, select: { contactDetails: true, socialLinks: true } });
  const contacts = jsonObject(current?.contactDetails);
  const socials = jsonObject(current?.socialLinks);
  const contactPatch = Object.fromEntries(Object.entries({ phone: input.phone, whatsapp: input.whatsapp, email: input.email }).filter(([, value]) => value !== undefined));
  const socialPatch = Object.fromEntries(Object.entries({ facebook: input.facebook, instagram: input.instagram, tiktok: input.tiktok, youtube: input.youtube }).filter(([, value]) => value !== undefined));
  const data = {
    ...(input.siteName !== undefined ? { platformName: optionalString(input.siteName, 160) } : {}),
    ...(input.siteNameEn !== undefined ? { platformNameEn: optionalString(input.siteNameEn, 160) } : {}),
    ...(input.logoUrl !== undefined ? { logoUrl: optionalString(input.logoUrl, 2000) } : {}),
    ...(input.faviconUrl !== undefined ? { faviconUrl: optionalString(input.faviconUrl, 2000) } : {}),
    ...(input.heroImageUrl !== undefined ? { heroImageUrl: optionalString(input.heroImageUrl, 2000) } : {}),
    ...(input.primaryColor !== undefined ? { primaryColor: input.primaryColor } : {}),
    ...(input.secondaryColor !== undefined ? { secondaryColor: input.secondaryColor } : {}),
    ...(input.accentColor !== undefined ? { accentColor: input.accentColor } : {}),
    ...(input.fontPreference !== undefined ? { fontPreference: input.fontPreference } : {}),
    ...(input.shortAbout !== undefined ? { shortAbout: optionalString(input.shortAbout, 4000) } : {}),
    ...(input.seoTitle !== undefined ? { seoTitle: optionalString(input.seoTitle, 160) } : {}),
    ...(input.seoDescription !== undefined ? { seoDescription: optionalString(input.seoDescription, 500) } : {}),
    ...(Object.keys(contactPatch).length ? { contactDetails: { ...contacts, ...contactPatch } } : {}),
    ...(Object.keys(socialPatch).length ? { socialLinks: { ...socials, ...socialPatch } } : {}),
  } satisfies Prisma.TenantSettingsUncheckedUpdateInput;
  await tx.tenantSettings.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
}

export async function publishTenantWebsite(args: { actor: PlatformActor; tenantId: string }) {
  requirePlatformAdministrator(args.actor);
  const site = await prisma.site.findUnique({ where: { tenantId: args.tenantId } });
  if (!site) throw new Error("SITE_NOT_FOUND");
  return prisma.$transaction([
    prisma.site.update({ where: { id: site.id }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    prisma.sitePage.updateMany({ where: { siteId: site.id, isHome: true }, data: { isPublished: true } }),
  ]);
}
