import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Sans_Arabic, Outfit } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { getServerSession } from "next-auth";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";
import { StoreSplashProvider } from "@/components/StoreSplashProvider";
import { ForceLogoutGuard } from "@/components/ForceLogoutGuard";
import { authOptions } from "@/lib/auth";
import {
  getHomepageSettings,
  userHasActivePlatformSubscription,
  getLatestPlatformSubscriptionExpiry,
} from "@/lib/db";
import { normalizeHeroHex } from "@/lib/hero-bg";
import { getDir, makeTranslator } from "@/lib/i18n/core";
import { getLocaleFromCookie } from "@/lib/i18n/server";
import { LocaleProvider } from "@/components/LocaleProvider";
import { homepageDefaultForLocale } from "@/lib/homepage-default-for-locale";
import { pickLocalizedText } from "@/lib/i18n/localized-field";
import {
  HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR,
  HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR,
  HOMEPAGE_DEFAULT_FOOTER_TITLE_AR,
} from "@/lib/homepage-known-defaults";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { getTenantPublicSettings } from "@/modules/settings/tenant-settings";
import { getPublishedSiteHomeForTenant } from "@/modules/sites/repository";
import { SiteChrome } from "@/components/SiteChrome";
import { TemplateSiteRenderer } from "@/components/tenant/TemplateSiteRenderer";
import { getTenantWebsiteContent } from "@/modules/sites/public-data";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromCookie();
  const defaultTitle =
    locale === "ar"
      ? "منصتي التعليمية | دورات وتعلم أونلاين"
      : "My Learning Platform | Courses and Online Learning";
  const defaultDescription =
    locale === "ar"
      ? "منصة تعليمية حديثة لدورات البرمجة والتصميم والتطوير"
      : "A modern learning platform for programming, design, and development courses";
  const requestHeaders = await headers();
  const tenantContext = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (tenantContext) {
    const settings = await getTenantPublicSettings(tenantContext.tenantId);
    if (settings) {
      const name = locale === "en" ? settings.platformNameEn || settings.platformName : settings.platformName;
      return { title: name, description: defaultDescription };
    }
  }
  // The historic singleton remains a development-only compatibility bridge.
  // It must never brand an arbitrary production host.
  if (process.env.NODE_ENV === "production") return { title: "NexaClass", description: defaultDescription };
  try {
    const settings = await getHomepageSettings();
    const title = pickLocalizedText(locale, settings.pageTitle, settings.pageTitleEn) || defaultTitle;
    return { title, description: defaultDescription };
  } catch {
    return { title: defaultTitle, description: defaultDescription };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const requestHeaders = await headers();
  const tenantContext = await resolveTenantFromHostname(requestHeaders.get("host"));
  const tenantSettings = tenantContext ? await getTenantPublicSettings(tenantContext.tenantId) : null;
  const managedHome = tenantContext ? await getPublishedSiteHomeForTenant(tenantContext.tenantId) : null;
  const locale = await getLocaleFromCookie(managedHome?.site.template?.code === 'global-arabic-quran' ? 'en' : undefined);
  const dir = getDir(locale);
  const t = makeTranslator(locale);
  const hasManagedTemplateHome = Boolean(managedHome?.site.template);
  const websiteContent = hasManagedTemplateHome && tenantContext ? await getTenantWebsiteContent(tenantContext.tenantId) : null;
  const useLegacyGlobalSettings = !tenantContext && process.env.NODE_ENV !== "production";
  let platformName: string | null = null;
  let headerLogoUrl: string | null = null;
  let platformPrimaryColor: string | null = null;
  let footerTitle = t("footer.defaultTitle", "منصتي التعليمية");
  let footerTagline = t("footer.defaultTagline", "تعلم بأسلوب حديث ومنهجية واضحة");
  let footerCopyright = t("footer.defaultCopyright", "منصتي التعليمية. جميع الحقوق محفوظة.");
  try {
    if (tenantSettings) {
      platformName =
        pickLocalizedText(locale, tenantSettings.platformName, tenantSettings.platformNameEn) || tenantSettings.platformName;
      platformPrimaryColor = normalizeHeroHex(String(tenantSettings.primaryColor ?? "")) ?? null;
    } else if (useLegacyGlobalSettings) {
      const settings = await getHomepageSettings();
      platformName = pickLocalizedText(locale, settings.platformName, settings.platformNameEn) || null;
      headerLogoUrl = settings.headerLogoUrl ?? null;
      platformPrimaryColor = normalizeHeroHex(String(settings.primaryColor ?? "")) ?? null;
      const rawFooterTitle = pickLocalizedText(locale, settings.footerTitle, settings.footerTitleEn);
      const rawFooterTagline = pickLocalizedText(locale, settings.footerTagline, settings.footerTaglineEn);
      const rawFooterCopyright = pickLocalizedText(locale, settings.footerCopyright, settings.footerCopyrightEn);
      footerTitle = homepageDefaultForLocale(locale, rawFooterTitle, HOMEPAGE_DEFAULT_FOOTER_TITLE_AR, "footer.defaultTitle", t, "My Learning Platform");
      footerTagline = homepageDefaultForLocale(locale, rawFooterTagline, HOMEPAGE_DEFAULT_FOOTER_TAGLINE_AR, "footer.defaultTagline", t, "Learn with a modern and clear method");
      footerCopyright = homepageDefaultForLocale(locale, rawFooterCopyright, HOMEPAGE_DEFAULT_FOOTER_COPYRIGHT_AR, "footer.defaultCopyright", t, "My Learning Platform. All rights reserved.");
    }
  } catch {
    // استخدام الافتراضي في الهيدر والفوتر
  }

  let platformSubscriptionExpiryLabel: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (useLegacyGlobalSettings && session?.user?.role === "STUDENT" && session.user.id) {
      const active = await userHasActivePlatformSubscription(session.user.id);
      if (active) {
        const exp = await getLatestPlatformSubscriptionExpiry(session.user.id);
        if (exp) {
          platformSubscriptionExpiryLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(exp);
        } else {
          platformSubscriptionExpiryLabel = t("header.active", "نشط");
        }
      }
    }
  } catch {
    platformSubscriptionExpiryLabel = null;
  }

  return (
    <html lang={locale} dir={dir} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");document.documentElement.classList.add(t==="light"?"light":"dark");})();`,
          }}
        />
        {platformPrimaryColor ? (
          <style
            dangerouslySetInnerHTML={{
              __html: `:root{--platform-primary:${platformPrimaryColor};}`,
            }}
          />
        ) : null}
        </head>
      <body className={`${outfit.variable} ${ibmPlexSansArabic.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <NextTopLoader
          color={platformPrimaryColor ?? "#0d9488"}
          height={3}
          showSpinner={false}
          easing="ease"
          speed={300}
          shadow="0 0 10px rgba(13,148,136,0.4)"
        />
        <LocaleProvider locale={locale}>
          <SessionProvider>
            <StoreSplashProvider>
            <ForceLogoutGuard />
            <SiteChrome
              managedHome={hasManagedTemplateHome}
              managedPublicPage={managedHome && tenantSettings && websiteContent ? (
                <TemplateSiteRenderer page={managedHome} settings={tenantSettings} courses={[]} content={websiteContent} locale={locale}>{children}</TemplateSiteRenderer>
              ) : undefined}
              header={<Header platformName={platformName} headerLogoUrl={headerLogoUrl} platformSubscriptionExpiryLabel={platformSubscriptionExpiryLabel} />}
              footer={<Footer footerTitle={footerTitle} footerTagline={footerTagline} footerCopyright={footerCopyright} />}
            >
              {children}
            </SiteChrome>
            </StoreSplashProvider>
          </SessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
