import Link from "next/link";
import { AcademyCourseJourney } from '@/components/tenant/AcademyCourseJourney';
import { headers } from "next/headers";
import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  PlayCircle,
  HelpCircle,
  ShieldCheck,
  Award,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { EnrollButton } from "./EnrollButton";
import { getTenantActor } from "@/modules/tenants/actor";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import {
  findCourseOutlineForTenant,
  findPublishedCourseMarketingBySlugForTenant,
  getTenantCourseContentAccess,
} from "@/modules/courses/repository";
import { getTenantStudentBalance } from "@/modules/commerce/tenant-wallet";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

function decoded(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function CoursePage({ params }: Props) {
  unstable_noStore();
  const [{ slug }, requestHeaders, t, locale] = await Promise.all([
    params,
    headers(),
    getServerTranslator(),
    getLocaleFromCookie(),
  ]);

  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) notFound();
  const course = await findPublishedCourseMarketingBySlugForTenant(tenant.tenantId, decoded(slug));
  if (!course) notFound();

  const actor = await getTenantActor(tenant);
  const access = await getTenantCourseContentAccess(tenant.tenantId, course, actor);
  const hasContentAccess = access.mode !== "none";
  const outline = hasContentAccess ? await findCourseOutlineForTenant(tenant.tenantId, course.id) : null;
  const lessons = outline?.lessons.filter((lesson) => access.mode !== "partial" || access.allowedLessonIds.has(lesson.id)) ?? [];
  const quizzes = outline?.quizzes.filter((quiz) => access.mode !== "partial" || access.allowedQuizIds.has(quiz.id)) ?? [];
  const isStudent = actor?.role === "STUDENT";
  const balance = isStudent ? await getTenantStudentBalance(tenant.tenantId, actor.userId) : null;
  const price = Number(course.price);
  const enrolled = access.mode === "full" && isStudent;
  const isRtl = locale === "ar";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AcademyCourseJourney tenantId={tenant.tenantId} courseId={course.id} actor={actor} locale={locale} />
      {/* Breadcrumb Navigation */}
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-[var(--color-muted)]">
        <Link
          href="/courses"
          className="flex items-center gap-1.5 transition hover:text-[var(--color-primary)]"
        >
          {isRtl ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
          <span>{t("common.courses", "الدورات")}</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--color-foreground)] truncate max-w-xs sm:max-w-md">
          {isRtl ? course.titleAr || course.title : course.title}
        </span>
      </nav>

      {/* Two Column Layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Main Content (Left) */}
        <article className="space-y-8">
          {/* Hero Banner Card */}
          <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            {course.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.imageUrl}
                alt=""
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-slate-900 text-slate-500">
                <BookOpen className="h-16 w-16 stroke-[1.2]" />
              </div>
            )}

            <div className="p-6 sm:p-8 space-y-4">
              {course.category && (
                <span className="inline-block rounded-lg bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--color-primary)]">
                  {course.category.nameAr ?? course.category.name}
                </span>
              )}

              <h1 className="text-2xl font-black text-[var(--color-foreground)] sm:text-3xl lg:text-4xl">
                {isRtl ? course.titleAr || course.title : course.title}
              </h1>

              {course.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-muted)] sm:text-base">
                  {course.description}
                </p>
              )}
            </div>
          </div>

          {/* Curriculum Syllabus Section */}
          <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h2 className="text-lg font-black text-[var(--color-foreground)]">
                  {t("courses.courseContent", "منهج ومحتوى الدورة")}
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  {hasContentAccess
                    ? `${lessons.length} ${isRtl ? "درس متاح" : "lessons"} • ${quizzes.length} ${isRtl ? "امتحان" : "quizzes"}`
                    : t("courses.lockedContentHint", "سجل في الدورة للوصول إلى كافة الدروس والامتحانات")}
                </p>
              </div>

              {hasContentAccess ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isRtl ? "مشترك" : "Enrolled"}</span>
                </span>
              ) : null}
            </div>

            {hasContentAccess ? (
              <div className="mt-6 space-y-3">
                {/* Lessons */}
                {lessons.map((lesson, idx) => (
                  <Link
                    key={lesson.id}
                    href={`/courses/${encodeURIComponent(course.slug)}/lessons/${encodeURIComponent(lesson.slug)}`}
                    className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                        <PlayCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
                          {lesson.titleAr || lesson.title}
                        </p>
                        <span className="text-[11px] text-[var(--color-muted)]">
                          {isRtl ? `الدرس ${idx + 1}` : `Lesson ${idx + 1}`}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                      {isRtl ? "مشاهدة ↗" : "Watch ↗"}
                    </span>
                  </Link>
                ))}

                {/* Quizzes */}
                {quizzes.map((quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/courses/${encodeURIComponent(course.slug)}/quizzes/${encodeURIComponent(quiz.id)}`}
                    className="group flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 transition-all hover:border-amber-500/50 hover:bg-amber-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--color-foreground)]">
                          {quiz.title}
                        </p>
                        <span className="text-[11px] text-[var(--color-muted)]">
                          {quiz._count.questions} {isRtl ? "سؤال" : "questions"}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {isRtl ? "بدء الاختبار ↗" : "Start Quiz ↗"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] p-10 text-center">
                <BookOpen className="h-10 w-10 text-[var(--color-muted)] opacity-60" />
                <p className="mt-3 text-sm font-bold text-[var(--color-foreground)]">
                  {isRtl ? "المحتوى مغلق حالياً" : "Content is currently locked"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)] max-w-xs">
                  {isRtl
                    ? "قم بالتسجيل في الدورة للوصول إلى كافة الدروس والفيديوهات والواجبات والاختبارات."
                    : "Enroll in the course to unlock all lessons, videos, homework, and quizzes."}
                </p>
              </div>
            )}
          </section>
        </article>

        {/* Sticky Action Sidebar (Right) */}
        <aside className="space-y-6">
          <div className="sticky top-24 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm space-y-6">
            {/* Price Display */}
            <div>
              <span className="text-xs font-bold text-[var(--color-muted)]">
                {isRtl ? "تكلفة الاشتراك" : "Enrollment Fee"}
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                {price > 0 ? (
                  <>
                    <span className="text-3xl font-black text-[var(--color-foreground)]">
                      {price.toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-muted)]">
                      {t("common.egyptianPoundShort", "EGP")}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {t("common.free", "مجاناً")}
                  </span>
                )}
              </div>
            </div>

            {/* Access & Enrollment Status */}
            {enrolled ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isRtl ? "أنت مسجل في هذه الدورة بالفعل" : "You are enrolled in this course"}</span>
                </div>
                {lessons.length > 0 && (
                  <Link
                    href={`/courses/${encodeURIComponent(course.slug)}/lessons/${encodeURIComponent(lessons[0].slug)}`}
                    className="block w-full text-center rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-500 transition-colors shadow-xs"
                  >
                    {isRtl ? "متابعة مشاهدة الدروس ↗" : "Continue Learning ↗"}
                  </Link>
                )}
              </div>
            ) : !actor ? (
              <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center">
                <p className="text-xs font-bold text-[var(--color-foreground)]">
                  {isRtl ? "سجل الدخول للمتابعة والتسجيل" : "Log in to enroll and start learning"}
                </p>
                <Link
                  href={`/login?callbackUrl=/courses/${encodeURIComponent(course.slug)}`}
                  className="block w-full rounded-xl bg-[var(--color-primary)] py-2.5 text-xs font-black text-white hover:opacity-95 shadow-xs"
                >
                  {t("header.login", "تسجيل الدخول")}
                </Link>
              </div>
            ) : isStudent ? (
              <EnrollButton
                courseId={course.id}
                coursePrice={price}
                userBalance={balance?.balance ?? 0}
              />
            ) : null}

            {access.mode === "partial" && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-medium text-amber-700 dark:text-amber-300">
                {isRtl
                  ? "كود التفعيل الحالي يمنحك وصولاً لدروس محددة في هذه الدورة."
                  : "Your activation code grants access to selected lessons in this course."}
              </div>
            )}

            {/* Trust Checklist */}
            <div className="space-y-3 border-t border-[var(--color-border)]/60 pt-4 text-xs text-[var(--color-muted)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{isRtl ? "وصول كامل ودائم لمحتوى الدورة" : "Full lifetime access to course content"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                <span>{isRtl ? "تعلم بالسرعة التي تناسبك من أي جهاز" : "Learn at your own pace on any device"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500 shrink-0" />
                <span>{isRtl ? "اختبارات وتدريبات عملية مع التقييم" : "Practical quizzes and assessment"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                <span>{isRtl ? "متابعة مباشرة ومراجعات مستمرة" : "Continuous mentorship & updates"}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
