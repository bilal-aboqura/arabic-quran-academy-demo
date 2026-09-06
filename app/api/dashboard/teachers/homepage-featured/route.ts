import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRequestTenantPermission, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

const MAX_FEATURED_TEACHERS = 4;

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRequestTenantPermission(request, "MANAGE_STAFF");
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: actor.tenantId }, select: { teachersEnabled: true } });
    if (!settings?.teachersEnabled) return NextResponse.json({ error: "Enable teachers before choosing featured staff" }, { status: 400 });
    const body = await request.json() as { orderedTeacherIds?: unknown };
    if (!Array.isArray(body.orderedTeacherIds)) return NextResponse.json({ error: "orderedTeacherIds must be an array" }, { status: 400 });
    const ids = body.orderedTeacherIds.map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean);
    if (ids.length > MAX_FEATURED_TEACHERS || new Set(ids).size !== ids.length) return NextResponse.json({ error: "Choose up to four distinct teachers" }, { status: 400 });
    const teachers = await prisma.tenantMembership.findMany({
      where: { id: { in: ids }, tenantId: actor.tenantId, role: "TEACHER", status: "ACTIVE" },
      select: { id: true },
    });
    if (teachers.length !== ids.length) return NextResponse.json({ error: "A selected teacher is not in this tenant" }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.tenantMembership.updateMany({
        where: { tenantId: actor.tenantId, role: "TEACHER", status: "ACTIVE" },
        data: { teacherHomepageOrder: null },
      });
      await Promise.all(ids.map((id, index) => tx.tenantMembership.update({ where: { id }, data: { teacherHomepageOrder: index + 1 } })));
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to save featured teachers" }, { status: 500 });
  }
}
