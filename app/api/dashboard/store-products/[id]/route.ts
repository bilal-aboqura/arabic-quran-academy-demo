import { NextRequest, NextResponse } from "next/server";
import { deleteStoreProductForTenant, updateStoreProductForTenant } from "@/modules/commerce/repository";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let tenantId: string;
  try { tenantId = (await requireRequestTenantPermission(request, "MANAGE_SETTINGS")).tenantId; } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to authorize tenant" }, { status: 500 });
  }
  const { id } = await params;
  let body: {
    title?: string;
    description?: string;
    price?: number;
    costPrice?: number;
    imageUrl?: string | null;
    pdfUrl?: string | null;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  try {
    let cost_price: number | undefined;
    if (body.costPrice !== undefined) {
      const c = Number(body.costPrice);
      if (!Number.isFinite(c) || c < 0) {
        return NextResponse.json({ error: "تكلفة الوحدة غير صالحة" }, { status: 400 });
      }
      cost_price = c;
    }
    const result = await updateStoreProductForTenant(tenantId, id, {
      title: body.title,
      description: body.description,
      price: body.price,
      costPrice: cost_price,
      imageUrl: body.imageUrl,
      pdfUrl: body.pdfUrl,
      isActive: body.isActive,
    });
    if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل تحديث المنتج" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let tenantId: string;
  try { tenantId = (await requireRequestTenantPermission(request, "MANAGE_SETTINGS")).tenantId; } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to authorize tenant" }, { status: 500 });
  }
  const { id } = await params;
  try {
    const result = await deleteStoreProductForTenant(tenantId, id);
    if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حذف المنتج" }, { status: 500 });
  }
}
