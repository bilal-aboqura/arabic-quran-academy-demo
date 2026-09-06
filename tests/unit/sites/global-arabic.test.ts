import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { GlobalArabicSite } from '@/components/tenant/GlobalArabicSite';
import { globalArabicTemplate, arabicDemoPreset } from '@/modules/sites/global-arabic';
import { trialLessonHref } from '@/modules/sites/trial-lesson';
import { formatAcademyLessonTime } from '@/modules/sites/lesson-time';
import { contentConfigSchema } from '@/modules/sites/content-config';
import type { TenantPublicSettings } from '@/modules/settings/tenant-settings';
vi.mock('next/link', () => ({ default: 'a' }));
const settings: TenantPublicSettings = { tenantId: 'live-a', tenantSlug: 'live-a', platformName: 'أكاديمية أ', platformNameEn: 'Academy A', defaultLocale: 'en', primaryColor: null, secondaryColor: null, accentColor: null, logoUrl: null, heroImageUrl: null, faviconUrl: null, fontPreference: null, shortAbout: null, seoTitle: null, seoDescription: null, contactDetails: {}, socialLinks: {} };
const page = { title: 'Home', site: { template: { code: globalArabicTemplate.code, version: 1, defaultTheme: {} }, templateVersion: 1, themeOverrides: {} }, sections: globalArabicTemplate.sections.map((s, i) => ({ ...s, id: String(i) })) };
describe('international academy template', () => {
  it('keeps all bilingual section copy editable by the managed editor', () => {
    for (const section of globalArabicTemplate.sections) expect(contentConfigSchema.safeParse(section.config).success).toBe(true);
    expect(globalArabicTemplate.sections.find(s => s.type === 'FAQ')?.config.items).toHaveLength(7);
  });
  it('never inserts demo students, teachers, metrics or testimonials into a live empty tenant', () => {
    const html = renderToStaticMarkup(createElement(GlobalArabicSite, { page, settings, courses: [], content: { categories: [], teachers: [], testimonials: arabicDemoPreset.testimonials, stats: { students: 999, courses: 0, teachers: 0, enrollments: 999 } }, locale: 'en' }));
    expect(html).toContain('Academy A'); expect(html).toContain('lang="en"');
    for (const forbidden of ['Maryam', 'Sarah', '>999<', 'Tajweed</h3>']) expect(html).not.toContain(forbidden);
    expect(html).not.toContain('https://wa.me/');
  });
  it('uses RTL and tenant-authored Arabic text', () => {
    const html = renderToStaticMarkup(createElement(GlobalArabicSite, { page, settings, courses: [], content: { ...arabicDemoPreset, teachers: [] }, locale: 'ar' }));
    expect(html).toContain('dir="rtl"'); expect(html).toContain('أكاديمية أ');
  });
  it('uses international WhatsApp numbers without inventing a country prefix', () => {
    expect(trialLessonHref({ whatsapp: '+44 7700 900123' })).toBe('https://wa.me/447700900123?text=Hello%2C%20I%20would%20like%20to%20book%20a%20trial%20Arabic%2FQuran%20lesson.');
    expect(trialLessonHref({ whatsapp: 'not-a-number', email: 'lessons@example.org' })).toMatch(/^mailto:lessons@example.org/);
    expect(trialLessonHref({ phone: '+1 (202) 555-0123' })).toBe('tel:+12025550123');
    expect(trialLessonHref({ email: 'bad\r\nBcc:other@example.org' })).toBe('#academy-contact');
    expect(trialLessonHref({})).toBe('#academy-contact');
  });
  it('labels the actual time zone, including DST, and falls back to UTC', () => {
    expect(formatAcademyLessonTime('2026-07-01T12:00:00Z', 'en', 'Europe/London')).toContain('1:00 PM');
    expect(formatAcademyLessonTime('2026-07-01T12:00:00Z', 'en', 'Invalid/Zone')).toContain('UTC');
  });
});
