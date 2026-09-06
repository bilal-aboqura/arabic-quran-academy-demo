import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { listManagedCoursesForTenant } from "@/modules/courses/repository";
import { getTenantActor } from "@/modules/tenants/actor";
import { canManageCourse } from "@/modules/tenants/authorization";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { CoursesManageList } from "./CoursesManageList";

export default async function DashboardCoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const requestHeaders = await headers();
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) redirect(process.env.NODE_ENV === "production" ? "/" : "/dashboard");
  const actor = await getTenantActor(tenant);
  if (!actor || !canManageCourse(actor)) redirect("/dashboard");
  const t = await getServerTranslator();
  const courses = await listManagedCoursesForTenant(tenant.tenantId, actor);

  const coursesPlain = courses.map((c) => {
    return {
      id: c.id,
      title: c.title,
      titleAr: c.titleAr ?? "",
      slug: c.slug,
      isPublished: c.isPublished,
      price: Number(c.price),
      imageUrl: c.imageUrl,
      lessonsCount: c._count.lessons,
      enrollmentsCount: c._count.enrollments,
      category: c.category
        ? { id: c.category.id, name: c.category.name, nameAr: c.category.nameAr }
        : null,
    };
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">
          {actor.role === "TEACHER" ? t("dashboard.coursesRoutePage.titleTeacher") : t("dashboard.coursesRoutePage.titleStaff")}
        </h2>
        <Link
          href="/dashboard/courses/new"
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          {t("dashboard.coursesRoutePage.createCourse")}
        </Link>
      </div>
      <CoursesManageList courses={coursesPlain} />
    </div>
  );
}
