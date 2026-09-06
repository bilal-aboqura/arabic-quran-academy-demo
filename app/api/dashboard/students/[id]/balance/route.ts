import { NextRequest, NextResponse } from "next/server";
import { canManageWallet } from "@/modules/tenants/authorization";
import { checkRequestRateLimit } from "@/lib/security/rate-limit";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { findActiveStudentMembershipForTenant } from "@/modules/students/repository";
import { creditTenantStudentBalance, TenantCommerceError } from "@/modules/commerce/tenant-wallet";

/** Credits the wallet owned by this tenant's student membership, never User.balance. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 }); }
  if (!canManageWallet(actor)) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  if (!checkRequestRateLimit(request, { scope: "tenant-wallet-credit", limit: 20, windowMs: 15 * 60_000 }).allowed) {
    return NextResponse.json({ error: "محاولات كثيرة جداً" }, { status: 429 });
  }
  const { id: userId } = await params;
  const membership = await findActiveStudentMembershipForTenant(actor.tenantId, userId);
  if (!membership) return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  let body: { amount?: unknown; reason?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return NextResponse.json({ error: "قيمة الرصيد غير صالحة" }, { status: 400 });
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!reason) return NextResponse.json({ error: "سبب إضافة الرصيد مطلوب" }, { status: 400 });
  try {
    const result = await creditTenantStudentBalance({
      tenantId: actor.tenantId,
      studentMembershipId: membership.id,
      amount,
      idempotencyKey: request.headers.get("idempotency-key"),
      actor: {
        userId: actor.userId,
        membershipId: actor.membershipId,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: request.headers.get("user-agent") ?? null,
        reason,
      },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof TenantCommerceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "NOT_FOUND" ? 404 : 400 });
    console.error("POST student balance", error);
    return NextResponse.json({ error: "تعذر إضافة الرصيد" }, { status: 500 });
  }
}
