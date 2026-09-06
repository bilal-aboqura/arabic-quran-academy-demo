import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTenantCopyrightOverlayStyle } from "@/modules/settings/admin.repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { getServerTranslator } from "@/lib/i18n/server";
import { CopyrightOverlaySettingsForm } from "./CopyrightOverlaySettingsForm";

export default async function DashboardCopyrightOverlaySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const actor = await requireDashboardTenantActor("MANAGE_TENANT");
  const t = await getServerTranslator();

  const style = await getTenantCopyrightOverlayStyle(actor.tenantId);

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-foreground)]">
        {t("dashboard.copyrightRoutePage.title")}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {t("dashboard.copyrightRoutePage.subtitle")}
      </p>
      <CopyrightOverlaySettingsForm initialStyle={style} />
    </div>
  );
}
