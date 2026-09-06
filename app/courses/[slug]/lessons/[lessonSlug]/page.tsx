import Link from "next/link";
import { headers } from "next/headers";
import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowLeft, FileText, Clock, BookOpen } from "lucide-react";
import { getTenantActor } from "@/modules/tenants/actor";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import {
  findAccessibleLessonBySlugForTenant,
  findAccessibleLessonForTenant,
  findPublishedCourseMarketingBySlugForTenant,
  findCourseOutlineForTenant,
} from "@/modules/courses/repository";
import { getPlaybackStateForTenant } from "@/modules/courses/playback.repository";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";
import { LimitedLessonVideoPlayer } from "@/components/LimitedLessonVideoPlayer";
import { resolveVideoSource } from "@/modules/video/provider";
import { CourseOutlineSidebar } from "@/components/CourseOutlineSidebar";
import { LessonHomeworkSection } from "./LessonHomeworkSection";
import { LessonRatingSection } from "./LessonRatingSection";
import { LessonProgressControl } from "./LessonProgressControl";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";

type Props = { params: Promise<{ slug: string; lessonSlug: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

function decoded(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function looksLikeId(value: string) {
  return /^c[a-z0-9]{24}$/i.test(value);
}

export default async function LessonPage({ params }: Props) {
  unstable_noStore();
  const [{ slug, lessonSlug }, requestHeaders, t, locale] = await Promise.all([
    params,
    headers(),
    getServerTranslator(),
    getLocaleFromCookie(),
  ]);

  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) notFound();
  const actor = await getTenantActor(tenant);
  if (!actor) notFound();
  const course = await findPublishedCourseMarketingBySlugForTenant(tenant.tenantId, decoded(slug));
  if (!course) notFound();

  const lessonKey = decoded(lessonSlug);
  const accessible = looksLikeId(lessonKey)
    ? await findAccessibleLessonForTenant(tenant.tenantId, lessonKey, actor).then((lesson) =>
        lesson?.courseId === course.id ? { lesson } : null,
      )
    : await findAccessibleLessonBySlugForTenant({
        tenantId: tenant.tenantId,
        courseId: course.id,
        lessonSlug: lessonKey,
        actor,
      });
  if (!accessible) notFound();
  const { lesson } = accessible;

  const [playback, outline] = await Promise.all([
    actor.role === "STUDENT"
      ? getPlaybackStateForTenant({ tenantId: tenant.tenantId, userId: actor.userId, lesson })
      : null,
    findCourseOutlineForTenant(tenant.tenantId, course.id),
  ]);

  const videoSource = resolveVideoSource(lesson.videoUrl);
  const isRtl = locale === "ar";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-[var(--color-muted)]">
        <Link
          href={`/courses/${encodeURIComponent(course.slug)}`}
          className="flex items-center gap-1.5 transition hover:text-[var(--color-primary)]"
        >
          {isRtl ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
          <span>{course.titleAr || course.title}</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--color-foreground)] truncate max-w-xs sm:max-w-md">
          {lesson.titleAr || lesson.title}
        </span>
      </nav>

      {/* Grid: Video + Content (Left) & Outline Sidebar (Right) */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <article className="space-y-6 min-w-0">
          {/* Theater Video Container */}
          <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-black shadow-lg">
            {videoSource?.provider === "YOUTUBE" ? (
              <div className="w-full">
                {playback?.enabled ? (
                  <LimitedLessonVideoPlayer
                    lessonId={lesson.id}
                    youtubeVideoId={videoSource.videoId}
                    storageKey={lesson.id}
                    initialState={playback}
                  />
                ) : (
                  <PlyrVideoPlayer
                    youtubeVideoId={videoSource.videoId}
                    storageKey={lesson.id}
                    className="w-full"
                  />
                )}
              </div>
            ) : null}

            {videoSource?.provider === "BUNNY" ? (
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <iframe
                  src={videoSource.embedUrl}
                  loading="lazy"
                  className="h-full w-full border-0"
                  allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                  allowFullScreen
                />
              </div>
            ) : null}

            {videoSource?.provider === "HTML5" ? (
              <video className="w-full aspect-video bg-black" controls src={videoSource.srcUrl} />
            ) : null}
          </div>

          {/* Lesson Details & Meta */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-black text-[var(--color-foreground)] sm:text-2xl">
                {lesson.titleAr || lesson.title}
              </h1>

              {playback ? (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)]">
                  <Clock className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  <span>
                    {isRtl
                      ? `تمت مشاهدة ${Math.floor(playback.watchedSeconds / 60)} دقيقة`
                      : `${Math.floor(playback.watchedSeconds / 60)} mins watched`}
                  </span>
                </div>
              ) : null}
            </div>

            {/* PDF Attachment Link */}
            {lesson.pdfUrl ? (
              <div className="pt-2">
                <a
                  href={lesson.pdfUrl.startsWith("tenants/") ? `/api/files/lessons/${lesson.id}/pdf` : lesson.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)]/10 px-4 py-2.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-xs"
                >
                  <FileText className="h-4 w-4" />
                  <span>{isRtl ? "تحميل ملزمة / مذكرة الدرس (PDF)" : "Download Lesson Notes (PDF)"}</span>
                </a>
              </div>
            ) : null}

            {/* Lesson Content / Notes */}
            {lesson.content ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 text-sm leading-relaxed whitespace-pre-line text-[var(--color-foreground)]">
                {lesson.content}
              </div>
            ) : null}

            {/* Progress & Interactivity */}
            {actor.role === "STUDENT" ? (
              <div className="border-t border-[var(--color-border)]/60 pt-5 space-y-5">
                <LessonProgressControl courseId={course.id} lessonId={lesson.id} />
                {lesson.acceptsHomework ? <LessonHomeworkSection lessonId={lesson.id} /> : null}
                <LessonRatingSection lessonId={lesson.id} />
              </div>
            ) : null}
          </div>
        </article>

        {/* Outline Sidebar (Desktop) */}
        {outline && (
          <aside className="hidden lg:block">
            <CourseOutlineSidebar
              course={course}
              lessons={outline.lessons}
              quizzes={outline.quizzes}
              currentLessonId={lesson.id}
            />
          </aside>
        )}
      </div>
    </main>
  );
}
