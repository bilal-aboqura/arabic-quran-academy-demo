"use client";

import Link from "next/link";
import { BookOpen, Clock, GraduationCap, Star, ArrowUpRight } from "lucide-react";
import { useLocale, useT } from "./LocaleProvider";

function normalizeCoursePrice(
  price: number | { toNumber?: () => number } | string | undefined,
): number | null {
  if (price === undefined || price === null || price === "") return null;
  if (typeof price === "object" && price !== null && typeof price.toNumber === "function") {
    const n = price.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(price);
  return Number.isFinite(n) ? n : null;
}

type Course = {
  id: string;
  title: string;
  titleAr?: string | null;
  slug?: string | null;
  shortDesc?: string | null;
  shortDescEn?: string | null;
  duration?: string | null;
  level?: string | null;
  imageUrl?: string | null;
  price?: number | { toNumber?: () => number } | string;
  courseRating?: number | { toNumber?: () => number } | string | null;
  courseRatingCount?: number | { toNumber?: () => number } | string | null;
  category?: { name: string; nameAr?: string | null } | null;
};

export function CourseCard({ course }: { course: Course }) {
  const locale = useLocale();
  const t = useT();
  const displayTitle = locale === "en" ? (course.title || course.titleAr) : (course.titleAr || course.title);
  const categoryName =
    locale === "en"
      ? (course.category?.name || course.category?.nameAr)
      : (course.category?.nameAr || course.category?.name);
  const shortDescription =
    locale === "en" ? (course.shortDescEn || course.shortDesc) : (course.shortDesc || course.shortDescEn);
  const slugOrId = (course.slug && course.slug.trim()) ? encodeURIComponent(course.slug.trim()) : course.id;
  const href = slugOrId ? `/courses/${slugOrId}` : "/courses";
  const priceValue = normalizeCoursePrice(course.price);
  const courseRatingValue = normalizeCoursePrice(course.courseRating ?? undefined);
  const courseRatingCountValue = normalizeCoursePrice(course.courseRatingCount ?? undefined);
  const hasCourseRating =
    courseRatingValue !== null &&
    courseRatingValue > 0 &&
    courseRatingCountValue !== null &&
    courseRatingCountValue > 0;
  const priceDisplay =
    priceValue !== null && priceValue > 0 ? priceValue.toFixed(2) : null;
  const isPaid = priceDisplay !== null;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-hover)]"
    >
      {/* Course Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900 flex items-center justify-center">
        {course.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-103"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
            <BookOpen className="h-10 w-10 stroke-[1.5] text-slate-500 group-hover:text-[var(--color-primary)] transition-colors" />
          </div>
        )}

        {/* Category Pill Overlay */}
        {categoryName && (
          <span className="absolute top-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
            {categoryName}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-black leading-snug text-[var(--color-foreground)] transition group-hover:text-[var(--color-primary)] line-clamp-2">
            {displayTitle}
          </h3>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        {shortDescription && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">
            {shortDescription}
          </p>
        )}

        {/* Metadata Strip */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)]/50 pt-3 text-[11px] font-medium text-[var(--color-muted)]">
          {hasCourseRating ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span>{courseRatingValue.toFixed(1)}</span>
              <span className="font-normal opacity-70">({Math.round(courseRatingCountValue)})</span>
            </span>
          ) : null}

          {course.duration && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-border)]/40 px-2 py-0.5">
              <Clock className="h-3.5 w-3.5 text-[var(--color-muted)]" />
              <span>{course.duration}</span>
            </span>
          )}

          {course.level && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-border)]/40 px-2 py-0.5">
              <GraduationCap className="h-3.5 w-3.5 text-[var(--color-muted)]" />
              <span>
                {course.level === "beginner" && t("common.beginner", "Beginner")}
                {course.level === "intermediate" && t("common.intermediate", "Intermediate")}
                {course.level === "advanced" && t("common.advanced", "Advanced")}
              </span>
            </span>
          )}
        </div>

        {/* Price Tag Strip */}
        <div className="mt-4 flex items-center justify-between pt-2 border-t border-[var(--color-border)]/40">
          <div className="shrink-0">
            {isPaid ? (
              <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--color-primary)]/10 px-3 py-1 text-sm font-black text-[var(--color-primary)]">
                <span>{priceDisplay}</span>
                <span className="text-[10px] uppercase font-bold text-[var(--color-muted)]">
                  {t("common.egyptianPoundShort", "EGP")}
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                {t("common.free", "Free")}
              </span>
            )}
          </div>

          <span className="text-xs font-bold text-[var(--color-primary)] transition">
            {t("courses.viewCourse", "عرض الدورة ↗")}
          </span>
        </div>
      </div>
    </Link>
  );
}
