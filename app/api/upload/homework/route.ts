import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import { checkRequestRateLimit } from "@/lib/security/rate-limit";
import { buildTenantObjectKey } from "@/modules/storage/tenant-storage";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

const PDF = "application/pdf";
const images = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export async function POST(request: NextRequest) {
  if (!checkRequestRateLimit(request, { scope: "upload-homework", limit: 20, windowMs: 15 * 60_000 }).allowed) return NextResponse.json({ error: "محاولات رفع كثيرة جداً" }, { status: 429 });
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (actor.role !== "STUDENT") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  if (!isR2Configured()) return NextResponse.json({ error: "التخزين غير مضبوط" }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || (file.type !== PDF && !images.includes(file.type))) return NextResponse.json({ error: "نوع الملف غير مدعوم" }, { status: 400 });
  if (file.size > (file.type === PDF ? 10 : 5) * 1024 * 1024) return NextResponse.json({ error: "حجم الملف أكبر من الحد المسموح" }, { status: 400 });
  const key = buildTenantObjectKey({ tenantId: actor.tenantId, kind: "homework", fileName: file.name });
  await uploadToR2(Buffer.from(await file.arrayBuffer()), key, file.type);
  // No R2 public URL is returned. A future signed/proxy download route owns access.
  return NextResponse.json({ key, fileName: file.name });
}
