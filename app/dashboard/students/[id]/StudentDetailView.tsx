"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddBalanceButton } from "../AddBalanceButton";
import { useLocale, useT } from "@/components/LocaleProvider";
import { useDashboardTable, dateLocaleForUi } from "@/lib/i18n/dashboard-table";

export type StudentCourseEnrollment = {
  id: string;
  courseId: string;
  title: string;
  titleAr: string | null;
  slug: string;
  price: number;
  lessonsCount: number;
  quizzesCount: number;
  enrolledAt: string;
  progressPercent: number;
  completedLessons: number;
  lastAccessedAt: string | null;
};

export type StudentQuizAttemptRow = {
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

export type StudentAssignmentRow = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  status: string;
  score: number | null;
  maxScore: number;
  submittedAt: string | null;
  feedback: string | null;
};

export type StudentWalletTransactionRow = {
  id: string;
  kind: string;
  amount: number;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
};

export type StudentSubscriptionRow = {
  id: string;
  planName: string;
  pricePaid: number;
  expiresAt: string;
  createdAt: string;
  isActive: boolean;
};

export type StudentDetailProps = {
  student: {
    id: string;
    membershipId: string;
    name: string;
    email: string;
    student_number: string | null;
    guardian_number: string | null;
    copyright_code: string | null;
    balance: number;
    createdAt: string;
  };
  enrollments: StudentCourseEnrollment[];
  quizAttempts: StudentQuizAttemptRow[];
  assignments: StudentAssignmentRow[];
  walletTransactions: StudentWalletTransactionRow[];
  subscriptions: StudentSubscriptionRow[];
  availableCourses: Array<{ id: string; title: string; titleAr: string | null }>;
  canManageEnrollments: boolean;
  canManageWallet: boolean;
};

export function StudentDetailView({
  student,
  enrollments,
  quizAttempts,
  assignments,
  walletTransactions,
  subscriptions,
  availableCourses,
  canManageEnrollments,
  canManageWallet,
}: StudentDetailProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { dir, thClassCompact } = useDashboardTable();
  const dateLoc = dateLocaleForUi(locale);
  const egp = t("common.egyptianPoundShort", "EGP");
  const dash = "—";

  const [activeTab, setActiveTab] = useState<"courses" | "quizzes" | "assignments" | "wallet" | "subscriptions">("courses");
  const [addCourseId, setAddCourseId] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
  const coursesToAdd = availableCourses.filter((c) => !enrolledCourseIds.has(c.id));

  function formatDate(iso: string) {
    try {
      return new Intl.DateTimeFormat(dateLoc, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  function formatShortDate(iso: string) {
    try {
      return new Intl.DateTimeFormat(dateLoc, { dateStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!addCourseId.trim()) return;
    setEnrollError("");
    setEnrollLoading(true);
    const res = await fetch(`/api/dashboard/students/${student.id}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: addCourseId }),
    });
    const data = await res.json().catch(() => ({}));
    setEnrollLoading(false);
    if (!res.ok) {
      setEnrollError(data.error ?? "Failed to enroll student");
      return;
    }
    setAddCourseId("");
    router.refresh();
  }

  async function handleRemoveCourse(courseId: string) {
    const ok = window.confirm(t("dashboard.studentsPage.confirmRemoveEnrollment", "Are you sure you want to remove this course enrollment?"));
    if (!ok) return;
    setEnrollLoading(true);
    const res = await fetch(`/api/dashboard/students/${student.id}/enrollments/${courseId}`, {
      method: "DELETE",
    });
    setEnrollLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to remove enrollment");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <Link
          href="/dashboard/students"
          className="text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          ← {t("dashboard.studentsPage.pageTitleStudentsOnly", "Student list")}
        </Link>
      </div>

      {/* Student Summary Card */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[var(--color-foreground)]">{student.name}</h2>
              {student.copyright_code ? (
                <span className="rounded-[var(--radius-btn)] border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--color-primary)]">
                  {student.copyright_code}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{student.email}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--color-foreground)]">
              <span>
                <strong className="text-[var(--color-muted)]">{t("dashboard.studentsPage.colStudentNumber", "Student number")}: </strong>
                {student.student_number || dash}
              </span>
              <span>
                <strong className="text-[var(--color-muted)]">{t("dashboard.studentsPage.colGuardianNumber", "Guardian number")}: </strong>
                {student.guardian_number || dash}
              </span>
              <span>
                <strong className="text-[var(--color-muted)]">Joined: </strong>
                {formatShortDate(student.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-end">
              <span className="text-xs text-[var(--color-muted)] block">{t("dashboard.studentsPage.colBalance", "Wallet Balance")}</span>
              <span className="text-2xl font-bold text-[var(--color-primary)]">
                {student.balance.toFixed(2)} {egp}
              </span>
            </div>
            {canManageWallet && (
              <AddBalanceButton studentId={student.id} studentName={student.name} />
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("courses")}
          className={`rounded-[var(--radius-btn)] px-4 py-2 text-sm font-medium transition ${
            activeTab === "courses"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
          }`}
        >
          {t("dashboard.page.myCoursesTitle", "Enrolled Courses")} ({enrollments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quizzes")}
          className={`rounded-[var(--radius-btn)] px-4 py-2 text-sm font-medium transition ${
            activeTab === "quizzes"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
          }`}
        >
          {t("dashboard.statisticsPage.cardAttemptsTitle", "Quiz Results")} ({quizAttempts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          className={`rounded-[var(--radius-btn)] px-4 py-2 text-sm font-medium transition ${
            activeTab === "assignments"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
          }`}
        >
          Assignments ({assignments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("wallet")}
          className={`rounded-[var(--radius-btn)] px-4 py-2 text-sm font-medium transition ${
            activeTab === "wallet"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
          }`}
        >
          Wallet Ledger ({walletTransactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("subscriptions")}
          className={`rounded-[var(--radius-btn)] px-4 py-2 text-sm font-medium transition ${
            activeTab === "subscriptions"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
          }`}
        >
          Subscriptions ({subscriptions.length})
        </button>
      </div>

      {/* TAB 1: Enrolled Courses & Progress */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          {canManageEnrollments && coursesToAdd.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">
                {t("dashboard.studentsPage.addCourseLabel", "Enroll student in another course")}
              </h3>
              {enrollError ? <p className="mb-2 text-sm text-red-600 dark:text-red-400">{enrollError}</p> : null}
              <form onSubmit={handleAddCourse} className="flex flex-wrap items-center gap-3">
                <select
                  value={addCourseId}
                  onChange={(e) => setAddCourseId(e.target.value)}
                  className="min-w-[240px] rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                >
                  <option value="">{t("dashboard.studentsPage.selectCoursePlaceholder", "— Choose a course —")}</option>
                  {coursesToAdd.map((c) => (
                    <option key={c.id} value={c.id}>{c.titleAr ?? c.title}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={enrollLoading || !addCourseId}
                  className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {enrollLoading ? "..." : t("dashboard.studentsPage.add", "Enroll")}
                </button>
              </form>
            </div>
          )}

          {enrollments.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-muted)]">
              {t("dashboard.studentsPage.noEnrollmentsYet", "No enrollments found for this student.")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {enrollments.map((e) => (
                <div key={e.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-[var(--color-foreground)]">{e.titleAr || e.title}</h4>
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        Enrolled: {formatShortDate(e.enrolledAt)}
                      </p>
                    </div>
                    {canManageEnrollments && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(e.courseId)}
                        disabled={enrollLoading}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        {t("dashboard.studentsPage.remove", "Remove")}
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1">
                      <span>Progress</span>
                      <span className="font-semibold text-[var(--color-foreground)]">{e.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, e.progressPercent))}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-[var(--color-muted)]">
                      <span>{e.completedLessons} / {e.lessonsCount} lessons completed</span>
                      <span>{e.quizzesCount} quizzes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Quiz Results */}
      {activeTab === "quizzes" && (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50">
                <th className={thClassCompact}>Quiz</th>
                <th className={thClassCompact}>Course</th>
                <th className={thClassCompact}>Score</th>
                <th className={thClassCompact}>Percentage</th>
                <th className={thClassCompact}>Result</th>
                <th className={thClassCompact}>Date</th>
              </tr>
            </thead>
            <tbody>
              {quizAttempts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--color-muted)]">
                    No quiz attempts recorded for this student.
                  </td>
                </tr>
              ) : (
                quizAttempts.map((q) => (
                  <tr key={q.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-3 font-medium text-[var(--color-foreground)]">{q.quizTitle}</td>
                    <td className="p-3 text-[var(--color-muted)]">{q.courseTitle}</td>
                    <td className="p-3 font-mono text-[var(--color-foreground)]">{q.score} / {q.totalQuestions}</td>
                    <td className="p-3 font-semibold">{q.percentage}%</td>
                    <td className="p-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                        q.passed ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-600 dark:text-red-400"
                      }`}>
                        {q.passed ? "Passed" : "Needs Review"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-[var(--color-muted)]">{formatDate(q.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Assignment History */}
      {activeTab === "assignments" && (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50">
                <th className={thClassCompact}>Assignment</th>
                <th className={thClassCompact}>Course</th>
                <th className={thClassCompact}>Status</th>
                <th className={thClassCompact}>Grade</th>
                <th className={thClassCompact}>Submitted Date</th>
                <th className={thClassCompact}>Teacher Feedback</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--color-muted)]">
                    No assignment submissions recorded for this student.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-3 font-medium text-[var(--color-foreground)]">{a.assignmentTitle}</td>
                    <td className="p-3 text-[var(--color-muted)]">{a.courseTitle}</td>
                    <td className="p-3">
                      <span className="rounded bg-[var(--color-background)] px-2 py-0.5 text-xs font-medium text-[var(--color-foreground)] border border-[var(--color-border)]">
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-semibold">
                      {a.score != null ? `${a.score} / ${a.maxScore}` : dash}
                    </td>
                    <td className="p-3 text-xs text-[var(--color-muted)]">
                      {a.submittedAt ? formatDate(a.submittedAt) : dash}
                    </td>
                    <td className="p-3 text-sm text-[var(--color-foreground)] max-w-xs truncate">
                      {a.feedback || dash}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: Wallet Ledger */}
      {activeTab === "wallet" && (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50">
                <th className={thClassCompact}>Type</th>
                <th className={thClassCompact}>Amount</th>
                <th className={thClassCompact}>Reference</th>
                <th className={thClassCompact}>Date</th>
              </tr>
            </thead>
            <tbody>
              {walletTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-[var(--color-muted)]">
                    No wallet transactions recorded for this student account.
                  </td>
                </tr>
              ) : (
                walletTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-3 font-medium text-[var(--color-foreground)]">{tx.kind}</td>
                    <td className={`p-3 font-semibold ${tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} {egp}
                    </td>
                    <td className="p-3 text-sm text-[var(--color-muted)] max-w-sm">
                      {tx.referenceType ? `${tx.referenceType}: ${tx.referenceId ?? ""}` : dash}
                    </td>
                    <td className="p-3 text-xs text-[var(--color-muted)]">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: Subscriptions */}
      {activeTab === "subscriptions" && (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50">
                <th className={thClassCompact}>Plan</th>
                <th className={thClassCompact}>Price Paid</th>
                <th className={thClassCompact}>Status</th>
                <th className={thClassCompact}>Expires At</th>
                <th className={thClassCompact}>Subscribed At</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[var(--color-muted)]">
                    No active or past subscriptions for this student.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-3 font-medium text-[var(--color-foreground)]">{sub.planName}</td>
                    <td className="p-3 tabular-nums">{sub.pricePaid.toFixed(2)} {egp}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                        sub.isActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400"
                      }`}>
                        {sub.isActive ? "Active" : "Expired"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-[var(--color-muted)]">{formatDate(sub.expiresAt)}</td>
                    <td className="p-3 text-xs text-[var(--color-muted)]">{formatDate(sub.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
