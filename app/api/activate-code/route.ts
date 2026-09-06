import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

/** Redeems only an unused activation code owned by the hostname-resolved tenant. */
export async function POST(request: NextRequest) {
  let actor;
  try { actor = await requireTenantActor(request); } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Tenant resolution failed" }, { status: 500 });
  }
  if (actor.role !== "STUDENT") return NextResponse.json({ error: "يجب تسجيل الدخول كطالب" }, { status: 403 });
  let body: { code?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const code = body.code?.trim();
  if (!code) return NextResponse.json({ error: "كود التفعيل مطلوب" }, { status: 400 });
  const row = await prisma.activationCode.findFirst({
    where: { code, tenantId: actor.tenantId, usedAt: null, course: { tenantId: actor.tenantId } }, include: { lessons: true, quizzes: true },
  });
  if (!row) return NextResponse.json({ error: "كود غير صالح أو مستخدم مسبقاً" }, { status: 404 });
  const partial = row.lessons.length > 0 || row.quizzes.length > 0;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check the enrollment and claim the code in the same transaction. If
      // enrollment creation fails, the claim rolls back instead of burning a
      // student's code without granting its entitlement.
      if (!partial) {
        const existing = await tx.enrollment.findFirst({
          where: { tenantId: actor.tenantId, userId: actor.userId, courseId: row.courseId },
          select: { id: true },
        });
        if (existing) return "ALREADY_ENROLLED" as const;
      }
      const used = await tx.activationCode.updateMany({
        where: { id: row.id, tenantId: actor.tenantId, usedAt: null },
        data: { usedAt: new Date(), usedByUserId: actor.userId },
      });
      if (used.count !== 1) return "UNAVAILABLE" as const;
      if (!partial) {
        await tx.enrollment.create({
          data: { tenantId: actor.tenantId, userId: actor.userId, studentMembershipId: actor.membershipId, courseId: row.courseId },
        });
      }
      return "REDEEMED" as const;
    });
    if (result === "ALREADY_ENROLLED") return NextResponse.json({ error: "أنت مسجّل أصلاً في هذه الدورة" }, { status: 400 });
    if (result === "UNAVAILABLE") return NextResponse.json({ error: "كود غير صالح أو مستخدم مسبقاً" }, { status: 404 });
  } catch (error) {
    console.error("Activation-code redemption failed", error);
    return NextResponse.json({ error: "تعذر تفعيل الكود" }, { status: 409 });
  }
  return NextResponse.json({ success: true, courseId: row.courseId, scope: partial ? "partial" : "full" });
}
