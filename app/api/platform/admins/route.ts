import { NextRequest, NextResponse } from "next/server";
import { PlatformAdminRole } from "@prisma/client";
import { getPlatformActor } from "@/modules/platform/actor";
import {
  listPlatformAdministrators,
  grantPlatformAdministratorRole,
  togglePlatformAdministratorStatus,
} from "@/modules/platform/service";

export async function GET() {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admins = await listPlatformAdministrators();
  return NextResponse.json({ admins });
}

export async function POST(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as { email: string; role?: PlatformAdminRole };
    if (!body.email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const role = body.role ?? PlatformAdminRole.PLATFORM_ADMIN;
    const admin = await grantPlatformAdministratorRole({ actor, email: body.email, role });
    return NextResponse.json({ admin }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to grant platform administrator";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as { adminId: string; isActive: boolean };
    if (!body.adminId || typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "adminId and isActive boolean are required" }, { status: 400 });
    }

    const admin = await togglePlatformAdministratorStatus({
      actor,
      adminId: body.adminId,
      isActive: body.isActive,
    });
    return NextResponse.json({ admin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update platform administrator";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
