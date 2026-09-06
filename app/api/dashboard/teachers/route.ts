import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

function teacherDto(teacher: {
  id: string; displayName: string | null; studentNumber: string | null; teacherSubject: string | null;
  teacherAvatarUrl: string | null; teacherHomepageOrder: number | null; user: { name: string; email: string };
}) {
  return {
    id: teacher.id,
    name: teacher.displayName || teacher.user.name,
    email: teacher.user.email,
    student_number: teacher.studentNumber,
    teacher_subject: teacher.teacherSubject,
    teacher_avatar_url: teacher.teacherAvatarUrl,
    teacher_homepage_order: teacher.teacherHomepageOrder,
  };
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_STAFF");
    const [settings, teachers] = await Promise.all([
      prisma.tenantSettings.findUnique({ where: { tenantId: actor.tenantId }, select: { teachersEnabled: true } }),
      prisma.tenantMembership.findMany({
        where: { tenantId: actor.tenantId, role: "TEACHER", status: "ACTIVE" },
        select: { id: true, displayName: true, studentNumber: true, teacherSubject: true, teacherAvatarUrl: true, teacherHomepageOrder: true, user: { select: { name: true, email: true } } },
        orderBy: [{ teacherHomepageOrder: "asc" }, { displayName: "asc" }],
      }),
    ]);
    return NextResponse.json({ teachersEnabled: settings?.teachersEnabled ?? false, teachers: teachers.map(teacherDto) });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to list teachers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_STAFF");
    const enabled = await prisma.tenantSettings.findUnique({ where: { tenantId: actor.tenantId }, select: { teachersEnabled: true } });
    if (!enabled?.teachersEnabled) return NextResponse.json({ error: "Enable teachers before adding staff" }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password.trim() : "";
    if (!name || !email || !password) return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    const digits = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    const teacher = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) throw new Error("EMAIL_ALREADY_USED");
      const user = await tx.user.create({ data: { email, password: await hash(password, 12), name, role: "STUDENT" } });
      return tx.tenantMembership.create({
        data: {
          tenantId: actor.tenantId, userId: user.id, role: "TEACHER", displayName: name,
          studentNumber: digits.length >= 10 ? digits : null,
          teacherSubject: typeof body.teacherSubject === "string" ? body.teacherSubject.trim().slice(0, 500) || null : null,
          teacherAvatarUrl: typeof body.teacherAvatarUrl === "string" ? body.teacherAvatarUrl.trim().slice(0, 2000) || null : null,
        },
        select: { id: true, displayName: true, studentNumber: true, teacherSubject: true, teacherAvatarUrl: true, teacherHomepageOrder: true, user: { select: { name: true, email: true } } },
      });
    });
    return NextResponse.json({ success: true, teacher: teacherDto(teacher) }, { status: 201 });
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    if (error instanceof Error && error.message === "EMAIL_ALREADY_USED") return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    console.error("POST dashboard/teachers", error);
    return NextResponse.json({ error: "Unable to create teacher" }, { status: 500 });
  }
}
