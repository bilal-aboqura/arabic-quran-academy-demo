import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardNav } from "./DashboardNav";
import { getServerTranslator } from "@/lib/i18n/server";
import { getTenantActor } from "@/modules/tenants/actor";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { getTenantSaaSCapabilities } from "@/modules/platform/saas.repository";
import { prisma } from '@/lib/prisma';
import './academy-dashboard.css';

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getServerTranslator();
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const requestHeaders = await headers();
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  const tenantActor = tenant ? await getTenantActor(tenant) : null;

  // A dashboard has no tenant-less compatibility mode: its role is always a
  // TenantMembership role, including during local development.
  if (!tenant) redirect("/");
  if (!tenantActor) redirect("/login");

  const isAdmin = tenantActor.role === "OWNER" || tenantActor.role === "ADMIN";
  const isAssistant = tenantActor.role === "ASSISTANT";
  const isTeacher = tenantActor.role === "TEACHER";
  const capabilities = await getTenantSaaSCapabilities(tenantActor.tenantId);
  const academySite = tenantActor.role === 'STUDENT' ? await prisma.site.findUnique({ where: { tenantId: tenantActor.tenantId }, select: { template: { select: { code: true } } } }) : null;

  return (
    <>
      {isAdmin ? (
        <div className="admin-intro-loader" aria-hidden>
          <div className="admin-intro-stripe" />
          <div className="admin-intro-stripe" />
          <div className="admin-intro-stripe" />
          <div className="admin-intro-stripe" />
          <div className="admin-intro-claim">
            <span>{t("dashboard.introHello", "Welcome")}</span>
            <span>{t("dashboard.introBack", "back")}</span>
            <span>{t("dashboard.introAgain", "again")}</span>
          </div>
        </div>
      ) : null}
      <div className={`dashboard-shell ${academySite?.template?.code === 'global-arabic-quran' ? 'academy-dashboard' : ''}`}>
      <div
        className={`mx-auto max-w-6xl px-4 py-8 sm:px-6 ${
          isAdmin || isAssistant ? "dashboard-admin-glow relative isolate overflow-hidden rounded-2xl" : ""
        }`}
      >
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            {t("dashboard.title", "Dashboard")}
          </h1>
          <nav className="flex flex-wrap items-center gap-2">
            <DashboardNav isAdmin={isAdmin} isAssistant={isAssistant} isTeacher={isTeacher} showWebsite={(isAdmin || isTeacher) && (capabilities.features.websiteTemplate || capabilities.features.advancedWebsiteBuilder)} />
          </nav>
        </div>
        {children}
      </div>
      </div>
    </>
  );
}
