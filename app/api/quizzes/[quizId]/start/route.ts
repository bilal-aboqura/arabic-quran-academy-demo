import { NextRequest, NextResponse } from "next/server";
import { startQuizAttemptForTenant } from "@/modules/quizzes/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

type Params = { params: Promise<{ quizId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireTenantActor(request);
    const { quizId } = await params;
    const result = await startQuizAttemptForTenant({ tenantId: actor.tenantId, quizId, actor });
    if ("attempt" in result && result.attempt) return NextResponse.json({ attemptId: result.attempt.id, startedAt: result.attempt.startedAt.toISOString() }, { status: 201 });
    if (result.error === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (result.error === "LIMIT") return NextResponse.json({ error: "Attempt limit reached" }, { status: 409 });
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to start quiz" }, { status: 500 });
  }
}
