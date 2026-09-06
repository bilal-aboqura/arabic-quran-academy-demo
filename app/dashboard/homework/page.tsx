import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { HomeworkSubmissionsList } from "./HomeworkSubmissionsList";

export default async function DashboardHomeworkPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const actor = await requireDashboardTenantActor("REVIEW_ASSIGNMENTS");
  const isStaff = actor.role === "OWNER" || actor.role === "ADMIN" || actor.role === "ASSISTANT";
  const isTeacher = actor.role === "TEACHER";
  const t = await getServerTranslator();

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-foreground)]">
        {t(
          isTeacher
            ? "dashboard.homeworkPage.titleTeacher"
            : "dashboard.homeworkPage.titleStaff",
        )}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {isTeacher
          ? t("dashboard.homeworkPage.subtitleTeacher")
          : t("dashboard.homeworkPage.subtitleStaff")}
      </p>
      <HomeworkSubmissionsList allowDeleteAll={isStaff} />
    </div>
  );
}
