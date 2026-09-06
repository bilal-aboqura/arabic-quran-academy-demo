import { redirect } from "next/navigation";
import { listAssignmentsForStudentTenant } from "@/modules/assignments/repository";
import { listManagedCoursesForTenant } from "@/modules/courses/repository";
import { canManageCourse } from "@/modules/tenants/authorization";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { AssignmentsWorkspace } from "./AssignmentsWorkspace";

function plainFiles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((file) => {
    if (!file || typeof file !== "object" || Array.isArray(file)) return [];
    const item = file as { storageKey?: unknown; fileName?: unknown };
    return typeof item.storageKey === "string"
      ? [{ storageKey: item.storageKey, fileName: typeof item.fileName === "string" ? item.fileName : null }]
      : [];
  });
}

export default async function DashboardAssignmentsPage() {
  const actor = await requireDashboardTenantActor();
  if (actor.role === "STUDENT") {
    const assignments = await listAssignmentsForStudentTenant({ tenantId: actor.tenantId, actor });
    return (
      <AssignmentsWorkspace
        mode="student"
        assignments={assignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          deadline: assignment.deadline?.toISOString() ?? null,
          maxGrade: assignment.maxGrade,
          course: assignment.course,
          module: assignment.module,
          status: assignment.status,
          submission: assignment.submission ? {
            id: assignment.submission.id,
            textContent: assignment.submission.textContent,
            files: plainFiles(assignment.submission.files),
            submittedAt: assignment.submission.submittedAt?.toISOString() ?? null,
            grade: assignment.submission.grade === null ? null : Number(assignment.submission.grade),
            feedback: assignment.submission.feedback,
          } : null,
        }))}
        courses={[]}
      />
    );
  }
  if (!canManageCourse(actor)) redirect("/dashboard");
  const courses = await listManagedCoursesForTenant(actor.tenantId, actor);
  return (
    <AssignmentsWorkspace
      mode="staff"
      assignments={[]}
      courses={courses.map((course) => ({ id: course.id, title: course.titleAr || course.title }))}
    />
  );
}
