import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerTranslator } from "@/lib/i18n/server";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { TeachersAdminClient } from "./TeachersAdminClient";

export default async function TeachersAdminPage() {
  const actor = await requireDashboardTenantActor("MANAGE_STAFF");
  const t = await getServerTranslator();
  const [settings, memberships] = await Promise.all([
    prisma.tenantSettings.findUnique({ where: { tenantId: actor.tenantId }, select: { teachersEnabled: true } }),
    prisma.tenantMembership.findMany({
      where: { tenantId: actor.tenantId, role: "TEACHER", status: "ACTIVE" },
      select: {
        id: true, displayName: true, studentNumber: true, teacherSubject: true,
        teacherAvatarUrl: true, teacherHomepageOrder: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ teacherHomepageOrder: "asc" }, { displayName: "asc" }],
    }),
  ]);
  const initialTeachers = memberships.map((membership) => ({
    id: membership.id,
    name: membership.displayName || membership.user.name,
    email: membership.user.email,
    subject: membership.teacherSubject,
    avatarUrl: membership.teacherAvatarUrl,
    phone: membership.studentNumber,
    homepageOrder: membership.teacherHomepageOrder,
  }));

  return (
    <div>
      <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        {t("dashboard.backToDashboard")}
      </Link>
      <h2 className="mt-4 text-xl font-bold text-[var(--color-foreground)]">{t("dashboard.teachersPage.title")}</h2>
      <TeachersAdminClient initialEnabled={settings?.teachersEnabled ?? false} initialTeachers={initialTeachers} />
    </div>
  );
}
