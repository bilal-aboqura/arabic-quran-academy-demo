import { Suspense } from "react";
import { listWebsiteTemplates } from "@/modules/sites/template-service";
import { TemplateGallery } from "./TemplateGallery";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listWebsiteTemplates({ activeOnly: false });

  return (
    <div className="space-y-8 pb-12">
      {/* Executive Header */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-primary)]/5 p-6 sm:p-8 md:p-10 shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3.5 py-1 text-xs font-black text-teal-600 dark:text-teal-400">
            <span>✨ هويات بصرية وتجربة مستخدم مخصصة</span>
            <span>•</span>
            <span>Managed Architecture</span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-[var(--color-foreground)]">
            معرض قوالب المواقع التعليمية
          </h1>

          <p className="mt-3 text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
            ستة قوالب متكاملة صُممت بهويات بصرية وتجارب استخدام متقدمة (Bespoke Art Direction & UX) تلائم كافة التخصصات والأنماط التعليمية: من المعلم المستقل والأكاديميات الكبرى، إلى المواد العلمية واللغات ومسارات البيع السريع وثانوية الجيل الجديد.
          </p>

          {/* Core Guarantees Chips */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold text-[var(--color-foreground)]">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 shadow-sm">
              🎨 6 هويات بصرية وتكوينات فريدة
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 shadow-sm">
              🌍 عربي أصيل بالكامل (Arabic-First RTL)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 shadow-sm">
              📱 متجاوب فائق السرعة (Desktop, Tablet, Mobile)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 shadow-sm">
              🔒 عزل تام للبيانات والتخصيص
            </span>
          </div>
        </div>
      </div>

      {/* Gallery Component */}
      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-96 animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            ))}
          </div>
        }
      >
        <TemplateGallery templates={templates} />
      </Suspense>
    </div>
  );
}
