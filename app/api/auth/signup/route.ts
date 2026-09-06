import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRequestRateLimit } from "@/lib/security/rate-limit";
import { resolveTenantFromRequest } from "@/modules/tenants/request-context";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

const signupSchema = z
  .object({
    email: z.string().email("بريد إلكتروني غير صالح"),
    password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
    name: z.string().min(2, "الاسم حرفين على الأقل"),
    student_number: z.string().min(1, "رقم الهاتف مطلوب"),
    guardian_number: z.string().optional(),
  })
  .refine(
    (data) => digitsOnly(data.student_number).length === 11,
    { message: "رقم الهاتف يجب أن يكون 11 رقماً", path: ["student_number"] }
  );

export async function POST(request: NextRequest) {
  try {
    const tenant = await resolveTenantFromRequest(request);
    if (!tenant) {
      // A registration cannot create an unscoped identity: in production this
      // prevents an unknown host from becoming an implicit "global" tenant.
      return NextResponse.json({ error: "المنصة غير موجودة" }, { status: 404 });
    }
    const limit = checkRequestRateLimit(request, { scope: "signup", limit: 5, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "محاولات كثيرة جداً. حاول لاحقاً." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 }
      );
    }
    const { email, password, name, student_number, guardian_number } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم مسبقاً" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 12);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          name,
          // Transitional compatibility only. TenantMembership is the
          // authorization source for every tenant-aware route.
          role: "STUDENT",
          studentNumber: student_number.trim(),
          guardianNumber: guardian_number?.trim() || null,
        },
      });
      await tx.tenantMembership.create({
        data: { tenantId: tenant.tenantId, userId: user.id, role: "STUDENT", status: "ACTIVE", displayName: name },
      });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Signup error:", e);
    const message = e instanceof Error ? e.message : String(e);
    const isVercel = !!process.env.VERCEL;
    let userMessage = "حدث خطأ أثناء إنشاء الحساب.";
    if (message.includes("DATABASE_URL") || message.includes("Environment variable not found")) {
      userMessage = isVercel
        ? "قاعدة البيانات غير مضبوطة على السيرفر. في Vercel: Settings → Environment Variables → أضف DATABASE_URL (رابط Neon أو Supabase) ثم أعد النشر. للتحقق: افتح /api/health"
        : "لم يتم ضبط قاعدة البيانات. أنشئ ملف .env وأضف DATABASE_URL ثم نفّذ: npm run db:push";
    } else if (message.includes("does not exist") || message.includes("Unknown table") || message.includes("relation") || message.includes("P1001") || message.includes("P2021") || message.includes("Can't reach")) {
      userMessage = isVercel
        ? "الاتصال بقاعدة البيانات فشل. تأكد أن DATABASE_URL على Vercel يشير إلى قاعدة سحابية (Neon/Supabase) وليس localhost، ثم أعد النشر. للتحقق: افتح /api/health"
        : "جدول المستخدمين غير موجود أو قاعدة البيانات غير متصلة. افتح لوحة Neon → SQL Editor، انسخ محتوى ملف scripts/init-neon-database.sql ونفّذه مرة واحدة لإنشاء الجداول.";
    } else if (process.env.NODE_ENV === "development" && message) {
      userMessage = message;
    }
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
