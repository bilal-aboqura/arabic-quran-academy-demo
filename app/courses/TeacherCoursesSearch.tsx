"use client";

import { useMemo, useState } from "react";
import { Search, X, BookOpen, SearchX } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { useLocale, useT } from "@/components/LocaleProvider";

type CategoryShape = {
  slug?: string;
  name?: string;
  nameAr?: string | null;
  name_ar?: string | null;
} | null;

export type TeacherCourseListItem = {
  id: string;
  title: string;
  titleAr?: string | null;
  title_ar?: string | null;
  slug?: string | null;
  shortDesc?: string | null;
  shortDescEn?: string | null;
  short_desc?: string | null;
  short_desc_en?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  price?: unknown;
  courseRating?: unknown;
  courseRatingCount?: unknown;
  course_rating?: unknown;
  course_rating_count?: unknown;
  duration?: string | null;
  level?: string | null;
  category?: CategoryShape;
};

function normalizeSearch(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function categoryLabel(cat: CategoryShape): string {
  if (!cat) return "بدون تصنيف";
  const ar = (cat.nameAr ?? cat.name_ar)?.trim();
  if (ar) return ar;
  const n = cat.name?.trim();
  if (n) return n;
  return "بدون تصنيف";
}

function groupCoursesByCategory(courses: TeacherCourseListItem[]) {
  const map = new Map<string, { label: string; courses: TeacherCourseListItem[] }>();
  const order: string[] = [];
  for (const course of courses) {
    const cat = course.category ?? null;
    const key = cat?.slug?.trim() || "__uncategorized__";
    const label = categoryLabel(cat);
    let entry = map.get(key);
    if (!entry) {
      entry = { label, courses: [] };
      map.set(key, entry);
      order.push(key);
    }
    entry.courses.push(course);
  }
  return order.map((slugKey) => {
    const { label, courses: groupCourses } = map.get(slugKey)!;
    return { slugKey, label, courses: groupCourses };
  });
}

export function courseMatchesSearchQuery(course: TeacherCourseListItem, rawQuery: string) {
  const q = normalizeSearch(rawQuery);
  if (!q) return true;
  const titleAr = (course.titleAr ?? course.title_ar ?? "").toLowerCase();
  const title = (course.title ?? "").toLowerCase();
  const short = (course.shortDesc ?? course.short_desc ?? "").toLowerCase();
  const shortEn = (course.shortDescEn ?? course.short_desc_en ?? "").toLowerCase();
  const slug = (course.slug ?? "").toLowerCase();
  const cat = course.category;
  const catAr = (cat?.nameAr ?? cat?.name_ar ?? "").toLowerCase();
  const catName = (cat?.name ?? "").toLowerCase();
  const catSlug = (cat?.slug ?? "").toLowerCase();
  return (
    titleAr.includes(q) ||
    title.includes(q) ||
    short.includes(q) ||
    shortEn.includes(q) ||
    slug.includes(q) ||
    catAr.includes(q) ||
    catName.includes(q) ||
    catSlug.includes(q)
  );
}

function toCourseCardProps(c: TeacherCourseListItem) {
  const cat = c.category;
  return {
    id: c.id,
    title: c.title,
    titleAr: c.titleAr ?? c.title_ar ?? null,
    slug: c.slug ?? null,
    shortDesc: c.shortDesc ?? c.short_desc ?? null,
    shortDescEn: c.shortDescEn ?? c.short_desc_en ?? null,
    imageUrl: c.imageUrl ?? c.image_url ?? null,
    price: c.price as number | string | { toNumber?: () => number } | undefined,
    courseRating: (c.courseRating ?? c.course_rating ?? null) as
      | number
      | string
      | { toNumber?: () => number }
      | null,
    courseRatingCount: (c.courseRatingCount ?? c.course_rating_count ?? null) as
      | number
      | string
      | { toNumber?: () => number }
      | null,
    duration: c.duration ?? null,
    level: c.level ?? null,
    category: cat
      ? {
          name: cat.name ?? "",
          nameAr: cat.nameAr ?? cat.name_ar ?? null,
        }
      : null,
  };
}

export function TeacherCoursesSearch({
  courses,
  groupByCategory = true,
}: {
  courses: TeacherCourseListItem[];
  groupByCategory?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const locale = useLocale();
  const t = useT();

  // Extract unique categories for quick filter pills
  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) {
      if (c.category?.slug) {
        map.set(c.category.slug, categoryLabel(c.category));
      }
    }
    return Array.from(map.entries()).map(([slug, label]) => ({ slug, label }));
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchesText = courseMatchesSearchQuery(c, query);
      const matchesCat =
        selectedCategory === "ALL" || c.category?.slug === selectedCategory;
      return matchesText && matchesCat;
    });
  }, [courses, query, selectedCategory]);

  const groups = useMemo(() => groupCoursesByCategory(filtered), [filtered]);
  const inputId = groupByCategory ? "teacher-courses-search" : "all-courses-search";

  return (
    <div className="space-y-8">
      {/* Search & Category Filter Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search Input with Vector Icon */}
        <div className="relative w-full max-w-lg">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)] rtl:right-4 ltr:left-4" />
          <input
            id={inputId}
            type="search"
            dir={locale === "ar" ? "rtl" : "ltr"}
            autoComplete="off"
            placeholder={
              locale === "ar"
                ? t("courses.searchPlaceholder", "ابحث باسم الدورة أو القسم…")
                : t("courses.searchPlaceholder", "Search by course or category…")
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 px-11 text-sm text-[var(--color-foreground)] shadow-xs placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-muted)] hover:text-[var(--color-foreground)] rtl:left-3.5 ltr:right-3.5"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Pills (if more than 1 category exists) */}
        {availableCategories.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                selectedCategory === "ALL"
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-foreground)]"
              }`}
            >
              {locale === "ar" ? "الكل" : "All"} ({courses.length})
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  selectedCategory === cat.slug
                    ? "bg-[var(--color-primary)] text-white shadow-xs"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-foreground)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Course Listing / Empty State */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <SearchX className="h-7 w-7 stroke-[1.5]" />
          </div>
          <h3 className="mt-4 text-base font-bold text-[var(--color-foreground)]">
            {locale === "ar" ? "لم نجد نتائج مطابقة" : "No matching courses"}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted)] max-w-sm">
            {normalizeSearch(query)
              ? "لا توجد دورات تطابق بحثك حالياً. جرّب كلمات أخرى أو قم بإلغاء الفرز."
              : "لا توجد دورات متاحة في هذا القسم حالياً."}
          </p>
          {(query || selectedCategory !== "ALL") && (
            <button
              onClick={() => {
                setQuery("");
                setSelectedCategory("ALL");
              }}
              className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-bold text-[var(--color-foreground)] transition hover:border-[var(--color-primary)]"
            >
              {locale === "ar" ? "إعادة ضبط البحث" : "Reset search"}
            </button>
          )}
        </div>
      ) : groupByCategory && selectedCategory === "ALL" && !query ? (
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.slugKey}>
              <div className="mb-5 flex items-center justify-between border-b border-[var(--color-border)]/60 pb-3">
                <h2 className="flex items-center gap-2 text-lg font-black text-[var(--color-foreground)]">
                  <BookOpen className="h-4 w-4 text-[var(--color-primary)]" />
                  <span>{group.label}</span>
                </h2>
                <span className="rounded-md bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--color-primary)]">
                  {group.courses.length} {locale === "ar" ? "دورة" : "courses"}
                </span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.courses.map((course) => (
                  <CourseCard key={course.id} course={toCourseCardProps(course)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={toCourseCardProps(course)} />
          ))}
        </div>
      )}
    </div>
  );
}
