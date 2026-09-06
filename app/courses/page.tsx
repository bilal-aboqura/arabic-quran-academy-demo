import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { arabicDemoPreset } from '@/modules/sites/global-arabic';
import '@/components/tenant/global-arabic.css';
export const dynamic = 'force-static';
const courseImages: Record<string, string> = {
  'arabic-beginners': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85',
  'quran-reading': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85',
  tajweed: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=85',
  'quran-memorization': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=85',
};
export default function CoursesPage() { return <main className="aq-site"><div className="aq-wrap aq-section"><Link className="aq-text-link" href="/">← Back to academy</Link><h1>Programs</h1><p>Choose a clear, personal path for Arabic and Quran learning.</p><div className="aq-programs">{arabicDemoPreset.courses.map((course, index) => <article className="aq-program" key={course.slug}><Link href={`/courses/${course.slug}`} className={`aq-program-art aq-art-${index}`}>{courseImages[course.slug] ? <img src={courseImages[course.slug]} alt="" loading="lazy" /> : <><span lang="ar">{['أ ب ت', 'اقرأ', 'ترتيل', 'حفظ'][index]}</span><BookOpen size={28} aria-hidden /></>}</Link><div className="aq-program-copy"><span className="aq-meta">{index < 2 ? 'Beginner' : 'Guided practice'} · 25 lessons · Ustadha Maryam</span><h2><Link href={`/courses/${course.slug}`}>{course.title}</Link></h2><p>{course.shortDescEn}</p><Link className="aq-text-link" href={`/courses/${course.slug}`}>Explore program →</Link></div></article>)}</div></div></main>; }
