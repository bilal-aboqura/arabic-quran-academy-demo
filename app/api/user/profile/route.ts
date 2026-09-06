import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

// A user identity can be shared across tenants. Tenant-facing profile fields
// therefore live on TenantMembership; this endpoint intentionally cannot
// mutate the old global User.role.
const updateSchema = z.object({
  name: z.string().min(2, "الاسم حرفين على الأقل").optional(),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").optional(),
  email: z.string().email("بريد إلكتروني غير صالح").optional(),
  teacherSubject: z.string().max(500).optional().nullable(),
  teacherBio: z.string().max(1200).optional().nullable(),
  teacherLanguages: z.string().max(200).optional().nullable(),
  teacherAvatarUrl: z.string().max(2000).url().optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request);
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
    }

    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "لا يوجد شيء للتحديث" }, { status: 400 });
    }
    if ((data.teacherSubject !== undefined || data.teacherAvatarUrl !== undefined || data.teacherBio !== undefined || data.teacherLanguages !== undefined) && actor.role !== "TEACHER") {
      return NextResponse.json({ error: "هذه البيانات خاصة بالمعلم" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      if (data.email !== undefined) {
        const email = data.email.trim().toLowerCase();
        const existing = await tx.user.findFirst({ where: { email, NOT: { id: actor.userId } }, select: { id: true } });
        if (existing) throw new Error("EMAIL_IN_USE");
      }
      if (data.name !== undefined || data.email !== undefined || data.password !== undefined) {
        await tx.user.update({
          where: { id: actor.userId },
          data: {
            ...(data.name !== undefined ? { name: data.name.trim() } : {}),
            ...(data.email !== undefined ? { email: data.email.trim().toLowerCase() } : {}),
            ...(data.password !== undefined ? { password: await hash(data.password, 12), currentSessionId: null } : {}),
          },
        });
      }
      if (data.teacherSubject !== undefined || data.teacherAvatarUrl !== undefined || data.name !== undefined || data.teacherBio !== undefined || data.teacherLanguages !== undefined) {
        await tx.tenantMembership.update({
          where: { id: actor.membershipId },
          data: {
            ...(data.name !== undefined ? { displayName: data.name.trim() } : {}),
            ...(data.teacherSubject !== undefined ? { teacherSubject: data.teacherSubject?.trim() || null } : {}),
            ...(data.teacherBio !== undefined ? { teacherBio: data.teacherBio?.trim() || null } : {}),
            ...(data.teacherLanguages !== undefined ? { teacherLanguages: data.teacherLanguages?.trim() || null } : {}),
            ...(data.teacherAvatarUrl !== undefined ? { teacherAvatarUrl: data.teacherAvatarUrl?.trim() || null } : {}),
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    if (error instanceof Error && error.message === "EMAIL_IN_USE") {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم لحساب آخر" }, { status: 400 });
    }
    console.error("API profile update:", error);
    return NextResponse.json({ error: "تعذر تحديث الملف الشخصي" }, { status: 500 });
  }
}
