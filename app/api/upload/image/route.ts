import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { checkRequestRateLimit } from "@/lib/security/rate-limit";
import { canManageCourse } from "@/modules/tenants/authorization";
import { buildTenantObjectKey } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export async function POST(request: NextRequest) {
  if (!checkRequestRateLimit(request, { scope: "upload-image", limit: 20, windowMs: 15 * 60_000 }).allowed) return NextResponse.json({ error: "محاولات رفع كثيرة جداً" }, { status: 429 });
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageCourse(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  if (!isR2Configured()) return NextResponse.json({ error: "التخزين غير مضبوط" }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || !imageTypes.includes(file.type)) return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "حجم الملف أكبر من 5 ميجابايت" }, { status: 400 });
  const purpose = form.get("purpose");
  const key = buildTenantObjectKey({ tenantId: actor.tenantId, kind: purpose === "branding" ? "branding" : "courses", fileName: file.name });
  try {
    const uploaded = await uploadToR2(Buffer.from(await file.arrayBuffer()), key, file.type);
    return NextResponse.json({ key, url: uploaded.url, fileName: file.name });
  } catch (error) {
    console.error("R2 image upload error:", error);
    return NextResponse.json({ error: "فشل رفع الصورة" }, { status: 500 });
  }
}
