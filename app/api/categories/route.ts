import { NextRequest, NextResponse } from "next/server";
import { createCategoryForTenant, listCategoriesForTenant } from "@/modules/courses/repository";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_CATEGORIES");
    return NextResponse.json(await listCategoriesForTenant(actor.tenantId, actor));
  } catch (error) {
    const response = tenantRequestErrorResponse(error);
    if (response) return response;
    console.error("API categories:", error);
    return NextResponse.json({ error: "فشل جلب التصنيفات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_CATEGORIES");
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!name || !slug) return NextResponse.json({ error: "الاسم والرابط مطلوبان" }, { status: 400 });
    const category = await createCategoryForTenant({
      tenantId: actor.tenantId, actor, name, slug,
      nameAr: typeof body?.nameAr === "string" ? body.nameAr.trim() || null : null,
      description: typeof body?.description === "string" ? body.description.trim() || null : null,
      imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      order: typeof body?.order === "number" && Number.isInteger(body.order) ? body.order : 0,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const response = tenantRequestErrorResponse(error);
    if (response) return response;
    // The bridge still has a global slug uniqueness constraint. Do not mask it as a tenant lookup.
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "رابط القسم مستخدم مسبقاً" }, { status: 409 });
    console.error("API category POST:", error);
    return NextResponse.json({ error: "فشل إنشاء القسم" }, { status: 500 });
  }
}
