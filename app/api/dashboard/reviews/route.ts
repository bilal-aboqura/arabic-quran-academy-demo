import { NextRequest, NextResponse } from "next/server";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { createReviewForTenant, listReviewsForTenant } from "@/modules/settings/reviews.repository";

/** قائمة تعليقات الطلاب — للأدمن فقط */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_SETTINGS");
    const reviews = await listReviewsForTenant(actor.tenantId);
    return NextResponse.json(reviews);
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    console.error("Dashboard reviews GET:", error);
    return NextResponse.json({ error: "فشل جلب التعليقات" }, { status: 500 });
  }
}

/** إضافة تعليق جديد — للأدمن فقط */
export async function POST(request: NextRequest) {
  let tenantId: string;
  try {
    tenantId = (await requireRequestTenantPermission(request, "MANAGE_SETTINGS")).tenantId;
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    return tenantError ?? NextResponse.json({ error: "Unable to authorize tenant" }, { status: 500 });
  }
  let body: {
    text?: string;
    textEn?: string | null;
    authorName?: string;
    authorTitle?: string | null;
    authorTitleEn?: string | null;
    avatarLetter?: string | null;
    imageUrl?: string | null;
    order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const text = body.text?.trim();
  const authorName = body.authorName?.trim();
  if (!text || !authorName) {
    return NextResponse.json({ error: "نص التعليق واسم الكاتب مطلوبان" }, { status: 400 });
  }
  try {
    const review = await createReviewForTenant(tenantId, {
      text: text.slice(0, 2000),
      textEn: body.textEn?.trim().slice(0, 2000) || null,
      authorName,
      authorTitle: body.authorTitle?.trim().slice(0, 200) || null,
      authorTitleEn: body.authorTitleEn?.trim().slice(0, 200) || null,
      avatarLetter: body.avatarLetter?.trim() || null,
      imageUrl: body.imageUrl?.trim() || null,
      order: body.order ?? 0,
    });
    return NextResponse.json(review);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Dashboard reviews POST:", error);
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("Review")) {
      return NextResponse.json(
        { error: "جدول التعليقات غير موجود. من لوحة Neon افتح SQL Editor ونفّذ محتوى ملف scripts/add-reviews-table.sql ثم أعد المحاولة." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "فشل إضافة التعليق" }, { status: 500 });
  }
}
