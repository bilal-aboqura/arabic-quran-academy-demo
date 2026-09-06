import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { saveManagedContent } from "@/modules/sites/content-editor";

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request);
    const sections = await saveManagedContent(actor, await request.json());
    return NextResponse.json({ sections });
  } catch (error) {
    const auth = tenantRequestErrorResponse(error); if (auth) return auth;
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "بيانات المحتوى غير صالحة. تحقق من الحقول والروابط." }, { status: 400 });
    const message = error instanceof Error ? error.message : "";
    if (message === "CONTENT_CONFLICT") return NextResponse.json({ error: "تم تعديل المحتوى في جلسة أخرى. أعد تحميل الصفحة قبل الحفظ." }, { status: 409 });
    if (message === "FORBIDDEN" || message === "PAGE_NOT_FOUND") return NextResponse.json({ error: "غير مسموح بتعديل هذه الصفحة." }, { status: 403 });
    return NextResponse.json({ error: "تعذر حفظ المحتوى. حاول مرة أخرى." }, { status: 400 });
  }
}
