import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

type Params = { params: Promise<{ id: string }> };

function dto(teacher: {
  id: string; displayName: string | null; studentNumber: string | null; teacherSubject: string | null;
  teacherAvatarUrl: string | null; teacherHomepageOrder: number | null; user: { name: string; email: string };
}) {
  return { id: teacher.id, name: teacher.displayName || teacher.user.name, email: teacher.user.email, student_number: teacher.studentNumber, teacher_subject: teacher.teacherSubject, teacher_avatar_url: teacher.teacherAvatarUrl, teacher_homepage_order: teacher.teacherHomepageOrder };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_STAFF");
    const { id } = await params;
    const target = await prisma.tenantMembership.findFirst({
      where: { id, tenantId: actor.tenantId, role: "TEACHER", status: "ACTIVE" },
      include: { user: { select: { email: true } } },
    });
    if (!target) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    const membershipUpdate: { displayName?: string; studentNumber?: string | null; teacherSubject?: string | null; teacherAvatarUrl?: string | null } = {};
    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      membershipUpdate.displayName = name;
    }
    if (body.phone !== undefined) {
      const digits = String(body.phone ?? "").replace(/\D/g, "");
      membershipUpdate.studentNumber = digits.length >= 10 ? digits : null;
    }
    if (body.teacherSubject !== undefined) membershipUpdate.teacherSubject = typeof body.teacherSubject === "string" ? body.teacherSubject.trim().slice(0, 500) || null : null;
    if (body.teacherAvatarUrl !== undefined) membershipUpdate.teacherAvatarUrl = typeof body.teacherAvatarUrl === "string" ? body.teacherAvatarUrl.trim().slice(0, 2000) || null : null;

    const requestedEmail = body.email === undefined ? target.user.email : typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!requestedEmail) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    const requestedPassword = typeof body.password === "string" ? body.password.trim() : "";
    if (requestedPassword && requestedPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    // Email/password belong to the global identity. A tenant administrator may
    // change them only while that identity has no other academy membership.
    const needsIdentityChange = requestedEmail !== target.user.email || Boolean(requestedPassword);
    const membershipCount = needsIdentityChange
      ? await prisma.tenantMembership.count({ where: { userId: target.userId, status: { in: ["ACTIVE", "INVITED", "SUSPENDED"] } } })
      : 1;
    if (needsIdentityChange && membershipCount !== 1) {
      return NextResponse.json({ error: "This shared identity's email or password cannot be changed from one tenant" }, { status: 409 });
    }
    if (requestedEmail !== target.user.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: requestedEmail }, select: { id: true } });
      if (duplicate && duplicate.id !== target.userId) return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    }
    const teacher = await prisma.$transaction(async (tx) => {
      if (Object.keys(membershipUpdate).length) await tx.tenantMembership.update({ where: { id: target.id }, data: membershipUpdate });
      if (needsIdentityChange) await tx.user.update({ where: { id: target.userId }, data: { email: requestedEmail, ...(requestedPassword ? { password: await hash(requestedPassword, 12) } : {}) } });
      return tx.tenantMembership.findUniqueOrThrow({
        where: { id: target.id },
        select: { id: true, displayName: true, studentNumber: true, teacherSubject: true, teacherAvatarUrl: true, teacherHomepageOrder: true, user: { select: { name: true, email: true } } },
      });
    });
    return NextResponse.json({ success: true, teacher: dto(teacher) });
  } catch (error) {
    const tenantError = tenantRequestErrorResponse(error);
    if (tenantError) return tenantError;
    console.error("PATCH dashboard/teachers/[id]", error);
    return NextResponse.json({ error: "Unable to update teacher" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_STAFF");
    const { id } = await params;
    if (id === actor.membershipId) return NextResponse.json({ error: "You cannot remove your own membership" }, { status: 400 });
    const result = await prisma.tenantMembership.updateMany({
      where: { id, tenantId: actor.tenantId, role: "TEACHER", status: "ACTIVE" },
      data: { status: "REMOVED", teacherHomepageOrder: null },
    });
    if (!result.count) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to remove teacher" }, { status: 500 });
  }
}
