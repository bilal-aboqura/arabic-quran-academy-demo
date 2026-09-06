import { NextRequest, NextResponse } from "next/server";
import {
  getQuizProductSettingsForTenant,
  getStudentQuizAttemptHistoryForTenant,
  getTeacherQuizAttemptHistoryForTenant,
  updateQuizProductSettingsForTenant,
} from "@/modules/quizzes/product.repository";
import { getAccessibleQuizForTenant } from "@/modules/quizzes/repository";
import { canManageCourse } from "@/modules/tenants/authorization";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

function dateOrNull(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    const { quizId } = await params;
    if (!(await getAccessibleQuizForTenant({ tenantId: actor.tenantId, quizId, actor }))) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    const settings = await getQuizProductSettingsForTenant({ tenantId: actor.tenantId, quizId });
    if (!settings) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (actor.role === "STUDENT") {
      const history = await getStudentQuizAttemptHistoryForTenant({ tenantId: actor.tenantId, quizId, actor });
      return history === null
        ? NextResponse.json({ error: "Quiz not found" }, { status: 404 })
        : NextResponse.json({ settings, history });
    }
    const history = await getTeacherQuizAttemptHistoryForTenant({ tenantId: actor.tenantId, quizId, actor });
    return history === null
      ? NextResponse.json({ error: "Quiz not found" }, { status: 404 })
      : NextResponse.json({ settings, history });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to load quiz product" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ quizId: string }> }) {
  try {
    const actor = await requireTenantActor(request);
    if (!canManageCourse(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { quizId } = await params;
    const body = await request.json() as Record<string, unknown>;
    const hasAvailableFrom = Object.hasOwn(body, "availableFrom");
    const hasAvailableUntil = Object.hasOwn(body, "availableUntil");
    const availableFrom = hasAvailableFrom ? dateOrNull(body.availableFrom) : undefined;
    const availableUntil = hasAvailableUntil ? dateOrNull(body.availableUntil) : undefined;
    if ((hasAvailableFrom && availableFrom === undefined) || (hasAvailableUntil && availableUntil === undefined)) return NextResponse.json({ error: "Invalid availability date" }, { status: 400 });
    const maxAttempts = body.maxAttempts === null ? null : typeof body.maxAttempts === "number" ? body.maxAttempts : undefined;
    const passingScore = body.passingScore === null ? null : typeof body.passingScore === "number" ? body.passingScore : undefined;
    const settings = await updateQuizProductSettingsForTenant({
      tenantId: actor.tenantId, quizId, actor,
      input: {
        ...(maxAttempts !== undefined ? { maxAttempts } : {}),
        ...(passingScore !== undefined ? { passingScore } : {}),
        ...(typeof body.isPublished === "boolean" ? { isPublished: body.isPublished } : {}),
        ...(availableFrom !== undefined ? { availableFrom } : {}),
        ...(availableUntil !== undefined ? { availableUntil } : {}),
      },
    });
    return settings ? NextResponse.json({ settings }) : NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update quiz product" }, { status: 400 });
  }
}
