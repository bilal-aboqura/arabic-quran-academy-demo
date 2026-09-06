import { z } from "zod";

export function safeContentHref(value: string, fallback = "/courses") {
  const href = value.trim();
  if (!href || /[\u0000-\u0020\\]/.test(href)) return fallback;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^#[a-zA-Z][\w-]*$/.test(href)) return href;
  try { const url = new URL(href); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? href : fallback; } catch { return fallback; }
}

export const contentConfigSchema = z.object({
  showPrices: z.boolean().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  title: z.string().max(4000).optional(), body: z.string().max(4000).optional(),
  titleEn: z.string().max(4000).optional(), bodyEn: z.string().max(4000).optional(),
  buttonLabel: z.string().max(160).optional(), buttonLabelEn: z.string().max(160).optional(),
  buttonHref: z.string().max(1000).refine(value => !value || safeContentHref(value, "") !== "", "Invalid button link").optional(),
  items: z.array(z.object({ title: z.string().max(4000), body: z.string().max(4000), titleEn: z.string().max(4000).optional(), bodyEn: z.string().max(4000).optional() }).strict()).max(12).optional(),
}).strict();
export const saveContentSchema = z.object({
  pageId: z.string().min(1),
  sections: z.array(z.object({ id: z.string().min(1), updatedAt: z.iso.datetime(), enabled: z.boolean(), config: contentConfigSchema }).strict()).min(1).max(40),
}).strict();

export const sectionLabels: Record<string, string> = { HERO: "مقدمة الموقع", FEATURES: "مميزات المنصة", COURSES: "الدورات", CATEGORIES: "المواد والمراحل", TEACHERS: "المدرسون", ABOUT: "عن المنصة", STATS: "إحصاءات المنصة", RESULTS: "نتائج المنصة", SOCIAL_PROOF: "مجتمع المنصة", TESTIMONIALS: "آراء الطلاب", FAQ: "الأسئلة الشائعة", CTA: "دعوة التسجيل", CONTACT: "التواصل", VIDEO: "استكشف المنهج" };
export const automaticSections = new Set(["STATS", "RESULTS", "SOCIAL_PROOF"]);
