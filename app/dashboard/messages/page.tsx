import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { MessagesView } from "./MessagesView";

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const actor = await requireDashboardTenantActor();
  const isStaff = actor.role !== "STUDENT";
  const t = await getServerTranslator();

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-[var(--color-foreground)]">
        {isStaff ? t("dashboard.messagesPage.staffTitlePrivate") : t("dashboard.messagesPage.studentTitleInbox")}
      </h2>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        {isStaff
          ? actor.role === "TEACHER"
            ? t("dashboard.messagesPage.staffSubtitleTeacher")
            : t("dashboard.messagesPage.staffSubtitleAdmin")
          : t("dashboard.messagesPage.studentSubtitle")}
      </p>
      <MessagesView
        isStaff={isStaff}
        userId={actor.userId}
        userName={session.user.name ?? ""}
      />
    </div>
  );
}
