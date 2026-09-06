import { NextRequest, NextResponse } from "next/server";
import { requireTenant, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { listReviewsForTenant } from "@/modules/settings/reviews.repository";

/** جلب تعليقات الطلاب للصفحة الرئيسية (عام) */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant(request);
    const reviews = await listReviewsForTenant(tenant.tenantId);
    return NextResponse.json(reviews);
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    console.error("API reviews:", error);
    return NextResponse.json(
      { error: "فشل جلب التعليقات" },
      { status: 500 }
    );
  }
}
