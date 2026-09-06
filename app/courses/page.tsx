import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { arabicDemoPreset } from '@/modules/sites/global-arabic';
import '@/components/tenant/global-arabic.css';
export const dynamic = 'force-static';
export default function CoursesPage() { return <main className="aq-site"><div className="aq-wrap aq-section"><Link className="aq-text-link" href="/">← Back to academy</Link><h1>Programs</h1><p>Choose a clear, personal path for Arabic and Quran learning.</p><div className="aq-programs">{arabicDemoPreset.courses.map((course, index) => <article className="aq-program" key={course.slug}><Link href={`/courses/${course.slug}`} className={`aq-program-art aq-art-${index}`}><span lang="ar">{['أ ب ت', 'اقرأ', 'ترتيل', 'حفظ'][index]}</span><BookOpen size={28} aria-hidden /></Link><div className="aq-program-copy"><span className="aq-meta">{index < 2 ? 'Beginner' : 'Guided practice'} · 25 lessons</span><h2><Link href={`/courses/${course.slug}`}>{course.title}</Link></h2><p>{course.shortDescEn}</p><Link className="aq-text-link" href={`/courses/${course.slug}`}>Explore program →</Link></div></article>)}</div></div></main>; }
