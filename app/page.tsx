import type { Metadata } from 'next';
import { GlobalArabicSite } from '@/components/tenant/GlobalArabicSite';
import { globalArabicTemplate, arabicDemoPreset } from '@/modules/sites/global-arabic';
import type { TenantPublicSettings } from '@/modules/settings/tenant-settings';
export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Online Arabic & Quran Classes | Arabic & Quran Academy', description: 'Learn Arabic, Quran reading, Tajweed and Quran memorization online with personalized lessons for children and adults.', icons: { icon: '/academy/favicon.svg' } };
const settings: TenantPublicSettings = { tenantId: 'demo-tenant', tenantSlug: 'arabic-quran-demo', platformName: arabicDemoPreset.siteName, platformNameEn: arabicDemoPreset.platformNameEn, primaryColor: arabicDemoPreset.primaryColor, secondaryColor: arabicDemoPreset.secondaryColor, accentColor: arabicDemoPreset.accentColor, logoUrl: null, faviconUrl: '/academy/favicon.svg', heroImageUrl: '/academy/teacher-lesson.webp', fontPreference: 'Cairo', shortAbout: arabicDemoPreset.about, seoTitle: 'Online Arabic & Quran Classes | Arabic & Quran Academy', seoDescription: 'Learn Arabic, Quran reading, Tajweed and Quran memorization online with personalized lessons for children and adults.', contactDetails: {}, defaultLocale: 'en', socialLinks: {} };
const page = { title: 'Home', site: { template: { code: globalArabicTemplate.code, version: globalArabicTemplate.version, defaultTheme: globalArabicTemplate.defaultTheme }, templateVersion: globalArabicTemplate.version, themeOverrides: {} }, sections: globalArabicTemplate.sections.map((section, id) => ({ ...section, id: `static-${id}` })) };
const courseImages: Record<string, string> = {
  'arabic-beginners': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85',
  'quran-reading': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85',
  tajweed: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=85',
  'quran-memorization': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=85',
};
export default function HomePage() { const courses = arabicDemoPreset.courses.map(course => ({ ...course, imageUrl: courseImages[course.slug] || `/academy/${course.slug}.svg`, createdById: 'demo-maryam', level: course.slug === 'arabic-beginners' || course.slug === 'quran-reading' ? 'Beginner' : 'Guided practice', _count: { lessons: 25 } })); const content = { categories: arabicDemoPreset.categories, teachers: arabicDemoPreset.teachers, testimonials: arabicDemoPreset.testimonials, stats: { courses: 4, students: 0, teachers: 1, enrollments: 0 } }; return <GlobalArabicSite page={page} settings={settings} courses={courses} content={content} locale="en" />; }
