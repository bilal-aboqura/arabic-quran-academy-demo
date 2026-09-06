import { listPlatformAuditLogs } from "@/modules/platform/audit";

export default async function PlatformAdminAuditLogsPage() {
  const logs = await listPlatformAuditLogs({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
          Platform Audit Logs
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Immutable event trail of platform operations, tenant state changes, plan upgrades, quota overrides, and admin actions.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Actor</th>
              <th className="p-4">Action</th>
              <th className="p-4">Target Type / ID</th>
              <th className="p-4">Event Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-[var(--color-muted)]">
                  No platform audit events logged yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-border)]/20">
                  <td className="p-4 whitespace-nowrap text-xs text-[var(--color-muted)]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-xs">
                    <p className="font-semibold text-[var(--color-foreground)]">
                      {log.actorUser?.name || "Platform Admin"}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--color-muted)]">
                      {log.actorUser?.email || log.actorUserId}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="rounded bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-mono font-bold text-[var(--color-primary)]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-mono">
                    <span className="text-[var(--color-muted)]">{log.targetType}: </span>
                    <span className="text-[var(--color-foreground)]">{log.targetId}</span>
                  </td>
                  <td className="p-4 text-xs">
                    {log.metadata ? (
                      <pre className="max-w-md overflow-x-auto rounded bg-[var(--color-background)] p-2 font-mono text-[11px] text-[var(--color-muted)]">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
