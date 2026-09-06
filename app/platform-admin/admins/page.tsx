import { listPlatformAdministrators } from "@/modules/platform/service";
import { AdminsManager } from "./AdminsManager";

export default async function PlatformAdminAdminsPage() {
  const admins = await listPlatformAdministrators();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          Platform Administrators
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Superusers with explicit access to the NexaClass Platform Control Panel. Independent of tenant membership.
        </p>
      </div>

      <AdminsManager initialAdmins={admins as never} />
    </div>
  );
}
