import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { findManagedCourseForTenant } from "@/modules/courses/repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { EditCourseForm, type ContentOrderEntry } from "./EditCourseForm";

type Props = { params: Promise<{ id: string }> };

/** ترتيب الحصص والاختبارات كما يُعرض للطالب (حسب حقل order في الجدول) */
function initialContentOrderFromRows(
  lessonRows: Record<string, unknown>[],
  quizRows: Record<string, unknown>[]
): ContentOrderEntry[] {
  type Sortable = ContentOrderEntry & { sortKey: number };
  const entries: Sortable[] = [];
  for (let i = 0; i < lessonRows.length; i++) {
    const row = lessonRows[i];
    const o = row.order;
    const sortKey = typeof o === "number" && Number.isFinite(o) ? o : i;
    entries.push({ type: "lesson", index: i, sortKey });
  }
  for (let i = 0; i < quizRows.length; i++) {
    const row = quizRows[i];
    const o = row.order;
    const sortKey = typeof o === "number" && Number.isFinite(o) ? o : lessonRows.length + i;
    entries.push({ type: "quiz", index: i, sortKey });
  }
  entries.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    if (a.type !== b.type) return a.type === "lesson" ? -1 : 1;
    return a.index - b.index;
  });
  return entries.map(({ type, index }) => ({ type, index }));
}

export default async function EditCoursePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const actor = await requireDashboardTenantActor("MANAGE_COURSES");

  const { id } = await params;
  const c = await findManagedCourseForTenant(actor.tenantId, id, actor);
  if (!c) notFound();
  const data = { course: c, lessons: c.lessons, quizzes: c.quizzes };
  const initialData = {
    id: c.id, titleEn: c.title, titleAr: c.titleAr ?? "", descriptionAr: c.description,
    descriptionEn: c.descriptionEn ?? "", shortDescAr: c.shortDesc ?? "", shortDescEn: c.shortDescEn ?? "",
    imageUrl: c.imageUrl ?? "", price: String(Number(c.price)), isPublished: c.isPublished,
    maxQuizAttempts: c.maxQuizAttempts, categoryId: c.categoryId ?? "",
    lessons: data.lessons.map((l) => {
      const row = l as Record<string, unknown>;
      return {
        id: typeof row.id === "string" ? row.id : undefined,
        title: String(row.title ?? ""),
        videoUrl: String(row.videoUrl ?? row.video_url ?? ""),
        content: String(row.content ?? ""),
        pdfUrl: String(row.pdfUrl ?? row.pdf_url ?? ""),
        acceptsHomework: Boolean(row.acceptsHomework ?? row.accepts_homework ?? false),
        playbackRequiredMinutes: String(row.playbackRequiredMinutes ?? row.playback_required_minutes ?? 15),
        playbackMaxAttempts: String(row.playbackMaxAttempts ?? row.playback_max_attempts ?? 3),
      };
    }),
    quizzes: data.quizzes.map((q) => {
      const row = q as Record<string, unknown>;
      const rawLimit = row.timeLimitMinutes ?? row.time_limit_minutes;
      const timeLimitMinutes =
        typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit >= 1
          ? rawLimit
          : typeof rawLimit === "string" && rawLimit.trim() !== ""
            ? Math.floor(Number(rawLimit))
            : null;
      const questions = (row.questions ?? []) as Array<Record<string, unknown>>;
      return {
        id: typeof row.id === "string" ? row.id : undefined,
        title: String(row.title ?? ""),
        timeLimitMinutes: timeLimitMinutes != null && Number.isFinite(timeLimitMinutes) && timeLimitMinutes >= 1 ? timeLimitMinutes : null,
        questions: questions.map((qt) => ({
          id: typeof qt.id === "string" ? qt.id : undefined,
          type: (qt.type === "ESSAY" || qt.type === "TRUE_FALSE" ? qt.type : "MULTIPLE_CHOICE") as "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE",
          questionText: String(qt.questionText ?? qt.question_text ?? ""),
          options: ((qt.options ?? []) as Array<Record<string, unknown>>).map((o) => ({
            id: typeof o.id === "string" ? o.id : undefined,
            text: String(o.text ?? ""),
            isCorrect: Boolean(o.isCorrect ?? o.is_correct),
          })),
        })),
      };
    }),
    contentOrder: initialContentOrderFromRows(
      data.lessons as Record<string, unknown>[],
      data.quizzes as Record<string, unknown>[]
    ),
  };

  return (
    <div>
      <Link
        href="/dashboard/courses"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← العودة إلى إدارة الكورسات
      </Link>
      <h2 className="mt-4 text-xl font-bold text-[var(--color-foreground)]">
        تعديل الدورة
      </h2>
      <EditCourseForm courseId={id} initialData={initialData} />
    </div>
  );
}
