import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { listManagedCoursesForTenant } from "@/modules/courses/repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { CodesManage } from "./CodesManage";

export default async function DashboardCodesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const actor = await requireDashboardTenantActor("MANAGE_ACTIVATION_CODES");
  const isTeacher = actor.role === "TEACHER";
  const t = await getServerTranslator();

  const courses = await listManagedCoursesForTenant(actor.tenantId, actor);
  const courseOptions = courses.map((c) => ({
    id: String((c as { id?: unknown }).id ?? ""),
    title: c.titleAr ?? c.title,
  })).filter((o) => o.id);

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-foreground)]">
        {t("dashboard.codesRoutePage.title")}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {isTeacher
          ? t("dashboard.codesRoutePage.descTeacher")
          : t("dashboard.codesRoutePage.descStaff")}
      </p>
      <CodesManage courseOptions={courseOptions} />
    </div>
  );
}
