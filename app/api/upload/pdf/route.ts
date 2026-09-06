import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { canManageCourse } from "@/modules/tenants/authorization";
import { buildTenantObjectKey } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

const MAX_SIZE = 10 * 1024 * 1024;

/** Uploads a private tenant-namespaced course attachment; callers receive a key, never a public R2 URL. */
export async function POST(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (!canManageCourse(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  if (!isR2Configured()) return NextResponse.json({ error: "التخزين غير مضبوط" }, { status: 503 });
  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") return NextResponse.json({ error: "نوع الملف غير مدعوم. استخدم ملف PDF فقط." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "حجم الملف أكبر من 10 ميجابايت" }, { status: 400 });
  const key = buildTenantObjectKey({ tenantId: actor.tenantId, kind: "attachments", fileName: file.name });
  try {
    await uploadToR2(Buffer.from(await file.arrayBuffer()), key, file.type);
    return NextResponse.json({ key, fileName: file.name });
  } catch (error) {
    console.error("R2 PDF upload error:", error);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}
