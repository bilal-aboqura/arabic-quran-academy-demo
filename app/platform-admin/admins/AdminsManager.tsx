"use client";

import { useState } from "react";

type AdminRow = {
  id: string;
  userId: string;
  role: string;
  isActive: boolean;
  createdAt: string | Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export function AdminsManager({
  initialAdmins,
}: {
  initialAdmins: AdminRow[];
}) {
  const [admins] = useState(initialAdmins);

  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("PLATFORM_ADMIN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleGrantAdmin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/platform/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to grant platform admin");

      setIsOpen(false);
      setEmail("");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error granting admin");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(admin: AdminRow) {
    try {
      const res = await fetch("/api/platform/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: admin.id, isActive: !admin.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle status");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-xs text-[var(--color-muted)]">
          Manage who can access the NexaClass Platform Control Panel. Platform administrators have global SaaS authority.
        </p>
        <button
          onClick={() => {
            setError("");
            setIsOpen(true);
          }}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        >
          + Add Platform Administrator
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="p-4">Administrator</th>
              <th className="p-4">Email</th>
              <th className="p-4">Authority Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Added Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-[var(--color-border)]/20">
                <td className="p-4 font-semibold text-[var(--color-foreground)]">
                  {admin.user.name}
                </td>
                <td className="p-4 font-mono text-xs text-[var(--color-muted)]">
                  {admin.user.email}
                </td>
                <td className="p-4">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      admin.role === "SUPER_ADMIN"
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : admin.role === "SUPPORT_ADMIN"
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : "bg-teal-500/10 text-teal-500 border border-teal-500/20"
                    }`}
                  >
                    {admin.role}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      admin.isActive
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-rose-500/10 text-rose-500"
                    }`}
                  >
                    {admin.isActive ? "ACTIVE" : "SUSPENDED"}
                  </span>
                </td>
                <td className="p-4 text-xs text-[var(--color-muted)]">
                  {new Date(admin.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleToggleStatus(admin)}
                    className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  >
                    {admin.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Admin Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-foreground)]">
                Grant Platform Administrator Access
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-rose-500/10 p-3 text-xs font-semibold text-rose-500 border border-rose-500/20">
                {error}
              </div>
            )}

            <form onSubmit={handleGrantAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  User Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                  The user must already be registered in the system.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Platform Authority Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Control)</option>
                  <option value="PLATFORM_ADMIN">PLATFORM_ADMIN (Tenant & Plan Operations)</option>
                  <option value="SUPPORT_ADMIN">SUPPORT_ADMIN (Support & Inspection Only)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Granting..." : "Grant Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
