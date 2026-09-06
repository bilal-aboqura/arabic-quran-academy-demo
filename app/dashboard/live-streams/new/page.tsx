import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { listManagedCoursesForTenant } from "@/modules/courses/repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { LiveStreamForm } from "../LiveStreamForm";

export default async function NewLiveStreamPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const actor = await requireDashboardTenantActor("MANAGE_LIVE_STREAMS");
  const courses = await listManagedCoursesForTenant(actor.tenantId, actor);
  const courseOptions = courses.map((c) => ({
    id: c.id,
    title: c.titleAr ?? c.title,
  }));

  return (
    <div>
      <Link
        href="/dashboard/live-streams"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← العودة إلى البثوث المباشرة
      </Link>
      <h2 className="mt-4 text-xl font-bold text-[var(--color-foreground)]">
        إضافة بث مباشر
      </h2>
      <LiveStreamForm courseOptions={courseOptions} />
    </div>
  );
}
