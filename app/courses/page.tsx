import { unstable_noStore } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { TeacherCoursesSearch, type TeacherCourseListItem } from "./TeacherCoursesSearch";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";
import { pickLocalizedText } from "@/lib/i18n/localized-field";
import { listPublishedCoursesForTenant } from "@/modules/courses/repository";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  const t = await getServerTranslator();
  return {
    title: `${t("common.courses", "Courses")} | ${t("footer.defaultTitle", "My Learning Platform")}`,
    description: t("courses.allCoursesSubtitle", "Choose the right course and start learning step by step"),
  };
}

type Props = { searchParams: Promise<{ category?: string; teacher?: string }> };

export default async function CoursesPage({ searchParams }: Props) {
  unstable_noStore();
  const [t, locale] = await Promise.all([getServerTranslator(), getLocaleFromCookie()]);
  const { category: categorySlug, teacher: teacherId } = await searchParams;
  const requestHeaders = await headers();
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) notFound();
  const courses = await listPublishedCoursesForTenant(tenant.tenantId);

  let teacherName: string | null = null;
  const tid = teacherId?.trim();
  if (tid) {
    const membership = await prisma.tenantMembership.findFirst({
      where: { tenantId: tenant.tenantId, userId: tid, role: "TEACHER", status: "ACTIVE" },
      select: { displayName: true, user: { select: { name: true } } },
    });
    if (!membership) notFound();
    teacherName = membership.displayName || membership.user.name;
  }

  let filtered =
    categorySlug?.trim()
      ? courses.filter((c) => (c as { category?: { slug?: string } }).category?.slug === categorySlug.trim())
      : courses;

  if (tid) {
    filtered = filtered.filter((c) => {
      const row = c as { createdById?: string | null; created_by_id?: string | null };
      const creator = row.createdById ?? row.created_by_id ?? null;
      return creator === tid;
    });
  }

  const categoryName =
    categorySlug && filtered.length > 0
      ? pickLocalizedText(
          locale,
          (filtered[0] as { category?: { nameAr?: string | null; name?: string | null } }).category?.nameAr ?? null,
          (filtered[0] as { category?: { name?: string | null } }).category?.name ?? null,
        )
      : null;

  const pageTitle = teacherName
    ? `${t("courses.teacherCoursesPrefix", "Courses by")} ${teacherName}`
    : categoryName
      ? `${t("courses.categoryCoursesPrefix", "Category courses:")} ${categoryName}`
      : t("courses.allCoursesTitle", "All courses");

  const pageSubtitle = teacherName
    ? t("courses.teacherCoursesSubtitle", "Published courses by this teacher on the platform")
    : categoryName
      ? t("courses.categoryCoursesSubtitle", "Courses for the selected category only")
      : t("courses.allCoursesSubtitle", "Choose the right course and start learning step by step");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3.5 py-1 text-xs font-bold text-[var(--color-primary)]">
          <BookOpen className="h-3.5 w-3.5" />
          <span>{t("common.courses", "الدورات التعليمية")}</span>
          <span>•</span>
          <span>{filtered.length} {locale === "ar" ? "دورة متاحة" : "courses"}</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-foreground)] sm:text-4xl">
          {pageTitle}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
          {pageSubtitle}
        </p>
      </div>

      {filtered.length > 0 ? (
        <TeacherCoursesSearch
          courses={filtered.map(course => ({ ...course, price: Number(course.price) })) as TeacherCourseListItem[]}
          groupByCategory={!!tid}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-16 text-center">
          <p className="text-sm font-medium text-[var(--color-muted)]">
            {tid
              ? t("courses.noTeacherCourses", "No published courses for this teacher right now.")
              : categorySlug?.trim()
                ? t("courses.noCategoryCourses", "No courses in this category right now.")
                : t("courses.noCourses", "No published courses yet. Make sure the database is configured and seed is run.")}
          </p>
        </div>
      )}
    </div>
  );
}
