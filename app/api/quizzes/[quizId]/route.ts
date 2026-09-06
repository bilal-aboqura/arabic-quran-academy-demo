import { NextRequest, NextResponse } from "next/server";
import { countQuizAttemptsForTenant, getAccessibleQuizForTenant, studentQuizDto, submitQuizAttemptForTenant } from "@/modules/quizzes/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

type Params = { params: Promise<{ quizId: string }> };

function unavailable() {
  // Do not reveal whether an opaque quiz ID belongs to another tenant or is
  // merely inaccessible to this membership.
  return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireTenantActor(request);
    const { quizId } = await params;
    const quiz = await getAccessibleQuizForTenant({ tenantId: actor.tenantId, quizId, actor });
    if (!quiz) return unavailable();
    const attemptsUsed = await countQuizAttemptsForTenant({ tenantId: actor.tenantId, userId: actor.userId, quizId: quiz.id });
    return NextResponse.json(studentQuizDto(quiz, attemptsUsed));
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to load quiz" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireTenantActor(request);
    const { quizId } = await params;
    let body: { attemptId?: unknown; answers?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
    if (typeof body.attemptId !== "string" || !body.attemptId) return NextResponse.json({ error: "Attempt is required" }, { status: 400 });
    if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return NextResponse.json({ error: "Answers are required" }, { status: 400 });

    const result = await submitQuizAttemptForTenant({ tenantId: actor.tenantId, quizId, attemptId: body.attemptId, actor, answers: body.answers as Record<string, unknown> });
    if ("result" in result) return NextResponse.json(result.result);
    if (result.error === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return unavailable();
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to submit quiz" }, { status: 500 });
  }
}
