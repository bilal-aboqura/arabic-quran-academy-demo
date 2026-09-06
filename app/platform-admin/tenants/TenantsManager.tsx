"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TenantRow = {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  status: string;
  createdAt: string | Date;
  domains: Array<{ hostname: string; isPrimary: boolean; status: string }>;
  saasSubscription: {
    planId: string;
    status: string;
    plan: { id: string; name: string; code: string; price: string | number };
  } | null;
  memberships: Array<{
    user: { id: string; name: string; email: string };
  }>;
  _count: {
    courses: number;
    memberships: number;
  };
};

type PlanOption = {
  id: string;
  name: string;
  code: string;
  price: number | string;
};

export function TenantsManager({
  initialTenants,
  plans,
}: {
  initialTenants: TenantRow[];
  plans: PlanOption[];
}) {
  const router = useRouter();
  const [tenants] = useState<TenantRow[]>(initialTenants);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || "");
  const [trialDays, setTrialDays] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = tenants.filter((t) => {
    if (statusFilter !== "ALL") {
      if (statusFilter === "TRIAL") {
        if (t.saasSubscription?.status !== "TRIAL") return false;
      } else if (t.status !== statusFilter) {
        return false;
      }
    }
    if (planFilter !== "ALL") {
      if (t.saasSubscription?.planId !== planFilter) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = t.name.toLowerCase().includes(q) || (t.nameAr && t.nameAr.toLowerCase().includes(q));
      const matchSlug = t.slug.toLowerCase().includes(q);
      const owner = t.memberships[0]?.user;
      const matchOwner = owner && (owner.email.toLowerCase().includes(q) || owner.name.toLowerCase().includes(q));
      return matchName || matchSlug || matchOwner;
    }
    return true;
  });

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nameAr,
          slug,
          ownerEmail,
          ownerName,
          planId: selectedPlanId,
          trialDays: Number(trialDays) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create academy");
      }

      setIsModalOpen(false);
      setName("");
      setNameAr("");
      setSlug("");
      setOwnerEmail("");
      setOwnerName("");
      router.refresh();
      // Reload page to display new academy
      window.location.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error creating academy");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by academy, slug, owner email..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-foreground)] placeholder-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)]"
            >
              <option value="ALL">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Link
          href="/platform-admin/tenants/new"
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        >
          + Create Academy
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="p-4">Academy</th>
              <th className="p-4">Owner</th>
              <th className="p-4">Domain</th>
              <th className="p-4">Plan & Status</th>
              <th className="p-4 text-center">Courses</th>
              <th className="p-4 text-center">Members</th>
              <th className="p-4">Created</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-[var(--color-muted)]">
                  No academies match your current search or filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const owner = t.memberships[0]?.user;
                const domain = t.domains[0]?.hostname || `${t.slug}.localhost`;
                return (
                  <tr key={t.id} className="hover:bg-[var(--color-border)]/20">
                    <td className="p-4">
                      <p className="font-semibold text-[var(--color-foreground)]">
                        {t.nameAr || t.name}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">ID: {t.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-medium text-[var(--color-foreground)]">
                        {owner?.name || "—"}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">{owner?.email || "—"}</p>
                    </td>
                    <td className="p-4 text-xs font-mono text-[var(--color-muted)]">
                      {domain}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-[var(--color-foreground)]">
                          {t.saasSubscription?.plan?.name || "No Plan"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              t.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : t.status === "SUSPENDED"
                                ? "bg-rose-500/10 text-rose-500"
                                : "bg-gray-500/10 text-gray-400"
                            }`}
                          >
                            {t.status}
                          </span>
                          {t.saasSubscription?.status === "TRIAL" && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-500">
                              TRIAL
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-medium text-[var(--color-foreground)]">
                      {t._count.courses}
                    </td>
                    <td className="p-4 text-center font-medium text-[var(--color-foreground)]">
                      {t._count.memberships}
                    </td>
                    <td className="p-4 text-xs text-[var(--color-muted)]">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/platform-admin/tenants/${t.id}`}
                        className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:border-[var(--color-primary)]"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Academy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                Provision New Academy
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-rose-500/10 p-3 text-xs font-semibold text-rose-500 border border-rose-500/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Academy Name (English / Internal) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                    }
                  }}
                  placeholder="e.g. Cairo Math Academy"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Academy Name (Arabic Branding)
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: أكاديمية القاهرة للرياضيات"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Subdomain Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. cairo-math"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-mono text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                  Will resolve as: <code className="font-mono">{slug || "slug"}.localhost</code>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@academy.com"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Prof. Ahmed"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">
                    SaaS Plan *
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price} EGP)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">
                    Initial Trial Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Provisioning..." : "Provision Academy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
