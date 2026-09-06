"use client";

import { useState } from "react";
import Link from "next/link";

type SubscriptionRow = {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  currentPeriodStart: string | Date;
  currentPeriodEnd: string | Date | null;
  trialEndsAt: string | Date | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    domains: Array<{ hostname: string }>;
    memberships: Array<{ user: { name: string; email: string } }>;
  };
  plan: {
    id: string;
    name: string;
    code: string;
    price: string | number;
    billingIntervalMonths: number;
    currency: string;
  };
};

export function SubscriptionsManager({
  initialSubscriptions,
}: {
  initialSubscriptions: SubscriptionRow[];
}) {
  const [subscriptions] = useState(initialSubscriptions);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = subscriptions.filter((sub) => {
    if (filter !== "ALL" && sub.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTenant = sub.tenant.name.toLowerCase().includes(q) || sub.tenant.slug.toLowerCase().includes(q);
      const matchOwner = sub.tenant.memberships[0]?.user.email.toLowerCase().includes(q);
      const matchPlan = sub.plan.name.toLowerCase().includes(q);
      return matchTenant || matchOwner || matchPlan;
    }
    return true;
  });

  async function handleQuickExtend(tenantId: string, months: number) {
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendMonths: months, subscriptionStatus: "ACTIVE" }),
      });
      if (!res.ok) throw new Error("Extension failed");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to extend subscription");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by academy, owner email, or plan..."
            className="min-w-[240px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="CANCELED">Canceled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="p-4">Academy</th>
              <th className="p-4">Owner</th>
              <th className="p-4">SaaS Plan</th>
              <th className="p-4">Price / Interval</th>
              <th className="p-4">Status</th>
              <th className="p-4">Renewal / Expiry</th>
              <th className="p-4">Trial Ends</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-[var(--color-muted)]">
                  No subscriptions match the selected criteria.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const owner = sub.tenant.memberships[0]?.user;
                const isOverdue =
                  sub.status === "ACTIVE" &&
                  sub.currentPeriodEnd &&
                  new Date(sub.currentPeriodEnd) < new Date();

                return (
                  <tr key={sub.id} className="hover:bg-[var(--color-border)]/20">
                    <td className="p-4">
                      <p className="font-semibold text-[var(--color-foreground)]">{sub.tenant.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{sub.tenant.slug}</p>
                    </td>
                    <td className="p-4 text-xs">
                      <p className="font-medium text-[var(--color-foreground)]">{owner?.name || "—"}</p>
                      <p className="text-[var(--color-muted)]">{owner?.email || "—"}</p>
                    </td>
                    <td className="p-4 font-semibold text-xs text-[var(--color-foreground)]">
                      {sub.plan.name}
                    </td>
                    <td className="p-4 text-xs">
                      <span className="font-bold text-[var(--color-foreground)]">
                        {Number(sub.plan.price).toLocaleString()} {sub.plan.currency}
                      </span>
                      <span className="text-[var(--color-muted)]"> / {sub.plan.billingIntervalMonths}m</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isOverdue
                            ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                            : sub.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : sub.status === "TRIAL"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {isOverdue ? "OVERDUE" : sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[var(--color-muted)]">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : "No end date"}
                    </td>
                    <td className="p-4 text-xs text-[var(--color-muted)]">
                      {sub.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleQuickExtend(sub.tenantId, 1)}
                          className="rounded bg-teal-500/10 px-2 py-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/20"
                        >
                          +1M
                        </button>
                        <Link
                          href={`/platform-admin/tenants/${sub.tenantId}`}
                          className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)] hover:border-[var(--color-primary)]"
                        >
                          Manage →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
