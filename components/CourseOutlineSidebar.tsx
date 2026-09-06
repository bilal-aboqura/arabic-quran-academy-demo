import Link from "next/link";
import { PlayCircle, HelpCircle, BookOpen } from "lucide-react";
import { getServerTranslator } from "@/lib/i18n/server";

function courseSeg(course: { slug?: string | null; id: string }): string {
  const s = (course.slug && course.slug.trim()) ? String(course.slug).trim() : "";
  const normalized = s ? s.replace(/-+$/, "").replace(/^-+/, "") : "";
  return normalized ? encodeURIComponent(normalized) : (course as { id: string }).id;
}

function lessonHref(course: { slug?: string | null; id: string }, lesson: { slug?: string | null; id: string }): string {
  const seg = courseSeg(course);
  const lessonSeg = (lesson.slug && lesson.slug.trim()) ? encodeURIComponent(lesson.slug.trim()) : lesson.id;
  return `/courses/${seg}/lessons/${lessonSeg}`;
}

function quizHref(course: { slug?: string | null; id: string }, quizId: string): string {
  return `/courses/${courseSeg(course)}/quizzes/${encodeURIComponent(quizId)}`;
}

type Props = {
  course: { id: string; slug?: string | null };
  lessons: Array<Record<string, unknown> & { id: string; title?: string; titleAr?: string | null; order?: number }>;
  quizzes: Array<Record<string, unknown> & { id: string; title?: string; order?: number; _count?: { questions?: number } }>;
  currentLessonId?: string | null;
  currentQuizId?: string | null;
};

export async function CourseOutlineSidebar({ course, lessons, quizzes, currentLessonId, currentQuizId }: Props) {
  const t = await getServerTranslator();
  const lessonOrder = (l: { order?: number }) => (typeof l.order === "number" ? l.order : 999);
  const quizOrder = (q: { order?: number }) => (typeof q.order === "number" ? q.order : 999);
  const items = [
    ...lessons.map((l) => ({ type: "lesson" as const, order: lessonOrder(l), data: l })),
    ...quizzes.map((q) => ({ type: "quiz" as const, order: quizOrder(q), data: q })),
  ].sort((a, b) => a.order - b.order);

  return (
    <div className="sticky top-24 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 border-b border-[var(--color-border)]/60 pb-2.5">
        <BookOpen className="h-4 w-4 text-[var(--color-primary)]" />
        <h2 className="text-xs font-black uppercase tracking-wide text-[var(--color-foreground)]">
          {t("courses.courseContent", "منهج الدورة")}
        </h2>
      </div>

      <ul className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
        {items.map((item, i) => {
          if (item.type === "lesson") {
            const l = item.data;
            const isCurrent = l.id === currentLessonId;
            const title = String((l as Record<string, unknown>).titleAr ?? (l as Record<string, unknown>).title ?? "");
            return (
              <li key={`l-${l.id}`}>
                <Link
                  href={lessonHref(course, l)}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition ${
                    isCurrent
                      ? "bg-[var(--color-primary)] text-white font-bold shadow-xs"
                      : "text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  <PlayCircle className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? "text-white" : "text-[var(--color-muted)]"}`} />
                  <span className="truncate">{title}</span>
                </Link>
              </li>
            );
          }
          const q = item.data;
          const isCurrent = q.id === currentQuizId;
          const title = String((q as Record<string, unknown>).title ?? "");
          const qCount = (q as { _count?: { questions?: number } })._count;
          const count = qCount != null && typeof qCount === "object" && "questions" in qCount ? Number(qCount.questions) || 0 : 0;
          return (
            <li key={`q-${q.id}`}>
              <Link
                href={quizHref(course, q.id)}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition ${
                  isCurrent
                    ? "bg-amber-500 text-white font-bold shadow-xs"
                    : "text-[var(--color-foreground)] hover:bg-[var(--color-background)] hover:text-amber-600"
                }`}
              >
                <HelpCircle className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? "text-white" : "text-amber-500"}`} />
                <span className="truncate">{title}</span>
                {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
