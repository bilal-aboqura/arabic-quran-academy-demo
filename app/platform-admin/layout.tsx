import { redirect } from "next/navigation";
import Link from "next/link";
import { getPlatformActor } from "@/modules/platform/actor";
import { prisma } from "@/lib/prisma";
import { PlatformNav } from "./PlatformNav";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getPlatformActor();
  if (!actor) {
    redirect("/login");
  }

  const admin = await prisma.platformAdministrator.findUnique({
    where: { id: actor.administratorId },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/platform-admin" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-400 font-black text-white shadow-md">
                N
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-[var(--color-foreground)]">
                  NexaClass
                </span>
                <span className="ml-2 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                  Platform Control Panel
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-medium text-[var(--color-foreground)]">
                {admin?.user.name || "Platform Admin"}
              </p>
              <p className="text-[var(--color-muted)]">
                {admin?.role || "SUPER_ADMIN"} · {admin?.user.email}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)]"
            >
              ← Return to Academy
            </Link>
          </div>
        </div>

        {/* Section Tabs / Subnav */}
        <PlatformNav />
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
