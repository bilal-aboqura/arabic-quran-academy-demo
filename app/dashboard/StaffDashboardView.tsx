"use client";

import Link from "next/link";
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  ShoppingBag,
  CreditCard,
  MessageSquare,
  Radio,
  Globe,
  Settings,
  ArrowUpRight,
} from "lucide-react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { useDashboardTable, dateLocaleForUi } from "@/lib/i18n/dashboard-table";

export type StaffEnrollmentRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  enrolledAt: string;
};

export type StaffQuizAttemptRow = {
  id: string;
  studentName: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  createdAt: string;
};

export type StaffPendingSubmissionRow = {
  id: string;
  studentName: string;
  assignmentTitle: string;
  submittedAt: string;
};

export type StaffDashboardViewProps = {
  userName: string;
  role: string;
  analytics: {
    studentsCount: number;
    coursesCount: number;
    totalEnrollments: number;
    courseRevenue: number;
    revenueBreakdown?: { courses: number; subscriptions: number; store: number };
    coursePerformance?: Array<{
      courseId: string;
      title: string;
      titleAr: string | null;
      enrollments: number;
      revenue: number;
    }>;
  };
  recentEnrollments: StaffEnrollmentRow[];
  recentQuizAttempts: StaffQuizAttemptRow[];
  pendingSubmissions: StaffPendingSubmissionRow[];
};

export function StaffDashboardView({
  userName,
  role,
  analytics,
  recentEnrollments,
  recentQuizAttempts,
  pendingSubmissions,
}: StaffDashboardViewProps) {
  const t = useT();
  const locale = useLocale();
  const { dir } = useDashboardTable();
  const dateLoc = dateLocaleForUi(locale);
  const egp = t("common.egyptianPoundShort", "EGP");

  function formatDate(iso: string) {
    try {
      return new Intl.DateTimeFormat(dateLoc, { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <div className="space-y-8" dir={dir}>
      {/* Top Welcome Banner */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
                {t("dashboard.page.greetingComma", "Welcome,")} {userName}! 👋
              </h1>
              <span className="rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--color-primary)]">
                {role}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {t("dashboard.page.teacherIntro", "Tenant management dashboard with real-time operations.")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/courses"
              className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              + Create Course
            </Link>
            {isOwnerOrAdmin && (
              <Link
                href="/dashboard/website"
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)] transition hover:border-[var(--color-primary)]/40"
              >
                Website Builder
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/students"
          className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-muted)]">
              {t("dashboard.statisticsPage.cardStudents", "Students")}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition">
            {analytics.studentsCount}
          </p>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">Registered in tenant</span>
        </Link>

        <Link
          href="/dashboard/courses"
          className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-muted)]">
              {t("dashboard.page.myCoursesTitle", "Courses")}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition">
            {analytics.coursesCount}
          </p>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">Published & drafts</span>
        </Link>

        <Link
          href="/dashboard/statistics"
          className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-primary)]/40 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-muted)]">
              {t("dashboard.statisticsPage.cardEnrollments", "Enrollments")}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition">
            {analytics.totalEnrollments}
          </p>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">Total student seats</span>
        </Link>

        <Link
          href="/dashboard/statistics"
          className="group rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-light)]/10 p-5 transition hover:border-[var(--color-primary)]/60 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-primary)]">Course Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--color-primary)]">
            {analytics.courseRevenue.toFixed(2)} {egp}
          </p>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">From active enrollments</span>
        </Link>
      </div>

      {/* Operations Navigation Shortcuts */}
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">Operations & Tools</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <Link
            href="/dashboard/courses"
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
          >
            <BookOpen className="h-5 w-5 text-[var(--color-primary)]" />
            <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Courses</span>
          </Link>
          <Link
            href="/dashboard/students"
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
          >
            <Users className="h-5 w-5 text-blue-500" />
            <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Students</span>
          </Link>
          <Link
            href="/dashboard/assignments"
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
          >
            <FileCheck className="h-5 w-5 text-amber-500" />
            <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Assignments</span>
          </Link>
          <Link
            href="/dashboard/quizzes"
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Quizzes</span>
          </Link>
          <Link
            href="/dashboard/store"
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
          >
            <ShoppingBag className="h-5 w-5 text-purple-500" />
            <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Store</span>
          </Link>
          <Link
            href="/dashboard/subscription-students"
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
          >
            <CreditCard className="h-5 w-5 text-indigo-500" />
            <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Subscriptions</span>
          </Link>
          <Link
            href="/dashboard/messages"
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
          >
            <MessageSquare className="h-5 w-5 text-teal-500" />
            <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Messages</span>
          </Link>
          <Link
            href="/dashboard/live-streams"
            className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
          >
            <Radio className="h-5 w-5 text-rose-500" />
            <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Live Streams</span>
          </Link>
          {isOwnerOrAdmin && (
            <Link
              href="/dashboard/website"
              className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
            >
              <Globe className="h-5 w-5 text-cyan-500" />
              <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Website</span>
            </Link>
          )}
          {isOwnerOrAdmin && (
            <Link
              href="/dashboard/settings"
              className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-center transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface)]"
            >
              <Settings className="h-5 w-5 text-slate-500" />
              <span className="mt-2 text-xs font-semibold text-[var(--color-foreground)]">Settings</span>
            </Link>
          )}
        </div>
      </section>

      {/* Two Column Grid: Pending Submissions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Assignment Submissions (Actionable for teachers) */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--color-foreground)]">
              Submissions Awaiting Grading ({pendingSubmissions.length})
            </h2>
            <Link href="/dashboard/assignments" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
              View assignments →
            </Link>
          </div>

          {pendingSubmissions.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">All student submissions have been reviewed.</p>
          ) : (
            <div className="space-y-2">
              {pendingSubmissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm">
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">{s.studentName}</p>
                    <p className="text-xs text-[var(--color-muted)]">{s.assignmentTitle}</p>
                  </div>
                  <div className="text-end">
                    <span className="rounded bg-amber-500/15 text-amber-600 px-2 py-0.5 text-xs font-semibold block">
                      Needs Review
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)] block mt-0.5">
                      {formatDate(s.submittedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Enrollments */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--color-foreground)]">Recent Enrollments</h2>
            <Link href="/dashboard/students" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
              View students →
            </Link>
          </div>

          {recentEnrollments.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">No recent enrollments recorded.</p>
          ) : (
            <div className="space-y-2">
              {recentEnrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm">
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">{e.studentName}</p>
                    <p className="text-xs text-[var(--color-muted)]">{e.studentEmail}</p>
                  </div>
                  <div className="text-end">
                    <span className="font-medium text-[var(--color-primary)] text-xs block">
                      {e.courseTitle}
                    </span>
                    <span className="text-[10px] text-[var(--color-muted)] block">
                      {formatDate(e.enrolledAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
