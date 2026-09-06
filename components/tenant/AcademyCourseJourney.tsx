import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import type { TenantActor } from '@/modules/tenants/types';
import { getTenantCourseContentAccess } from '@/modules/courses/repository';
import { getCourseProgressForTenant } from '@/modules/learning/progress.repository';
import { formatAcademyLessonTime } from '@/modules/sites/lesson-time';
import { safeContentHref } from '@/modules/sites/content-config';

export async function AcademyCourseJourney({ tenantId, courseId, actor, locale }: { tenantId: string; courseId: string; actor: TenantActor | null; locale: 'ar' | 'en' }) {
  if (!actor || actor.tenantId !== tenantId || actor.role !== 'STUDENT') return null;
  const site = await prisma.site.findUnique({ where: { tenantId }, select: { template: { select: { code: true } } } });
  if (site?.template?.code !== 'global-arabic-quran') return null;
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId, isPublished: true }, select: { id: true, tenantId: true, createdById: true, price: true, slug: true } });
  if (!course) return null;
  const access = await getTenantCourseContentAccess(tenantId, course, actor);
  if (access.mode !== 'full') return null;
  const [modules, completed, progress, live, teacher, settings] = await Promise.all([
    prisma.courseModule.findMany({ where: { courseId, course: { tenantId }, isPublished: true }, select: { id: true, title: true, lessons: { select: { id: true, title: true, titleAr: true, slug: true }, orderBy: { order: 'asc' } } }, orderBy: { sortOrder: 'asc' } }),
    prisma.lessonProgress.findMany({ where: { tenantId, courseId, studentMembershipId: actor.membershipId, completed: true }, select: { lessonId: true } }),
    getCourseProgressForTenant({ tenantId, courseId, actor }),
    prisma.liveStream.findMany({ where: { tenantId, courseId, scheduledAt: { gte: new Date() } }, select: { id: true, title: true, titleAr: true, meetingUrl: true, scheduledAt: true }, orderBy: { scheduledAt: 'asc' }, take: 3 }),
    course.createdById ? prisma.tenantMembership.findFirst({ where: { tenantId, userId: course.createdById, role: 'TEACHER', status: 'ACTIVE' }, select: { displayName: true } }) : null,
    prisma.tenantSettings.findUnique({ where: { tenantId }, select: { timezone: true } }),
  ]);
  const ar = locale === 'ar'; const done = new Set(completed.map(p => p.lessonId));
  const next = modules.flatMap(m => m.lessons).find(l => !done.has(l.id));
  return <section className="aq-course-journey">
    <div><h2>{ar ? 'رحلتك التعليمية' : 'Your learning journey'}</h2>{teacher?.displayName && <p>{ar ? 'معلمك: ' : 'Your teacher: '}{teacher.displayName}</p>}<strong>{progress?.progressPercent || 0}% · {progress?.completedLessons || 0} / {progress?.totalLessons || modules.flatMap(m => m.lessons).length} {ar ? 'دروس مكتملة' : 'lessons completed'}</strong><progress aria-label={ar ? 'تقدم التعلم' : 'Learning progress'} value={progress?.progressPercent || 0} max={100} />{next && <Link className="aq-button" href={`/courses/${course.slug}/lessons/${next.slug}`}>{ar ? 'الدرس التالي: ' : 'Next lesson: '}{ar ? next.titleAr || next.title : next.title}</Link>}</div>
    <div className="aq-course-modules">{modules.map((m, i) => <details key={m.id} open={m.lessons.some(l => l.id === next?.id)}><summary>{ar ? 'الوحدة' : 'Module'} {i + 1} — {m.title}<span>{m.lessons.filter(l => done.has(l.id)).length}/{m.lessons.length}</span></summary><ul>{m.lessons.map(l => <li key={l.id}><Link href={`/courses/${course.slug}/lessons/${l.slug}`}>{done.has(l.id) ? '✓ ' : ''}{ar ? l.titleAr || l.title : l.title}</Link></li>)}</ul></details>)}</div>
    <div id="live-lessons"><h3>{ar ? 'الدروس المباشرة' : 'Live lessons'}</h3>{live.length ? live.map(l => <article key={l.id}><strong>{ar ? l.titleAr || l.title : l.title}</strong><p>{formatAcademyLessonTime(l.scheduledAt.toISOString(), locale, settings?.timezone || 'UTC')}</p>{l.meetingUrl.includes('example.invalid') ? <p>{ar ? 'رابط تجريبي — يضيف المعلم رابط الاجتماع الحقيقي.' : 'DEMO lesson — your teacher adds the real meeting link.'}</p> : <a className="aq-button" href={safeContentHref(l.meetingUrl, '#live-lessons')} target="_blank" rel="noopener noreferrer">{ar ? 'انضم للدرس' : 'Join Lesson'}</a>}</article>) : <p>{ar ? 'سيظهر موعدك هنا بعد تحديده.' : 'Your scheduled lesson will appear here.'}</p>}</div>
    <Link className="aq-text-link" href="/dashboard/assignments">{ar ? 'الواجبات وملاحظات المعلم' : 'Assignments & teacher feedback'}</Link>
  </section>;
}
