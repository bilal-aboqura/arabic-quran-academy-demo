import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * Transitional authenticated actor used until tenant memberships become the
 * source of authorization. Routes must use this instead of checking only that
 * a NextAuth cookie exists, because a superseded session is still able to
 * decode its JWT.
 */
export type ActiveActor = {
  userId: string;
  role: string;
};

export async function getActiveActor(): Promise<ActiveActor | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role || session.forceLogout) {
    return null;
  }

  return {
    userId: session.user.id,
    role: session.user.role,
  };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
}

export function isStaffRole(role: string): boolean {
  return role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER";
}
