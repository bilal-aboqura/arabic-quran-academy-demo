import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { listManagedCoursesForTenant } from "@/modules/courses/repository";
import { findLiveStreamForTenant } from "@/modules/live-streams/repository";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { LiveStreamForm } from "../../LiveStreamForm";

type Props = { params: Promise<{ id: string }> };

function toIsoString(value: unknown): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export default async function EditLiveStreamPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const actor = await requireDashboardTenantActor("MANAGE_LIVE_STREAMS");

  const { id } = await params;
  const stream = await findLiveStreamForTenant(actor.tenantId, id);
  if (!stream) notFound();
  if (actor.role === "TEACHER" && stream.course.createdById !== actor.userId) redirect("/dashboard");
  const courses = await listManagedCoursesForTenant(actor.tenantId, actor);

  const initialData = {
    id: stream.id, courseId: stream.courseId, title: stream.title, titleAr: stream.titleAr ?? "",
    provider: (stream.provider === "google_meet" ? "google_meet" : "zoom") as "zoom" | "google_meet",
    meetingUrl: stream.meetingUrl, meetingId: stream.meetingId ?? "", meetingPassword: stream.meetingPassword ?? "",
    scheduledAt: toIsoString(stream.scheduledAt), description: stream.description ?? "", order: stream.order,
  };

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
        تعديل البث المباشر
      </h2>
      <LiveStreamForm courseOptions={courseOptions} initialData={initialData} />
    </div>
  );
}
