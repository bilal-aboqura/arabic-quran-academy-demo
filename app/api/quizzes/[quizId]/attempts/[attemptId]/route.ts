import { NextRequest, NextResponse } from "next/server";
import { getQuizAttemptResultForTenant } from "@/modules/quizzes/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";

type Params = { params: Promise<{ quizId: string; attemptId: string }> };

/** Returns only a finalized attempt within the active tenant and membership. */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireTenantActor(request);
    const { quizId, attemptId } = await params;
    const result = await getQuizAttemptResultForTenant({ tenantId: actor.tenantId, quizId, attemptId, actor });
    if (!result) return NextResponse.json({ error: "Quiz attempt not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to load quiz attempt" }, { status: 500 });
  }
}
