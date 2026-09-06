import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { getStoreAdminReportingForTenant, listStoreProductsForTenant } from "@/modules/commerce/repository";
import { getTenantSettingsForAdmin } from "@/modules/settings/admin.repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { StoreAdminClient } from "./StoreAdminClient";

export default async function StoreDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/dashboard");
  const actor = await requireDashboardTenantActor("MANAGE_TENANT");

  const t = await getServerTranslator();

  const [homepage, products, reporting] = await Promise.all([
    getTenantSettingsForAdmin(actor.tenantId), listStoreProductsForTenant(actor.tenantId), getStoreAdminReportingForTenant(actor.tenantId),
  ]);

  const initialHomeStoreTitle =
    t("dashboard.storeAdminDefaults.sectionTitleFallback");
  const initialHomeStoreDescription =
    t("dashboard.storeAdminDefaults.sectionDescriptionFallback");

  return (
    <StoreAdminClient
      initialEnabled={true}
      initialHomeStoreTitle={initialHomeStoreTitle}
      initialHomeStoreDescription={initialHomeStoreDescription}
      initialProducts={products}
      initialPurchases={reporting.purchases}
      initialStats={reporting.stats}
    />
  );
}
