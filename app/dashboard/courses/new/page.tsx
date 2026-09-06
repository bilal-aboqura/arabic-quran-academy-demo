import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { CreateCourseForm } from "./CreateCourseForm";

export default async function NewCoursePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  await requireDashboardTenantActor("MANAGE_COURSES");
  const t = await getServerTranslator();

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        {t("dashboard.backToDashboard")}
      </Link>
      <h2 className="mt-4 text-xl font-bold text-[var(--color-foreground)]">
        {t("dashboard.courseNewPage.title")}
      </h2>
      <CreateCourseForm />
    </div>
  );
}
