"use client";

import Link from "next/link";
import { useState } from "react";
import { TemplateSiteRenderer } from "@/components/tenant/TemplateSiteRenderer";
import type { TenantPublicSettings } from "@/modules/settings/tenant-settings";
import type { TemplateDemoPreset } from "@/modules/sites/templates";

type ViewportMode = "desktop" | "tablet" | "mobile";

export function TemplatePreviewStudio({
  template,
  demoPreset,
  page,
  tenantId,
}: {
  template: { code: string; name: string; nameAr: string; version: number; category: string };
  demoPreset: TemplateDemoPreset;
  page: {
    title: string;
    site: {
      template: { code: string; version: number; defaultTheme: unknown };
      templateVersion: number;
      themeOverrides: unknown;
    };
    sections: Array<{ id: string; type: string; variant: string; config: unknown }>;
  };
  tenantId?: string;
}) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [locale, setLocale] = useState<"ar" | "en">(template.code === 'global-arabic-quran' ? 'en' : 'ar');
  const [primaryColor, setPrimaryColor] = useState(demoPreset.primaryColor);

  const settings: TenantPublicSettings = {
    tenantId: "demo-tenant",
    tenantSlug: "demo-academy",
    platformName: demoPreset.siteName,
    platformNameEn: demoPreset.platformNameEn,
    primaryColor: primaryColor,
    secondaryColor: demoPreset.secondaryColor,
    accentColor: demoPreset.accentColor,
    logoUrl: null,
    faviconUrl: null,
    heroImageUrl: demoPreset.heroImageUrl,
    fontPreference: "Cairo",
    shortAbout: demoPreset.about,
    seoTitle: `${demoPreset.siteName} | المنصة الرسمية`,
    seoDescription: demoPreset.about,
    contactDetails: template.code === 'global-arabic-quran' ? {} : {
      phone: "+201000000000",
      whatsapp: "+201000000000",
      email: "contact@academy.com",
    },
    defaultLocale: locale,
    socialLinks: {
      Telegram: "https://t.me/demo",
      YouTube: "https://youtube.com/demo",
      Facebook: "https://facebook.com/demo",
    },
  };

  const courses = demoPreset.courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    titleAr: c.titleAr,
    shortDesc: c.shortDesc,
    shortDescEn: c.shortDescEn,
    imageUrl: null,
    price: c.price,
    category: c.category,
    badge: c.badge,
  }));

  const content = {
    categories: demoPreset.categories,
    teachers: demoPreset.teachers,
    testimonials: demoPreset.testimonials,
    stats: demoPreset.stats,
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Studio Top Control Bar */}
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2 backdrop-blur-md">
        {/* Left: Back Link & Template Info */}
        <div className="flex items-center gap-3">
          <Link
            href={`/platform-admin/templates${tenantId ? `?tenantId=${tenantId}` : ""}`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
          >
            ← العودة للقوالب
          </Link>
          <div className="hidden sm:block">
            <strong className="text-sm font-black text-white">{template.nameAr}</strong>
            <span className="mx-2 text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-400">{template.name}</span>
          </div>
        </div>

        {/* Center: Device Viewport Switcher */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            onClick={() => setViewport("desktop")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
              viewport === "desktop" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
            title="Desktop 100%"
          >
            🖥️ <span className="hidden md:inline">سطح المكتب</span>
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
              viewport === "tablet" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
            title="Tablet 768px"
          >
            📱 <span className="hidden md:inline">تابلت (768px)</span>
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
              viewport === "mobile" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
            title="Mobile 390px"
          >
            📱 <span className="hidden md:inline">هاتف (390px)</span>
          </button>
        </div>

        {/* Right: Language & Color Controls */}
        <div className="flex items-center gap-2.5">
          {/* RTL / LTR Toggle */}
          <button
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 hover:border-slate-500"
          >
            {locale === "ar" ? "العربية (RTL)" : "English (LTR)"}
          </button>

          {/* Color Preview Swatch */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
            <span className="text-[10px] text-slate-400">اللون:</span>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
              title="تغيير لون العلامة التجارية التجريبي"
            />
          </div>

          {/* Tenant Apply Button */}
          {tenantId ? (
            <Link
              href={`/platform-admin/templates?tenantId=${tenantId}&apply=${template.code}`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-500"
            >
              تطبيق على الأكاديمية
            </Link>
          ) : null}
        </div>
      </header>

      {/* Frame / Viewport Container */}
      <div className="flex-1 overflow-auto bg-slate-900 p-2 sm:p-4 md:p-6">
        <div
          className={`mx-auto transition-all duration-300 ${
            viewport === "desktop"
              ? "w-full min-h-full rounded-none"
              : viewport === "tablet"
              ? "w-[768px] min-h-[950px] rounded-2xl border-4 border-slate-700 shadow-2xl overflow-hidden"
              : "w-[390px] min-h-[820px] rounded-3xl border-4 border-slate-700 shadow-2xl overflow-hidden"
          }`}
          style={{ background: "#ffffff" }}
        >
          <TemplateSiteRenderer
            page={page}
            settings={settings}
            courses={courses}
            content={content}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}
