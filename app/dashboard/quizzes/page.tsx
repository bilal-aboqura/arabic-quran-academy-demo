import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/modules/tenants/authorization";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { QuizProductWorkspace } from "./QuizProductWorkspace";

export default async function DashboardQuizzesPage() {
  const actor = await requireDashboardTenantActor();
  if (!canManageCourse(actor)) redirect("/dashboard");
  const courses = await prisma.course.findMany({
    where: actor.role === "TEACHER"
      ? { tenantId: actor.tenantId, createdById: actor.userId }
      : { tenantId: actor.tenantId },
    select: { id: true, title: true, titleAr: true, quizzes: { select: { id: true, title: true, maxAttempts: true, passingScore: true, isPublished: true, availableFrom: true, availableUntil: true, _count: { select: { questions: true } } }, orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return <QuizProductWorkspace quizzes={courses.flatMap((course) => course.quizzes.map((quiz) => ({
    ...quiz, maxAttempts: quiz.maxAttempts ?? null, passingScore: quiz.passingScore ?? null,
    availableFrom: quiz.availableFrom?.toISOString() ?? null, availableUntil: quiz.availableUntil?.toISOString() ?? null,
    course: { id: course.id, title: course.titleAr || course.title },
  })))} />;
}
