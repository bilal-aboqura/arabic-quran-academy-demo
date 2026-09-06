import Link from "next/link";
import type { TenantPublicSettings } from "@/modules/settings/tenant-settings";

/**
 * A deliberately small tenant-host home while the legacy, single-tenant home
 * sections are migrated. It prevents one tenant host from rendering another
 * customer's HomepageSetting-backed hero, courses, or footer content.
 */
export function TenantPublicHome({ settings, locale }: { settings: TenantPublicSettings; locale: "ar" | "en" }) {
  const name = locale === "en" ? settings.platformNameEn || settings.platformName : settings.platformName;
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <section dir={direction} className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center px-6 py-20">
      <div className="max-w-2xl space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--platform-primary,#0d9488)]">
          NexaClass
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{name}</h1>
        <p className="text-lg text-muted-foreground">
          {locale === "ar"
            ? "منصة تعليمية مستقلة على NexaClass. ستظهر الدورات والمحتوى بعد اكتمال ترحيلها إلى نطاق هذه المنصة."
            : "An independent learning platform on NexaClass. Courses and content will appear once they are migrated to this platform."}
        </p>
        <Link
          href="/courses"
          className="inline-flex rounded-md bg-[var(--platform-primary,#0d9488)] px-5 py-3 font-medium text-white transition-opacity hover:opacity-90"
        >
          {locale === "ar" ? "استعرض الدورات" : "Browse courses"}
        </Link>
        {Object.keys(settings.socialLinks).length > 0 ? (
          <nav className="flex flex-wrap gap-3 pt-2" aria-label={locale === "ar" ? "روابط المنصة" : "Platform links"}>
            {Object.entries(settings.socialLinks).map(([name, href]) => (
              <a key={name} href={href} rel="noopener noreferrer" target="_blank" className="text-sm underline underline-offset-4">
                {name}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
