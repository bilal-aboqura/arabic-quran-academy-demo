import { NextRequest, NextResponse } from "next/server";
import { deleteCategoryForTenant, updateCategoryForTenant } from "@/modules/courses/repository";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_CATEGORIES");
    const { id } = await params;
    if (!id?.trim()) return NextResponse.json({ error: "معرّف القسم مطلوب" }, { status: 400 });
    const deleted = await deleteCategoryForTenant(actor.tenantId, id.trim(), actor);
    // A cross-tenant ID is indistinguishable from an unknown resource.
    if (!deleted) return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const response = tenantRequestErrorResponse(error);
    if (response) return response;
    console.error("API category DELETE:", error);
    return NextResponse.json({ error: "فشل حذف القسم" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_CATEGORIES");
    const { id } = await params;
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || !id?.trim()) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    const category = await updateCategoryForTenant({
      tenantId: actor.tenantId, actor, categoryId: id.trim(),
      ...(typeof body.name === "string" ? { name: body.name.trim() } : {}),
      ...(typeof body.nameAr === "string" ? { nameAr: body.nameAr.trim() || null } : {}),
      ...(typeof body.description === "string" ? { description: body.description.trim() || null } : {}),
      ...(typeof body.imageUrl === "string" ? { imageUrl: body.imageUrl.trim() || null } : {}),
      ...(typeof body.order === "number" && Number.isInteger(body.order) ? { order: body.order } : {}),
    });
    if (!category) return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 });
    return NextResponse.json(category);
  } catch (error) {
    const response = tenantRequestErrorResponse(error);
    if (response) return response;
    console.error("API category PUT:", error);
    return NextResponse.json({ error: "فشل تحديث القسم" }, { status: 500 });
  }
}
