import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { ProfileForm } from "./ProfileForm";
import { TeacherPublicProfileForm } from "./TeacherPublicProfileForm";

export default async function ProfilePage() {
  const actor = await requireDashboardTenantActor();
  const membership = await prisma.tenantMembership.findFirst({
    where: {
      id: actor.membershipId,
      tenantId: actor.tenantId,
      userId: actor.userId,
      status: "ACTIVE",
    },
    select: {
      displayName: true,
      teacherSubject: true,
      teacherBio: true,
      teacherLanguages: true,
      teacherAvatarUrl: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!membership) redirect("/dashboard");

  const isTeacher = actor.role === "TEACHER";
  const name = membership.displayName?.trim() || membership.user.name;
  const teacherSubject = membership.teacherSubject?.trim() ?? "";
  const teacherAvatar = membership.teacherAvatarUrl?.trim() ?? "";

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← العودة للوحة التحكم
      </Link>
      <h2 className="mt-6 text-xl font-bold text-[var(--color-foreground)]">
        تعديل بيانات الحساب
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        البريد الحالي: {membership.user.email} (لا يمكن تغييره من هنا)
      </p>
      {isTeacher && (
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          بيانات المعلم العامة أدناه تخص هذه الأكاديمية فقط.
        </p>
      )}
      <ProfileForm defaultName={name} />
      {isTeacher ? (
        <TeacherPublicProfileForm defaultSubject={teacherSubject} defaultAvatarUrl={teacherAvatar} defaultBio={membership.teacherBio || ''} defaultLanguages={membership.teacherLanguages || ''} />
      ) : null}
    </div>
  );
}
