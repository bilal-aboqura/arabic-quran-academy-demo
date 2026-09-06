import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { listLiveStreamsForTenant } from "@/modules/live-streams/repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { LiveStreamsList } from "./LiveStreamsList";

export default async function DashboardLiveStreamsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const actor = await requireDashboardTenantActor("MANAGE_LIVE_STREAMS");
  const t = await getServerTranslator();
  const P = "dashboard.liveStreamsPage";

  const streams = await listLiveStreamsForTenant({
    tenantId: actor.tenantId,
    ...(actor.role === "TEACHER" ? { teacherUserId: actor.userId } : {}),
  });

  const list = streams.map((s) => {
    return {
      id: s.id, title: s.title, titleAr: s.titleAr ?? "", provider: s.provider,
      meetingUrl: s.meetingUrl, scheduledAt: s.scheduledAt,
      course: { id: s.course.id, title: s.course.title, slug: s.course.slug },
    };
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">
          {t(`${P}.title`)}
        </h2>
        <Link
          href="/dashboard/live-streams/new"
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          {t(`${P}.addStream`)}
        </Link>
      </div>
      <LiveStreamsList streams={list} />
    </div>
  );
}
