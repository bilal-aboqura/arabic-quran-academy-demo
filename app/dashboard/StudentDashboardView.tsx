"use client";

import Link from "next/link";
import { AcademyStudentExtras, type AcademyExtras } from '@/components/tenant/AcademyStudentExtras';
import {
  Play,
  BookOpen,
  FileCheck,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { useDashboardTable, dateLocaleForUi } from "@/lib/i18n/dashboard-table";

export type StudentEnrolledCourse = {
  id: string;
  courseId: string;
  title: string;
  titleAr: string | null;
  slug: string;
  imageUrl: string | null;
  lessonsCount: number;
  completedLessons: number;
  progressPercent: number;
};

export type StudentContinueLearningItem = {
  courseId: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  course: { id: string; title: string; titleAr: string | null; slug: string; imageUrl: string | null };
  nextLesson?: { id: string; title: string; titleAr: string | null; slug: string } | null;
};

export type StudentRecentQuiz = {
  id: string;
  quizId: string;
  quizTitle: string;
  courseTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  createdAt: string;
};

export type StudentRecentAssignment = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  status: string;
  grade: number | null;
  maxGrade: number;
  submittedAt: string;
  feedback: string | null;
};

export type StudentPendingAssignment = {
  id: string;
  title: string;
  courseTitle: string;
  maxGrade: number;
  deadline: string | null;
};

export type StudentActiveSubscription = {
  id: string;
  planName: string;
  expiresAt: string;
  startsAt?: string;
  durationKind?: string;
};

export type StudentRecentPurchase = {
  id: string;
  totalAmount: number;
  currency?: string;
  createdAt: string;
  items: Array<{ id?: string; title: string; price?: number; unitPrice?: number; quantity?: number }>;
};

export type StudentDashboardViewProps = {
  academyExtras?: AcademyExtras | null;
  userName: string;
  walletBalance: number;
  copyrightCode: string | null;
  continueLearning: StudentContinueLearningItem[];
  enrolledCourses: StudentEnrolledCourse[];
  recentQuizzes: StudentRecentQuiz[];
  submittedAssignments: StudentRecentAssignment[];
  pendingAssignments: StudentPendingAssignment[];
  activeSubscription: StudentActiveSubscription | null;
  recentPurchases: StudentRecentPurchase[];
};

export function StudentDashboardView({
  academyExtras,
  userName,
  walletBalance,
  copyrightCode,
  continueLearning,
  enrolledCourses,
  recentQuizzes,
  submittedAssignments,
  pendingAssignments,
  activeSubscription,
  recentPurchases,
}: StudentDashboardViewProps) {
  const locale = useLocale();
  const t = useT();
  const { dir } = useDashboardTable();
  const dateLoc = dateLocaleForUi(locale);
  const egp = locale === "ar" ? t("common.egpShortAr", "ج.م") : t("common.egyptianPoundShort", "EGP");
  const isRtl = locale === "ar";

  function formatDate(iso: string) {
    try {
      return new Intl.DateTimeFormat(dateLoc, { dateStyle: "medium" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function formatDateTime(iso: string) {
    try {
      return new Intl.DateTimeFormat(dateLoc, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  return (
    <div className="space-y-8" dir={dir}>
      {/* Top Welcome & Summary Banner */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-foreground)] sm:text-3xl">
                {academyExtras ? (isRtl ? 'مرحبًا بعودتك،' : 'Welcome back,') : t("dashboard.page.greetingComma", "مرحباً،")} {userName}
              </h1>
              {copyrightCode && (
                <span className="rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--color-primary)]">
                  {copyrightCode}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-[var(--color-muted)] sm:text-sm leading-relaxed">
              {t("dashboard.page.studentIntro", "دوراتك التعليمية، واجباتك، ونسبة تقدمك الأكاديمي جاهزة للمتابعة.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Wallet Card */}
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 shadow-2xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="text-end">
                <span className="block text-[11px] font-bold text-[var(--color-muted)]">
                  {t("dashboard.studentsPage.colBalance", "المحفظة")}
                </span>
                <span className="text-sm font-black text-[var(--color-foreground)]">
                  {walletBalance.toFixed(2)} {egp}
                </span>
              </div>
              <Link
                href="/dashboard/add-balance"
                className="rounded-xl bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--color-primary-hover)] shadow-xs"
              >
                + {t("dashboard.studentsPage.colAddBalance", "شحن")}
              </Link>
            </div>

            {/* Subscription Quick Badge */}
            {activeSubscription ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-end">
                <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {activeSubscription.planName}
                </span>
                <span className="text-[11px] text-[var(--color-muted)] flex items-center gap-1 mt-0.5 justify-end">
                  <Calendar className="h-3 w-3" />
                  <span>ينتهي: {formatDate(activeSubscription.expiresAt)}</span>
                </span>
              </div>
            ) : null}

            {/* Messages Shortcut */}
            <Link
              href="/dashboard/messages"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted)] transition hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40"
              title="Messages"
            >
              <MessageSquare className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {academyExtras && <AcademyStudentExtras data={academyExtras} />}
      {/* SECTION 1: Continue Learning Spotlight */}
      {continueLearning.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[var(--color-foreground)]">
              {t("dashboard.page.continueLearningTitle", "متابعة الدروس")}
            </h2>
            <Link
              href="/courses"
              className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline"
            >
              <span>{t("dashboard.page.viewCoursesButton", "جميع الدورات")}</span>
              {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {continueLearning.map((item) => {
              const targetUrl = item.nextLesson
                ? `/courses/${item.course.slug}/lessons/${item.nextLesson.slug}`
                : `/courses/${item.course.slug}`;
              return (
                <Link
                  key={item.courseId}
                  href={targetUrl}
                  className="group flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]/60 hover:shadow-md"
                >
                  <div>
                    <h3 className="text-base font-black text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition">
                      {item.course.titleAr || item.course.title}
                    </h3>
                    {item.nextLesson && (
                      <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)]">
                        <Play className="h-3.5 w-3.5 fill-[var(--color-primary)] shrink-0" />
                        <span className="truncate">
                          {t("dashboard.page.nextLessonLabel", "الدرس التالي:")} {item.nextLesson.titleAr || item.nextLesson.title}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-5 border-t border-[var(--color-border)]/50 pt-3">
                    <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1.5 font-semibold">
                      <span>{item.completedLessons} / {item.totalLessons} دروس مكتملة</span>
                      <span className="font-bold text-[var(--color-foreground)]">{item.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]/60">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: Enrolled Courses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[var(--color-foreground)]">
            {t("dashboard.page.myCoursesTitle", "دوراتي المشترك بها")} ({enrolledCourses.length})
          </h2>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline"
          >
            <span>{t("dashboard.page.viewCoursesButton", "تصفح الكتالوج")}</span>
            {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
          </Link>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
            <BookOpen className="h-10 w-10 text-[var(--color-muted)] opacity-50" />
            <p className="mt-3 text-sm font-bold text-[var(--color-muted)]">
              {t("dashboard.page.noContinueLearning", "لست مسجلاً في أي دورة بعد.")}
            </p>
            <Link
              href="/courses"
              className="mt-4 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              استكشف الدورات المتاحة
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/50 hover:shadow-sm"
              >
                <div>
                  <h3 className="font-black text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition">
                    {c.titleAr || c.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {c.lessonsCount} {isRtl ? "درس" : "lessons"}
                  </p>
                </div>

                <div className="mt-5 border-t border-[var(--color-border)]/50 pt-3">
                  <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1.5 font-semibold">
                    <span>نسبة الإنجاز</span>
                    <span className="font-bold text-[var(--color-foreground)]">{c.progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]/60">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${c.progressPercent}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Assignments & Quizzes (Two Column Grid) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assignments Column */}
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-3">
            <h2 className="flex items-center gap-2 text-base font-black text-[var(--color-foreground)]">
              <FileCheck className="h-4 w-4 text-[var(--color-primary)]" />
              <span>الواجبات والمهام</span>
            </h2>
            <Link href="/dashboard/assignments" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
              عرض الكل
            </Link>
          </div>

          {/* Pending to do */}
          {pendingAssignments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                مطلوب تسليمها ({pendingAssignments.length})
              </span>
              {pendingAssignments.map((pa) => (
                <div key={pa.id} className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs">
                  <div>
                    <p className="font-bold text-[var(--color-foreground)]">{pa.title}</p>
                    <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{pa.courseTitle}</p>
                  </div>
                  <div className="text-end space-y-1">
                    {pa.deadline ? (
                      <span className="text-amber-600 dark:text-amber-400 block text-[10px] font-bold">
                        الموعد: {formatDate(pa.deadline)}
                      </span>
                    ) : null}
                    <Link
                      href="/dashboard/assignments"
                      className="inline-block rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs"
                    >
                      تسليم الآن ↗
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submitted history */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-[var(--color-muted)] block">آخر الواجبات المسلمة</span>
            {submittedAssignments.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)] py-4 text-center">لا توجد واجبات مسلّمة بعد.</p>
            ) : (
              submittedAssignments.map((sa) => (
                <div key={sa.id} className="flex items-start justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3.5 text-xs">
                  <div>
                    <p className="font-bold text-[var(--color-foreground)]">{sa.assignmentTitle}</p>
                    <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{sa.courseTitle}</p>
                    {sa.feedback && (
                      <p className="mt-1 text-[11px] text-[var(--color-foreground)] italic max-w-xs">
                        “{sa.feedback}”
                      </p>
                    )}
                  </div>
                  <div className="text-end">
                    <span className="font-mono font-bold text-[var(--color-primary)]">
                      {sa.grade != null ? `${sa.grade} / ${sa.maxGrade}` : sa.status}
                    </span>
                    <span className="block text-[10px] text-[var(--color-muted)] mt-0.5">
                      {formatDate(sa.submittedAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quizzes Column */}
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-3">
            <h2 className="flex items-center gap-2 text-base font-black text-[var(--color-foreground)]">
              <HelpCircle className="h-4 w-4 text-amber-500" />
              <span>نتائج الاختبارات الأخيرة</span>
            </h2>
            <Link href="/dashboard/quizzes" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
              عرض الكل
            </Link>
          </div>

          {recentQuizzes.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)] py-8 text-center">لا توجد محاولات اختبار مسجلة بعد.</p>
          ) : (
            <div className="space-y-2.5">
              {recentQuizzes.map((q) => (
                <div key={q.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3.5 text-xs">
                  <div>
                    <p className="font-bold text-[var(--color-foreground)]">{q.quizTitle}</p>
                    <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{q.courseTitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <span className="font-mono font-bold text-[var(--color-foreground)]">
                        {q.score} / {q.totalQuestions}
                      </span>
                      <span className="block text-[10px] font-bold text-[var(--color-muted)]">{q.percentage}%</span>
                    </div>
                    <span className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                      q.passed
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    }`}>
                      {q.passed ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      <span>{q.passed ? "ناجح" : "مراجعة"}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* SECTION 4: Store Purchases */}
      {recentPurchases.length > 0 && (
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm space-y-3">
          <h2 className="text-base font-black text-[var(--color-foreground)]">طلبات المتجر الرقمي الأخيرة</h2>
          <div className="divide-y divide-[var(--color-border)]">
            {recentPurchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 text-xs first:pt-0 last:pb-0">
                <div>
                  <p className="font-bold text-[var(--color-foreground)]">
                    {p.items.map((i) => i.title).join(", ") || "عنصر من المتجر"}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{formatDateTime(p.createdAt)}</p>
                </div>
                <span className="font-black text-[var(--color-foreground)]">
                  {p.totalAmount.toFixed(2)} {egp}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
