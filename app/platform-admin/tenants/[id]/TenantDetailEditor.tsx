"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PlanOption = {
  id: string;
  name: string;
  code: string;
  price: number | string;
};

export type TenantDetailData = {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  status: string;
  createdAt: string | Date;
  domains: Array<{ hostname: string }>;
  saasSubscription: {
    planId: string;
    status: string;
    currentPeriodEnd: string | Date | null;
    trialEndsAt: string | Date | null;
    featureFlagOverrides?: unknown;
    limitOverrides?: unknown;
    plan?: {
      id: string;
      name: string;
      price: unknown;
      billingIntervalMonths: number;
      featureFlags?: unknown;
      limits?: unknown;
    };
  } | null;
  owner: { id: string; name: string; email: string } | null;
  studentsCount: number;
  teachersCount: number;
  _count: {
    courses: number;
    enrollments: number;
    assignments: number;
    quizAttempts: number;
  };
  saasInvoices: Array<{
    id: string;
    amount: unknown;
    currency: string;
    status: string;
    provider: string;
    createdAt: string | Date;
  }>;
};

export function TenantDetailEditor({
  tenant,
  plans,
}: {
  tenant: TenantDetailData;
  plans: PlanOption[];
}) {
  const router = useRouter();

  // Status state
  const [status, setStatus] = useState<string>(tenant.status);
  const [name, setName] = useState(tenant.name);
  const [nameAr, setNameAr] = useState(tenant.nameAr || "");

  // Subscription state
  const sub = tenant.saasSubscription;
  const [planId, setPlanId] = useState(sub?.planId || plans[0]?.id || "");
  const [subscriptionStatus, setSubscriptionStatus] = useState(sub?.status || "ACTIVE");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(
    sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString().split("T")[0] : ""
  );
  const [trialEndsAt, setTrialEndsAt] = useState(
    sub?.trialEndsAt ? new Date(sub.trialEndsAt).toISOString().split("T")[0] : ""
  );

  // Feature Flag Overrides
  const planFlags = (sub?.plan?.featureFlags as Record<string, boolean> | null) || {};
  const overrides = (sub?.featureFlagOverrides as Record<string, boolean> | null) || {};
  const [flags, setFlags] = useState({
    customDomain: overrides.customDomain !== undefined ? overrides.customDomain : !!planFlags.customDomain,
    multiTeacher: overrides.multiTeacher !== undefined ? overrides.multiTeacher : !!planFlags.multiTeacher,
    advancedAnalytics: overrides.advancedAnalytics !== undefined ? overrides.advancedAnalytics : !!planFlags.advancedAnalytics,
  });

  // Limits
  const planLimits = (sub?.plan?.limits as Record<string, number | null> | null) || {};
  const limOverrides = (sub?.limitOverrides as Record<string, number | null> | null) || {};
  const [limits, setLimits] = useState<Record<string, string | number>>({
    maxStudents: (limOverrides.maxStudents !== undefined ? limOverrides.maxStudents : planLimits.maxStudents) ?? "",
    maxCourses: (limOverrides.maxCourses !== undefined ? limOverrides.maxCourses : planLimits.maxCourses) ?? "",
    maxTeachers: (limOverrides.maxTeachers !== undefined ? limOverrides.maxTeachers : planLimits.maxTeachers) ?? "",
    maxStorage: (limOverrides.maxStorage !== undefined ? limOverrides.maxStorage : planLimits.maxStorage) ?? "",
  });

  // Manual payment modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(Number(sub?.plan?.price) || 3990);
  const [payMonths, setPayMonths] = useState(sub?.plan?.billingIntervalMonths || 3);
  const [payNotes, setPayNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleSaveAll() {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nameAr,
          status,
          planId,
          subscriptionStatus,
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd).toISOString() : null,
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
          featureFlagOverrides: flags,
          limitOverrides: {
            maxStudents: limits.maxStudents === "" ? null : Number(limits.maxStudents),
            maxCourses: limits.maxCourses === "" ? null : Number(limits.maxCourses),
            maxTeachers: limits.maxTeachers === "" ? null : Number(limits.maxTeachers),
            maxStorage: limits.maxStorage === "" ? null : Number(limits.maxStorage),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update tenant");

      setMessage({ text: "Tenant settings and subscription updated successfully!", type: "success" });
      router.refresh();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Update failed", type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleQuickExtend(months: number) {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extendMonths: months, subscriptionStatus: "ACTIVE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend subscription");

      setMessage({ text: `Subscription successfully extended by +${months} month(s)!`, type: "success" });
      window.location.reload();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Extension failed", type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/platform/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant.id,
          planId,
          amount: Number(payAmount),
          periodMonths: Number(payMonths),
          provider: "MANUAL",
          notes: payNotes || "Manual payment recorded from platform admin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment recording failed");

      setIsPayModalOpen(false);
      setMessage({ text: `Payment of ${payAmount} EGP recorded. Subscription extended by ${payMonths} month(s)!`, type: "success" });
      window.location.reload();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Payment failed", type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`rounded-xl p-4 text-sm font-semibold border ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              status === "ACTIVE"
                ? "bg-emerald-500/10 text-emerald-500"
                : status === "SUSPENDED"
                ? "bg-rose-500/10 text-rose-500"
                : "bg-gray-500/10 text-gray-400"
            }`}
          >
            {status}
          </span>
          <span className="text-xs text-[var(--color-muted)]">
            Slug: <code className="font-mono text-[var(--color-foreground)]">{tenant.slug}</code>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "ACTIVE" ? (
            <button
              onClick={() => setStatus("SUSPENDED")}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20"
            >
              Suspend Academy
            </button>
          ) : (
            <button
              onClick={() => setStatus("ACTIVE")}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500 hover:bg-emerald-500/20"
            >
              Activate Academy
            </button>
          )}

          <button
            onClick={() => setIsPayModalOpen(true)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
          >
            💰 Record SaaS Payment
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Academy Info & Subscription */}
        <div className="space-y-6 lg:col-span-2">
          {/* Academy Identity Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">Academy Identity & Branding</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Academy Name (English)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Academy Name (Arabic)
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <span className="font-semibold text-[var(--color-muted)]">Primary Domain:</span>
                <p className="mt-1 font-mono text-[var(--color-foreground)]">
                  {tenant.domains[0]?.hostname || `${tenant.slug}.localhost`}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <span className="font-semibold text-[var(--color-muted)]">Registered Date:</span>
                <p className="mt-1 text-[var(--color-foreground)]">
                  {new Date(tenant.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* SaaS Plan & Subscription Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--color-foreground)]">NexaClass SaaS Subscription</h2>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickExtend(1)}
                  className="rounded bg-teal-500/10 px-2 py-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/20"
                >
                  +1 Month
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickExtend(3)}
                  className="rounded bg-teal-500/10 px-2 py-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/20"
                >
                  +3 Months
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickExtend(12)}
                  className="rounded bg-teal-500/10 px-2 py-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/20"
                >
                  +1 Year
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  SaaS Plan
                </label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
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
                  Subscription Status
                </label>
                <select
                  value={subscriptionStatus}
                  onChange={(e) => setSubscriptionStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIAL">TRIAL</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="CANCELED">CANCELED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Renewal / Period End Date
                </label>
                <input
                  type="date"
                  value={currentPeriodEnd}
                  onChange={(e) => setCurrentPeriodEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Trial Ends Date
                </label>
                <input
                  type="date"
                  value={trialEndsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Feature Flags & Limit Overrides Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">Feature Overrides & Hard Limits</h2>

            <div className="mb-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Tenant Feature Overrides
              </span>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flags.customDomain}
                    onChange={(e) => setFlags({ ...flags, customDomain: e.target.checked })}
                    className="h-4 w-4 rounded accent-[var(--color-primary)]"
                  />
                  <span>Custom Domain</span>
                </label>

                <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flags.multiTeacher}
                    onChange={(e) => setFlags({ ...flags, multiTeacher: e.target.checked })}
                    className="h-4 w-4 rounded accent-[var(--color-primary)]"
                  />
                  <span>Multi-Teacher</span>
                </label>

                <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flags.advancedAnalytics}
                    onChange={(e) => setFlags({ ...flags, advancedAnalytics: e.target.checked })}
                    className="h-4 w-4 rounded accent-[var(--color-primary)]"
                  />
                  <span>Advanced Analytics</span>
                </label>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Resource Quota Overrides (Blank = Unlimited)
              </span>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-muted)]">Max Students</label>
                  <input
                    type="number"
                    value={limits.maxStudents}
                    onChange={(e) => setLimits({ ...limits, maxStudents: e.target.value })}
                    placeholder="Unlimited"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-muted)]">Max Courses</label>
                  <input
                    type="number"
                    value={limits.maxCourses}
                    onChange={(e) => setLimits({ ...limits, maxCourses: e.target.value })}
                    placeholder="Unlimited"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-muted)]">Max Teachers</label>
                  <input
                    type="number"
                    value={limits.maxTeachers}
                    onChange={(e) => setLimits({ ...limits, maxTeachers: e.target.value })}
                    placeholder="Unlimited"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--color-muted)]">Storage (GB)</label>
                  <input
                    type="number"
                    value={limits.maxStorage}
                    onChange={(e) => setLimits({ ...limits, maxStorage: e.target.value })}
                    placeholder="Unlimited"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs text-[var(--color-foreground)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Owner & Usage Metrics */}
        <div className="space-y-6">
          {/* Owner Profile Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">Academy Owner Details</h2>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[var(--color-muted)]">Name:</span>
                <p className="font-semibold text-sm text-[var(--color-foreground)]">
                  {tenant.owner?.name || "Unassigned"}
                </p>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">Email:</span>
                <p className="font-mono text-[var(--color-foreground)]">{tenant.owner?.email || "—"}</p>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">Owner User ID:</span>
                <p className="font-mono text-[11px] text-[var(--color-muted)] truncate">{tenant.owner?.id || "—"}</p>
              </div>
            </div>
          </div>

          {/* Usage Metrics Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h2 className="text-base font-bold text-[var(--color-foreground)] mb-4">Platform Usage Statistics</h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <span className="text-xl font-black text-[var(--color-foreground)]">{tenant.studentsCount}</span>
                <p className="text-[11px] text-[var(--color-muted)] font-medium">Students</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <span className="text-xl font-black text-[var(--color-foreground)]">{tenant.teachersCount}</span>
                <p className="text-[11px] text-[var(--color-muted)] font-medium">Teachers</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <span className="text-xl font-black text-[var(--color-foreground)]">{tenant._count.courses}</span>
                <p className="text-[11px] text-[var(--color-muted)] font-medium">Courses</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <span className="text-xl font-black text-[var(--color-foreground)]">{tenant._count.enrollments}</span>
                <p className="text-[11px] text-[var(--color-muted)] font-medium">Enrollments</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <span className="text-xl font-black text-[var(--color-foreground)]">{tenant._count.assignments}</span>
                <p className="text-[11px] text-[var(--color-muted)] font-medium">Assignments</p>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <span className="text-xl font-black text-[var(--color-foreground)]">{tenant._count.quizAttempts}</span>
                <p className="text-[11px] text-[var(--color-muted)] font-medium">Quiz Attempts</p>
              </div>
            </div>
          </div>

          {/* Past SaaS Invoices Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
            <h2 className="text-base font-bold text-[var(--color-foreground)] mb-3">SaaS Billing History</h2>
            {tenant.saasInvoices.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)]">No recorded SaaS payments yet.</p>
            ) : (
              <div className="space-y-2">
                {tenant.saasInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[var(--color-foreground)]">{String(inv.amount)} {inv.currency}</p>
                      <p className="text-[10px] text-[var(--color-muted)]">{new Date(inv.createdAt).toLocaleDateString()} · {inv.provider}</p>
                    </div>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-foreground)]">
                Record SaaS Payment / Renewal
              </h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Amount (EGP) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Extend Period By (Months) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={36}
                  value={payMonths}
                  onChange={(e) => setPayMonths(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Notes / Receipt Reference
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Bank transfer / Cash collection receipt"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-foreground)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {isSaving ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
