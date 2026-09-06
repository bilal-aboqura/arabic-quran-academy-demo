import { NextRequest, NextResponse } from "next/server";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { createStoreProductForTenant, listStoreProductsForTenant } from "@/modules/commerce/repository";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_SETTINGS");
    const products = await listStoreProductsForTenant(actor.tenantId);
    return NextResponse.json({ products });
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    return NextResponse.json({ error: "فشل جلب منتجات المتجر" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let tenantId: string;
  try {
    tenantId = (await requireRequestTenantPermission(request, "MANAGE_SETTINGS")).tenantId;
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    return tenantError ?? NextResponse.json({ error: "Unable to authorize tenant" }, { status: 500 });
  }
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
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "اسم المنتج مطلوب" }, { status: 400 });
  const price = Number(body.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "سعر غير صالح" }, { status: 400 });
  }
  const costRaw = body.costPrice;
  const costPrice = costRaw === undefined || costRaw === null ? 0 : Number(costRaw);
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return NextResponse.json({ error: "تكلفة الوحدة غير صالحة" }, { status: 400 });
  }
  const pdfUrl = String(body.pdfUrl ?? "").trim();
  if (!pdfUrl) {
    return NextResponse.json({ error: "رابط ملف PDF إجباري" }, { status: 400 });
  }

  try {
    const out = await createStoreProductForTenant(tenantId, {
      title,
      description: String(body.description ?? ""),
      price,
      costPrice,
      imageUrl: body.imageUrl ?? null,
      pdfUrl,
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ success: true, id: out.id });
  } catch {
    return NextResponse.json({ error: "فشل إنشاء المنتج" }, { status: 500 });
  }
}
