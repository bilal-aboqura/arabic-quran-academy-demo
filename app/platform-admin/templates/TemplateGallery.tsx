"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Template = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  description: string;
  category: string;
  version: number;
  isActive: boolean;
};

const TEMPLATE_METADATA: Record<
  string,
  {
    themeColor: string;
    accentColor: string;
    vibeBadge: string;
    targetAudience: string;
    uxHighlights: string[];
  }
> = {
  'global-arabic-quran': { themeColor: '#174f40', accentColor: '#b59967', vibeBadge: 'أكاديمية عالمية', targetAudience: 'العربية والقرآن للناطقين بغير العربية', uxHighlights: ['English-first with Arabic RTL', 'Private lessons and configurable trial booking', 'Published programs and tenant teacher profiles', 'A clear, mobile-friendly learning journey'] },
  "math-classroom": {
    themeColor: "#d8133a", accentColor: "#d8133a", vibeBadge: "افتكاسة الماث", targetAudience: "مدرسو الرياضيات • الإعدادية والثانوية",
    uxHighlights: ["صورة مدرس ورموز رياضية عائمة", "مراحل دراسية مصورة للوصول إلى الدورات", "ألوان حمراء وبيضاء وأزرار تسجيل واضحة", "بحث وتصفية وتجربة عربية متجاوبة"],
  },
  "personal-teacher": {
    themeColor: "#0f766e",
    accentColor: "#f59e0b",
    vibeBadge: "تعلم شخصي بلمسة ودودة",
    targetAudience: "مدرس واحد • شرح ومراجعات ودروس خصوصية",
    uxHighlights: [
      "إبراز مكانة وسيرة المعلم وخبرته الميدانية",
      "زر حجز واستشارة سريعة عبر واتساب مباشرة",
      "بطاقات قصص نجاح وتحول درجات الطلاب",
      "بحث سريع في الدورات وروابط واضحة للتسجيل",
    ],
  },
  "modern-academy": {
    themeColor: "#2563eb",
    accentColor: "#38bdf8",
    vibeBadge: "أكاديمية منظمة وواضحة",
    targetAudience: "مجموعة مدرسين • مواد وصفوف دراسية",
    uxHighlights: [
      "شريط تنبيه وإعلانات أكاديمية رسمي للفصل الجديد",
      "مسار فرز سريع للأقسام والمواد مع عدد الكورسات",
      "شبكة كادر التدريس وبطاقات تعريف الأساتذة والمشرفين",
      "قائمة هاتف واضحة ودخول سريع للطالب",
    ],
  },
  "premium-dark": {
    themeColor: "#00f0ff",
    accentColor: "#38bdf8",
    vibeBadge: "تعلم مركز بتصميم داكن",
    targetAudience: "مدرس فيزياء أو رياضيات • إعدادي وثانوي",
    uxHighlights: [
      "ألوان داكنة هادئة ونصوص عالية التباين",
      "مساحة بارزة للتعريف بالمعلم وأول دورة",
      "بحث في الدورات وتصفية حسب المادة",
      "أسئلة شائعة قابلة للتوسيع بلوحة المفاتيح",
    ],
  },
  "clean-education": {
    themeColor: "#0d9488",
    accentColor: "#f97316",
    vibeBadge: "مساحة هادئة للتعلم",
    targetAudience: "مدرس لغات • تأسيس وشرح المنهج",
    uxHighlights: [
      "مساحات بيضاء مدروسة وراحة بصرية خالية من التشتت",
      "منهجية الـ 3 خطوات لرحلة التعلم السلس",
      "بطاقات دورات واضحة بأسعارها ووصفها",
      "تقييمات وآراء طلاب هادئة مع معايير ثقة شفافة",
    ],
  },
  "course-funnel": {
    themeColor: "#e11d48",
    accentColor: "#f59e0b",
    vibeBadge: "مسار واضح لاختيار الدورة",
    targetAudience: "إطلاق دورات كبرى • معسكرات مكثفة • باقات موحدة",
    uxHighlights: [
      "مقدمة واضحة للدورة مع التعريف بالمعلم",
      "رابط مباشر لاستكشاف المنهج قبل التسجيل",
      "عرض السعر الفعلي للدورة مع دعم الدورات المجانية",
      "خطوة تسجيل واضحة ومساعدة في اختيار الدورة",
    ],
  },
  "bold-youth": {
    themeColor: "#0891b2",
    accentColor: "#0f766e",
    vibeBadge: "أكاديمية شبابية بلمسة سماوية",
    targetAudience: "ثانوية عامة • جيل Z • مراجعات سريعة وكبسولات",
    uxHighlights: [
      "مقدمة مركزية بتدرجات سماوية وزرقاء",
      "بطاقات المدرسين ثم إحصاءات مجتمع التعلم",
      "بحث وتصفية للدورات وروابط تسجيل مباشرة",
      "مظهر فاتح وداكن مع تجربة هاتف متكاملة",
    ],
  },
};

export function TemplateGallery({ templates }: { templates: Template[] }) {
  const params = useSearchParams();
  const tenantId = params.get("tenantId");
  const router = useRouter();
  const [category, setCategory] = useState("ALL");
  const [busy, setBusy] = useState("");

  const categories = [
    { id: "ALL", label: `جميع القوالب (${templates.length})` },
    { id: "Individual teacher", label: "المعلم الشخصي" },
    { id: "Multi-teacher academy", label: "الأكاديمية الحديثة" },
    { id: "Science & technical", label: "بريميوم الداكن (STEM)" },
    { id: "Languages & broad education", label: "التعليم النظيف (لغات)" },
    { id: "Single offer", label: "مسار بيع الدورة" },
    { id: "Gen-Z secondary", label: "الشباب الجريء" },
    { id: "Math & school stages", label: "افتكاسة الماث" },
  ];

  async function apply(template: Template) {
    if (!tenantId) return router.push(`/platform-admin/tenants?template=${template.code}`);
    if (
      !confirm(
        `تطبيق قالب "${template.nameAr}" على هذه الأكاديمية؟ سيتم الاحتفاظ بكافة بيانات الدورات والطلاب والمدرسين والدومين والألوان.`
      )
    )
      return;

    setBusy(template.code);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}/website`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateCode: template.code, publish: true }),
      });
      const data = await res.json();
      setBusy("");
      if (!res.ok) return alert(data.error || "تعذر تطبيق القالب");
      router.push(`/platform-admin/tenants/${tenantId}?website=updated`);
      router.refresh();
    } catch {
      setBusy("");
      alert("فشل الاتصال بالخادم");
    }
  }

  return (
    <div className="space-y-8">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item.id}
            onClick={() => setCategory(item.id)}
            className={`rounded-xl px-4 py-2 text-xs font-black transition-all ${
              category === item.id
                ? "bg-[var(--color-primary)] text-white shadow-md"
                : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {templates
          .filter((t) => category === "ALL" || t.category === category)
          .map((template) => {
            const meta = TEMPLATE_METADATA[template.code] || {
              themeColor: "#2563eb",
              accentColor: "#38bdf8",
              vibeBadge: "قالب متكامل",
              targetAudience: "متعدد الاستخدامات",
              uxHighlights: ["تصميم عربي أصيل", "متجاوب مع كافة الأجهزة"],
            };

            return (
              <article
                key={template.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-all duration-300 hover:shadow-xl hover:border-[var(--color-primary)]/40"
              >
                {/* Visual Art Direction Preview Frame */}
                <div className="relative aspect-[1.44] w-full overflow-hidden border-b border-[var(--color-border)] bg-slate-900">
                  {TEMPLATE_METADATA[template.code] && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={`/template-previews/${template.code}.png`} alt={`معاينة تصميم ${template.nameAr}`} loading="lazy" width={1440} height={1000} className="h-full w-full object-cover object-top" />
                  )}

                  {/* Badges Overlay */}
                  <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between text-[11px] font-black">
                    <span className="rounded-lg bg-black/75 px-2.5 py-1 text-white backdrop-blur-md shadow-sm">
                      {meta.vibeBadge}
                    </span>
                    <span className="rounded-lg bg-black/75 px-2 py-1 font-mono text-white backdrop-blur-md shadow-sm">
                      v{template.version}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-[var(--color-foreground)]">
                        {template.nameAr}
                      </h2>
                      <p className="text-xs font-bold text-[var(--color-muted)]">
                        {template.name}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[11px] font-black text-[var(--color-primary)]">
                      {template.category}
                    </span>
                  </div>

                  {/* Target Audience */}
                  <div className="mt-3 rounded-lg bg-[var(--color-border)]/30 px-3 py-1.5 text-xs font-bold text-[var(--color-foreground)]">
                    🎯 <span className="text-[var(--color-muted)]">الجمهور:</span> {meta.targetAudience}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-[var(--color-muted)]">
                    {template.description}
                  </p>

                  {/* Key UX Highlights */}
                  <div className="mt-4 flex-1 space-y-1.5 border-t border-[var(--color-border)]/50 pt-3">
                    <p className="text-[11px] font-black text-[var(--color-foreground)]">
                      أبرز مزايا تجربة المستخدم (UX):
                    </p>
                    <ul className="space-y-1 text-xs text-[var(--color-muted)]">
                      {meta.uxHighlights.map((hl, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="text-emerald-500 font-black">✔</span>
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex gap-3 pt-4 border-t border-[var(--color-border)]">
                    <Link
                      href={`/platform-admin/templates/preview/${template.code}${
                        tenantId ? `?tenantId=${tenantId}` : ""
                      }`}
                      className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 text-center text-xs font-black transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                    >
                      معاينة الاستوديو ↗
                    </Link>
                    <button
                      disabled={!template.isActive || busy === template.code}
                      onClick={() => void apply(template)}
                      className="flex-1 rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-black text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
                    >
                      {busy === template.code
                        ? "جاري التطبيق…"
                        : tenantId
                        ? "تطبيق على الأكاديمية"
                        : "استخدم القالب"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
      </div>
    </div>
  );
}
