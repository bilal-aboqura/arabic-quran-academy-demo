"use client";
import Link from 'next/link';
import { Calendar, BookOpen } from 'lucide-react';
import { useLocale } from '@/components/LocaleProvider';
import { formatAcademyLessonTime } from '@/modules/sites/lesson-time';
import type { getAcademyStudentExtras } from '@/modules/sites/academy-student';
export type AcademyExtras = NonNullable<Awaited<ReturnType<typeof getAcademyStudentExtras>>>;
export function AcademyStudentExtras({ data }: { data: AcademyExtras }) {
  const locale = useLocale(); const ar = locale === 'ar';
  return <div className="academy-student-extras">
    <section><Calendar size={22} aria-hidden /><h2>{ar ? 'درسك المباشر القادم' : 'Upcoming Live Lesson'}</h2>{data.lesson ? <><h3>{ar ? data.lesson.titleAr || data.lesson.title : data.lesson.title}</h3><p>{ar ? data.lesson.course.titleAr || data.lesson.course.title : data.lesson.course.title}</p><time dateTime={data.lesson.scheduledAt}>{formatAcademyLessonTime(data.lesson.scheduledAt, locale, data.timezone)}</time><Link href={`/courses/${data.lesson.course.slug}#live-lessons`}>{ar ? 'افتح الدرس وانضم' : 'Open & Join Lesson'}</Link></> : <p>{ar ? 'سيظهر موعد درسك هنا بعد تحديده مع معلمك.' : 'Your next lesson will appear here once arranged with your teacher.'}</p>}</section>
    <section><BookOpen size={22} aria-hidden /><h2>{ar ? 'الإشعارات' : 'Notifications'}</h2>{data.notifications.length ? <ul>{data.notifications.map(n => <li key={n.id}><strong>{ar ? n.titleAr || n.title : n.title}</strong><p>{ar ? n.messageAr || n.message : n.message}</p></li>)}</ul> : <p>{ar ? 'أنت على اطلاع بكل المستجدات.' : 'You’re all caught up. Keep making time for your learning.'}</p>}</section>
  </div>;
}
