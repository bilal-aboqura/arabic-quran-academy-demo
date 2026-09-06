import { listSitePagesForTenant } from "@/modules/sites/repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { WebsiteBuilder } from "./WebsiteBuilder";
import { SimpleWebsiteSettings } from "./SimpleWebsiteSettings";
import { WebsiteContentEditor } from "./WebsiteContentEditor";
import { getTenantSaaSCapabilities } from "@/modules/platform/saas.repository";
import { getTenantSettingsForAdmin } from "@/modules/settings/admin.repository";
import { getTenantPublicSettings } from "@/modules/settings/tenant-settings";
import { getTenantWebsiteContent } from "@/modules/sites/public-data";
import { listPublishedCoursesForTenant } from "@/modules/courses/repository";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

function editorConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function WebsiteBuilderPage() {
  const actor = await requireDashboardTenantActor("MANAGE_WEBSITE");
  const [capabilities, settings, domain, publicSettings, content, courses, home] = await Promise.all([
    getTenantSaaSCapabilities(actor.tenantId),
    getTenantSettingsForAdmin(actor.tenantId),
    prisma.tenantDomain.findFirst({ where: { tenantId: actor.tenantId, isPrimary: true, status: "ACTIVE" }, select: { hostname: true } }),
    getTenantPublicSettings(actor.tenantId),
    getTenantWebsiteContent(actor.tenantId),
    listPublishedCoursesForTenant(actor.tenantId),
    prisma.sitePage.findFirst({
      where: { isHome: true, site: { tenantId: actor.tenantId, templateId: { not: null } } },
      include: { site: { select: { template: { select: { code: true, version: true, defaultTheme: true } }, templateVersion: true, themeOverrides: true } }, sections: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  const currentHost = (await headers()).get("host") || "localhost:3000";
  const port = /:(\d+)$/.exec(currentHost)?.[1] || "3000";
  const websiteUrl = domain ? domain.hostname.endsWith(".localhost") ? `http://${domain.hostname}:${port}` : `https://${domain.hostname}` : "/";
  const contentEditor = home && publicSettings ? <WebsiteContentEditor
    pageId={home.id}
    published={home.isPublished}
    initialSections={home.sections.map(section => ({ id: section.id, type: section.type, variant: section.variant, enabled: section.enabled, config: editorConfig(section.config), updatedAt: section.updatedAt.toISOString() }))}
    preview={{
      page: { title: home.title, site: home.site, sections: home.sections.map(section => ({ id: section.id, type: section.type, variant: section.variant, config: editorConfig(section.config) })) },
      settings: publicSettings,
      courses: courses.map(course => ({ id: course.id, slug: course.slug, title: course.title, titleAr: course.titleAr, shortDesc: course.shortDesc, shortDescEn: course.shortDescEn, imageUrl: course.imageUrl, price: course.price.toString(), category: course.category })),
      content,
      locale: "ar",
    }}
  /> : null;
  if (!capabilities.features.advancedWebsiteBuilder) return <div className="space-y-10"><SimpleWebsiteSettings initialSettings={settings} websiteUrl={websiteUrl}/>{contentEditor}</div>;
  const pages = await listSitePagesForTenant({ tenantId: actor.tenantId, actor });
  return <div className="space-y-10">{contentEditor}<WebsiteBuilder initialPages={pages.map((page) => ({
    ...page,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
    sections: page.sections.map((section) => ({ ...section, config: editorConfig(section.config), createdAt: section.createdAt.toISOString(), updatedAt: section.updatedAt.toISOString() })),
  }))} /></div>;
}
