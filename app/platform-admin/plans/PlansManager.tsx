"use client";

import { useState } from "react";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string;
  currency: string;
  price: number | string;
  billingIntervalMonths: number;
  trialMonths: number;
  featureFlags: {
    customDomain?: boolean;
    multiTeacher?: boolean;
    advancedAnalytics?: boolean;
    [key: string]: unknown;
  };
  limits: {
    maxStudents?: number | null;
    maxCourses?: number | null;
    maxTeachers?: number | null;
    maxStorage?: number | null;
    [key: string]: unknown;
  };
  isActive: boolean;
  sortOrder: number;
};

export function PlansManager({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans] = useState<Plan[]>(initialPlans);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(180);
  const [currency, setCurrency] = useState("EGP");
  const [billingIntervalMonths, setBillingIntervalMonths] = useState(1);
  const [trialMonths, setTrialMonths] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Feature flags
  const [flags, setFlags] = useState({
    customDomain: false,
    multiTeacher: false,
    advancedAnalytics: false,
  });

  // Limits
  const [limits, setLimits] = useState({
    maxStudents: "" as string | number,
    maxCourses: "" as string | number,
    maxTeachers: "" as string | number,
    maxStorage: "" as string | number,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function openCreateModal() {
    setEditingPlan(null);
    setCode("");
    setName("");
    setDescription("");
    setPrice(180);
    setCurrency("EGP");
    setBillingIntervalMonths(1);
    setTrialMonths(0);
    setIsActive(true);
    setFlags({ customDomain: false, multiTeacher: false, advancedAnalytics: false });
    setLimits({ maxStudents: "", maxCourses: "", maxTeachers: "", maxStorage: "" });
    setError("");
    setIsOpen(true);
  }

  function openEditModal(plan: Plan) {
    setEditingPlan(plan);
    setCode(plan.code);
    setName(plan.name);
    setDescription(plan.description || "");
    setPrice(Number(plan.price));
    setCurrency(plan.currency);
    setBillingIntervalMonths(plan.billingIntervalMonths);
    setTrialMonths(plan.trialMonths);
    setIsActive(plan.isActive);
    setFlags({
      customDomain: !!plan.featureFlags?.customDomain,
      multiTeacher: !!plan.featureFlags?.multiTeacher,
      advancedAnalytics: !!plan.featureFlags?.advancedAnalytics,
    });
    setLimits({
      maxStudents: (plan.limits?.maxStudents as number | string | undefined) ?? "",
      maxCourses: (plan.limits?.maxCourses as number | string | undefined) ?? "",
      maxTeachers: (plan.limits?.maxTeachers as number | string | undefined) ?? "",
      maxStorage: (plan.limits?.maxStorage as number | string | undefined) ?? "",
    });
    setError("");
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const payload = {
        code: code.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        currency,
        billingIntervalMonths: Number(billingIntervalMonths),
        trialMonths: Number(trialMonths),
        isActive,
        featureFlags: flags,
        limits: {
          maxStudents: limits.maxStudents === "" ? null : Number(limits.maxStudents),
          maxCourses: limits.maxCourses === "" ? null : Number(limits.maxCourses),
          maxTeachers: limits.maxTeachers === "" ? null : Number(limits.maxTeachers),
          maxStorage: limits.maxStorage === "" ? null : Number(limits.maxStorage),
        },
      };

      const url = editingPlan ? `/api/platform/plans/${editingPlan.id}` : "/api/platform/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save plan");

      setIsOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving plan");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleArchive(plan: Plan) {
    if (!confirm(`Are you sure you want to ${plan.isActive ? "deactivate" : "activate"} "${plan.name}"?`)) return;

    try {
      const res = await fetch(`/api/platform/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-xs text-[var(--color-muted)]">
          Manage platform commercial tiers, prices, student/teacher quotas, and bundled feature flags.
        </p>
        <button
          onClick={openCreateModal}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        >
          + Create SaaS Plan
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col justify-between rounded-xl border p-6 shadow-sm transition ${
              plan.isActive
                ? "border-[var(--color-border)] bg-[var(--color-surface)]"
                : "border-[var(--color-border)]/50 bg-[var(--color-surface)]/50 opacity-60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--color-muted)]">{plan.code}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    plan.isActive
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {plan.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <h2 className="mt-2 text-lg font-bold text-[var(--color-foreground)]">{plan.name}</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)] line-clamp-2">
                {plan.description || "No description provided."}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-[var(--color-foreground)]">
                  {Number(plan.price).toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-[var(--color-muted)]">
                  {plan.currency} / {plan.billingIntervalMonths === 1 ? "month" : `${plan.billingIntervalMonths} months`}
                </span>
              </div>

              {plan.trialMonths > 0 && (
                <p className="mt-1 text-[11px] font-semibold text-amber-500">
                  🎁 {plan.trialMonths} month(s) trial included
                </p>
              )}

              {/* Limits list */}
              <div className="mt-4 space-y-1.5 border-t border-[var(--color-border)] pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Students:</span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {plan.limits?.maxStudents ? plan.limits.maxStudents.toLocaleString() : "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Teachers:</span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {plan.limits?.maxTeachers ? plan.limits.maxTeachers : "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Courses:</span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {plan.limits?.maxCourses ? plan.limits.maxCourses : "Unlimited"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-muted)]">Storage:</span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {plan.limits?.maxStorage ? `${plan.limits.maxStorage} GB` : "Unlimited"}
                  </span>
                </div>
              </div>

              {/* Feature badges */}
              <div className="mt-4 flex flex-wrap gap-1 border-t border-[var(--color-border)] pt-3">
                {plan.featureFlags?.customDomain && (
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-500">
                    Custom Domain
                  </span>
                )}
                {plan.featureFlags?.multiTeacher && (
                  <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-500">
                    Multi-Teacher
                  </span>
                )}
                {plan.featureFlags?.advancedAnalytics && (
                  <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-500">
                    Advanced Analytics
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-2 border-t border-[var(--color-border)] pt-4">
              <button
                onClick={() => openEditModal(plan)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-semibold text-[var(--color-foreground)] hover:border-[var(--color-primary)]"
              >
                Edit Plan
              </button>
              <button
                onClick={() => handleToggleArchive(plan)}
                className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                {plan.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Plan Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                {editingPlan ? `Edit SaaS Plan: ${editingPlan.name}` : "Create New SaaS Plan"}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">Plan Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="e.g. launch-3990 or pro"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-mono text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Academy Growth"
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Plan description, included features, and terms..."
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">Price (EGP) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">Interval (Months)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={36}
                    value={billingIntervalMonths}
                    onChange={(e) => setBillingIntervalMonths(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">Trial (Months)</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={trialMonths}
                    onChange={(e) => setTrialMonths(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  />
                </div>
              </div>

              {/* Resource Quotas */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                  Plan Resource Quotas (Leave blank for unlimited)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[11px] text-[var(--color-muted)]">Students</span>
                    <input
                      type="number"
                      value={limits.maxStudents}
                      onChange={(e) => setLimits({ ...limits, maxStudents: e.target.value })}
                      placeholder="∞"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-foreground)]"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--color-muted)]">Teachers</span>
                    <input
                      type="number"
                      value={limits.maxTeachers}
                      onChange={(e) => setLimits({ ...limits, maxTeachers: e.target.value })}
                      placeholder="∞"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-foreground)]"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--color-muted)]">Courses</span>
                    <input
                      type="number"
                      value={limits.maxCourses}
                      onChange={(e) => setLimits({ ...limits, maxCourses: e.target.value })}
                      placeholder="∞"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-foreground)]"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--color-muted)]">Storage (GB)</span>
                    <input
                      type="number"
                      value={limits.maxStorage}
                      onChange={(e) => setLimits({ ...limits, maxStorage: e.target.value })}
                      placeholder="∞"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-xs text-[var(--color-foreground)]"
                    />
                  </div>
                </div>
              </div>

              {/* Bundled Feature Flags */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                  Bundled Feature Flags
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flags.customDomain}
                      onChange={(e) => setFlags({ ...flags, customDomain: e.target.checked })}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span>Custom Domain</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flags.multiTeacher}
                      onChange={(e) => setFlags({ ...flags, multiTeacher: e.target.checked })}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span>Multi-Teacher</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-2.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flags.advancedAnalytics}
                      onChange={(e) => setFlags({ ...flags, advancedAnalytics: e.target.checked })}
                      className="h-4 w-4 rounded accent-[var(--color-primary)]"
                    />
                    <span>Analytics</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded accent-[var(--color-primary)]"
                  />
                  <span>Plan is Active and available for selection</span>
                </label>
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
                  disabled={isSaving}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingPlan ? "Save Plan Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
