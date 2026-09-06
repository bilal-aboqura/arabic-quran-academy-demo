import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getPlatformActor } from "@/modules/platform/actor";
import { requirePlatformAdministrator } from "@/modules/platform/authorization";

const bodySchema = z.object({ password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(128) });

/** Platform admins may issue an initial password for an academy owner. The
 * password is hashed immediately and never returned or stored in plaintext. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const actor = await getPlatformActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePlatformAdministrator(actor);
    const { tenantId } = await params;
    const { password } = bodySchema.parse(await request.json());
    const owner = await prisma.tenantMembership.findFirst({ where: { tenantId, role: "OWNER", status: "ACTIVE" }, select: { userId: true } });
    if (!owner) return NextResponse.json({ error: "لا يوجد مالك نشط لهذه الأكاديمية" }, { status: 404 });
    await prisma.user.update({ where: { id: owner.userId }, data: { password: await hash(password, 12), currentSessionId: null } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "بيانات غير صالحة" }, { status: 400 });
    return NextResponse.json({ error: "تعذر تعيين كلمة المرور" }, { status: 400 });
  }
}
