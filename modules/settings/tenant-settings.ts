import { prisma } from "@/lib/prisma";

/**
 * The intentionally small, safe public settings surface for a tenant.  It is
 * separate from the legacy HomepageSetting singleton: that singleton cannot
 * be used to brand an arbitrary host in a multi-tenant deployment.
 */
export type TenantPublicSettings = {
  tenantId: string;
  tenantSlug: string;
  platformName: string;
  platformNameEn: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  heroImageUrl: string | null;
  fontPreference: string | null;
  shortAbout: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  contactDetails: Record<string, string>;
  defaultLocale: string;
  socialLinks: Record<string, string>;
};

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Only allow absolute web links in public configuration. */
function safeWebUrl(value: unknown): string | null {
  const raw = nonEmptyString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function publicSocialLinks(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, url]) => [key.trim().toLowerCase(), safeWebUrl(url)] as const)
      .filter(([key, url]) => /^[a-z][a-z0-9_-]{0,31}$/.test(key) && url !== null),
  ) as Record<string, string>;
}

/**
 * Returns only the current tenant's public branding. No fallback reads the
 * global legacy HomepageSetting row, including when a TenantSettings record
 * has not been created yet.
 */
export async function getTenantPublicSettings(tenantId: string): Promise<TenantPublicSettings | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      settings: {
        select: {
          platformName: true,
          platformNameEn: true,
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          logoUrl: true,
          faviconUrl: true,
          heroImageUrl: true,
          fontPreference: true,
          shortAbout: true,
          seoTitle: true,
          seoDescription: true,
          contactDetails: true,
          defaultLocale: true,
          socialLinks: true,
        },
      },
    },
  });
  if (!tenant) return null;

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    platformName: nonEmptyString(tenant.settings?.platformName) ?? tenant.name,
    platformNameEn: nonEmptyString(tenant.settings?.platformNameEn),
    primaryColor: nonEmptyString(tenant.settings?.primaryColor),
    secondaryColor: nonEmptyString(tenant.settings?.secondaryColor),
    accentColor: nonEmptyString(tenant.settings?.accentColor),
    logoUrl: safeWebUrl(tenant.settings?.logoUrl) ?? (nonEmptyString(tenant.settings?.logoUrl)?.startsWith("/") ? nonEmptyString(tenant.settings?.logoUrl) : null),
    faviconUrl: safeWebUrl(tenant.settings?.faviconUrl),
    heroImageUrl: safeWebUrl(tenant.settings?.heroImageUrl) ?? (nonEmptyString(tenant.settings?.heroImageUrl)?.startsWith("/") ? nonEmptyString(tenant.settings?.heroImageUrl) : null),
    fontPreference: nonEmptyString(tenant.settings?.fontPreference),
    shortAbout: nonEmptyString(tenant.settings?.shortAbout),
    seoTitle: nonEmptyString(tenant.settings?.seoTitle),
    seoDescription: nonEmptyString(tenant.settings?.seoDescription),
    contactDetails: Object.fromEntries(Object.entries(tenant.settings?.contactDetails && typeof tenant.settings.contactDetails === "object" && !Array.isArray(tenant.settings.contactDetails) ? tenant.settings.contactDetails : {}).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : [])),
    defaultLocale: nonEmptyString(tenant.settings?.defaultLocale) ?? "ar",
    socialLinks: publicSocialLinks(tenant.settings?.socialLinks),
  };
}

export const __tenantSettingsTestables = { publicSocialLinks, safeWebUrl };
