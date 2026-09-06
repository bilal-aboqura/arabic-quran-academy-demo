import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { listCategoriesForTenant } from "@/modules/courses/repository";
import { CategoriesManager } from "./CategoriesManager";

export default async function DashboardCategoriesPage() {
  const actor = await requireDashboardTenantActor("MANAGE_CATEGORIES");
  const categories = await listCategoriesForTenant(actor.tenantId, actor);
  return <CategoriesManager initialCategories={categories.map(category => ({
    id: category.id,
    name: category.name,
    nameAr: category.nameAr,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    order: category.order,
  }))} />;
}
