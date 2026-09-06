"use client";

import { useEffect, useState, type ComponentProps } from "react";
import Link from "next/link";
import { TemplateSiteRenderer } from "@/components/tenant/TemplateSiteRenderer";
import { automaticSections, contentConfigSchema, sectionLabels } from "@/modules/sites/content-config";

type Preview = ComponentProps<typeof TemplateSiteRenderer>;
type Section = Preview["page"]["sections"][number] & { enabled: boolean; updatedAt: string; config: Record<string, unknown> };
const str = (value: unknown) => typeof value === "string" ? value : "";
const field = "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm";
const button = "min-h-11 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-40";

export function WebsiteContentEditor({ initialSections, pageId, published, preview }: { initialSections: Section[]; pageId: string; published: boolean; preview: Preview }) {
  const [sections, setSections] = useState(initialSections);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(id: string, config: Record<string, unknown>) {
    setSections(current => current.map(section => section.id === id ? { ...section, config: { ...section.config, ...config } } : section)); setDirty(true); setMessage("");
  }
  function move(index: number, direction: number) {
    setSections(current => { const next = [...current]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; }); setDirty(true);
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const values = sections.map(section => {
        const config = Object.fromEntries(Object.entries(section.config).filter(([key]) => key in contentConfigSchema.shape));
        return { id: section.id, updatedAt: section.updatedAt, enabled: section.enabled, config: contentConfigSchema.parse(config) };
      });
      const response = await fetch("/api/dashboard/site/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId, sections: values }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر الحفظ.");
      setSections(result.sections); setDirty(false); setMessage(published ? "تم حفظ المحتوى وتحديث الموقع." : "تم حفظ محتوى الصفحة غير المنشورة.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الحفظ. حاول مرة أخرى."); }
    finally { setBusy(false); }
  }
  return <section dir="rtl" className="space-y-5 border-t border-[var(--color-border)] pt-8" aria-labelledby="website-content-title">
    <div><h2 id="website-content-title" className="text-2xl font-bold">محتوى الموقع والأقسام</h2><p className="mt-2 text-sm text-[var(--color-muted)]">عدّل محتواك، رتّب الأقسام، وأخفِ ما لا تحتاج إليه. {published ? "الحفظ يطبق التغييرات على الموقع مباشرة؛ راجع المعاينة أولاً." : "هذه الصفحة غير منشورة؛ الحفظ يحدّث محتواها فقط."}</p></div>
    <div className="flex flex-wrap gap-3 text-sm"><Link href="/dashboard/courses" className={button}>إدارة الدورات</Link><Link href="/dashboard/categories" className={button}>إدارة الأقسام</Link><Link href="/dashboard/teachers" className={button}>إدارة المدرسين</Link><Link href="/dashboard/reviews" className={button}>إدارة آراء الطلاب</Link></div>
    <fieldset disabled={busy} className="space-y-3">
      {sections.map((section, index) => {
        const list = Array.isArray(section.config.items) ? section.config.items.map(item => item && typeof item === "object" ? item as Record<string, unknown> : {}) : [];
        const listEditable = section.type === "FAQ" || section.type === "FEATURES" || section.type === 'VIDEO';
        return <article key={section.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {section.type === 'COURSES' && preview.page.site.template?.code === 'global-arabic-quran' && <div className="flex flex-wrap gap-4"><label><input type="checkbox" checked={section.config.showPrices === true} onChange={e => update(section.id, { showPrices: e.target.checked })} /> Show program prices / عرض الأسعار</label><label>Currency / العملة <input maxLength={3} value={str(section.config.currency) || 'USD'} onChange={e => update(section.id, { currency: e.target.value.toUpperCase() })} className={field} /></label></div>}
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{index + 1}. {sectionLabels[section.type] || section.type}</h3><div className="flex items-center gap-2"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={section.enabled} onChange={e => { setSections(current => current.map(item => item.id === section.id ? { ...item, enabled: e.target.checked } : item)); setDirty(true); }} />ظاهر</label><button type="button" className={button} disabled={index === 0} aria-label={`نقل ${sectionLabels[section.type]} لأعلى`} onClick={() => move(index, -1)}>↑</button><button type="button" className={button} disabled={index === sections.length - 1} aria-label={`نقل ${sectionLabels[section.type]} لأسفل`} onClick={() => move(index, 1)}>↓</button></div></div>
          <details className="mt-2"><summary className="cursor-pointer py-3 text-sm font-semibold">تعديل محتوى القسم</summary><div className="space-y-4 pt-2">
            <div className="grid gap-4 md:grid-cols-2">{([ ["title", "العنوان"], ["titleEn", "العنوان بالإنجليزية"], ["body", "الوصف"], ["bodyEn", "الوصف بالإنجليزية"] ] as const).map(([key, label]) => <label key={key} className="text-sm font-medium">{label}{key.startsWith("body") ? <textarea rows={3} maxLength={4000} dir={key.endsWith("En") ? "ltr" : "rtl"} className={field} value={str(section.config[key])} onChange={e => update(section.id, { [key]: e.target.value })} /> : <input maxLength={4000} className={field} dir={key.endsWith("En") ? "ltr" : "rtl"} value={str(section.config[key])} onChange={e => update(section.id, { [key]: e.target.value })} />}</label>)}</div>
            {["HERO", "CTA", "CONTACT", "VIDEO"].includes(section.type) && <div className="grid gap-4 md:grid-cols-3">{([["buttonLabel", "نص الزر"], ["buttonLabelEn", "نص الزر بالإنجليزية"], ["buttonHref", "رابط الزر (مثل /register)"]] as const).map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<input className={field} maxLength={key === "buttonHref" ? 1000 : 160} dir={key === "buttonLabel" ? "rtl" : "ltr"} value={str(section.config[key])} onChange={e => update(section.id, { [key]: e.target.value })} /></label>)}</div>}
            {automaticSections.has(section.type) && <p className="rounded-lg bg-[var(--color-background)] p-3 text-sm text-[var(--color-muted)]">الأرقام تُحسب من الطلاب والدورات وعمليات الالتحاق الفعلية. لا تُنشر أرقام القالب التجريبية.</p>}
            {["COURSES", "CATEGORIES", "TEACHERS", "TESTIMONIALS"].includes(section.type) && <p className="text-sm text-[var(--color-muted)]">محتوى البطاقات يأتي تلقائياً من بيانات المنصة؛ حقول هذا القسم تتحكم في العنوان والوصف.</p>}
            {listEditable && <div className="space-y-4"><h4 className="font-semibold">{section.type === "FAQ" ? "الأسئلة والإجابات" : "قائمة المميزات"}</h4>{list.map((item, itemIndex) => <div key={itemIndex} className="space-y-3 rounded-lg bg-[var(--color-background)] p-4"><div className="grid gap-3 md:grid-cols-2">{([["title", "العنوان / السؤال"], ["titleEn", "العنوان بالإنجليزية"], ["body", "الوصف / الإجابة"], ["bodyEn", "الوصف بالإنجليزية"]] as const).map(([key, label]) => <label className="text-sm" key={key}>{label}<textarea rows={key.startsWith("body") ? 3 : 2} maxLength={4000} className={field} dir={key.endsWith("En") ? "ltr" : "rtl"} value={str(item[key])} onChange={e => update(section.id, { items: list.map((entry, i) => i === itemIndex ? { ...entry, [key]: e.target.value } : entry) })} /></label>)}</div><button type="button" className={button} onClick={() => update(section.id, { items: list.filter((_, i) => i !== itemIndex) })}>حذف العنصر {itemIndex + 1}</button></div>)}<button type="button" className={button} disabled={list.length >= 12} onClick={() => update(section.id, { items: [...list, { title: "", body: "" }] })}>+ إضافة عنصر</button></div>}
          </div></details>
        </article>;
      })}
    </fieldset>
    <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><summary className="cursor-pointer py-2 font-semibold">معاينة التغييرات قبل الحفظ</summary><div className="my-4 flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setLanguage(language === "ar" ? "en" : "ar")}>{language === "ar" ? "English" : "العربية"}</button><button type="button" className={button} aria-pressed={mobile} onClick={() => setMobile(!mobile)}>{mobile ? "عرض سطح المكتب" : "عرض الهاتف"}</button></div><p className="mb-3 text-sm text-[var(--color-muted)]">هذه معاينة غير محفوظة. روابط الموقع تفتح وجهاتها المعتادة.</p><div className="max-h-[750px] overflow-auto rounded-xl border border-[var(--color-border)]"><div style={{ width: mobile ? "min(390px, 100%)" : "100%", marginInline: "auto" }}><TemplateSiteRenderer {...preview} locale={language} page={{ ...preview.page, sections: sections.filter(section => section.enabled) }} /></div></div></details>
    <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={busy || !dirty} onClick={save} className="min-h-12 rounded-xl bg-[var(--color-primary)] px-6 py-3 font-bold text-white disabled:opacity-40">{busy ? "جارٍ الحفظ…" : "حفظ المحتوى"}</button><span role="status" className="text-sm">{message || (dirty ? "لديك تغييرات غير محفوظة" : "المحتوى محفوظ")}</span></div>
  </section>;
}
