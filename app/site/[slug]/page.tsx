import { headers } from "next/headers";
import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import { getLocaleFromCookie } from "@/lib/i18n/server";
import { listPublishedCoursesForTenant } from "@/modules/courses/repository";
import { getTenantPublicSettings } from "@/modules/settings/tenant-settings";
import { getPublishedSitePageForTenant } from "@/modules/sites/repository";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { SitePageRenderer } from "@/components/tenant/SitePageRenderer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TenantSitePage({ params }: { params: Promise<{ slug: string }> }) {
  unstable_noStore();
  const [{ slug }, requestHeaders, locale] = await Promise.all([params, headers(), getLocaleFromCookie()]);
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) notFound();
  const [page, settings, courses] = await Promise.all([
    getPublishedSitePageForTenant(tenant.tenantId, slug),
    getTenantPublicSettings(tenant.tenantId),
    listPublishedCoursesForTenant(tenant.tenantId),
  ]);
  if (!page || !settings) notFound();
  return <SitePageRenderer
    page={page}
    locale={locale}
    courses={courses.map((course) => ({ id: course.id, slug: course.slug, title: course.title, titleAr: course.titleAr, shortDesc: course.shortDesc, shortDescEn: course.shortDescEn }))}
  />;
}
