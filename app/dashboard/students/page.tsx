import { getServerTranslator } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { canManageWallet } from "@/modules/tenants/authorization";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { StudentsList } from "./StudentsList";

/** Tenant-scoped student directory. Global User.role and User.balance are never authority or commerce data here. */
export default async function StudentsPage() {
  const actor = await requireDashboardTenantActor("MANAGE_STUDENTS");
  const t = await getServerTranslator();
  const [memberships, courses] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { tenantId: actor.tenantId, role: "STUDENT", status: "ACTIVE" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        studentAccount: { select: { balance: true } },
        studentEnrollments: {
          where: { tenantId: actor.tenantId },
          include: { course: { select: { id: true, title: true, titleAr: true, slug: true } } },
        },
      },
      orderBy: [{ displayName: "asc" }, { createdAt: "asc" }],
    }),
    prisma.course.findMany({
      where: { tenantId: actor.tenantId },
      select: { id: true, title: true, titleAr: true, slug: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
  ]);
  const isOwnerOrAdmin = actor.role === "OWNER" || actor.role === "ADMIN";
  const students = memberships.map((membership) => ({
    id: membership.userId,
    name: membership.displayName || membership.user.name,
    email: membership.user.email,
    role: "STUDENT",
    balance: Number(membership.studentAccount?.balance ?? 0),
    student_number: membership.studentNumber,
    guardian_number: membership.guardianNumber,
    copyright_code: membership.copyrightCode,
    _count: { enrollments: membership.studentEnrollments.length },
    enrollments: membership.studentEnrollments.map((enrollment) => ({
      id: enrollment.id,
      courseId: enrollment.courseId,
      course: enrollment.course,
    })),
  }));

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-[var(--color-foreground)]">
        {t("dashboard.studentsPage.pageTitleStudentsOnly", "Student list")}
      </h2>
      <StudentsList
        students={students}
        courses={courses}
        isAdmin={isOwnerOrAdmin}
        canAddBalance={canManageWallet(actor)}
        canManageEnrollments={isOwnerOrAdmin}
        canEditFullProfile={false}
      />
    </div>
  );
}
