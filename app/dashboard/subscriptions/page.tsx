import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listSubscriptionPlansForTenant } from "@/modules/commerce/repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { SubscriptionsAdminClient, type AdminPlanRow } from "./SubscriptionsAdminClient";

export default async function SubscriptionsDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/dashboard");
  }
  const actor = await requireDashboardTenantActor("MANAGE_TENANT");

  const enabled = true;
  let plans: AdminPlanRow[] = [];
  try {
    const rows = await listSubscriptionPlansForTenant(actor.tenantId);
    plans = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.imageUrl,
      durationKind: r.durationKind as AdminPlanRow["durationKind"],
      price: r.price,
      isActive: r.isActive,
    }));
  } catch {
    plans = [];
  }

  return <SubscriptionsAdminClient initialEnabled={enabled} initialPlans={plans} />;
}
