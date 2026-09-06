"use client";

import { useState } from "react";

type Plan = { id: string; name: string; price: string; currency: string };
type Subscription = { planId: string; status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" } | null;

export function PlatformTenantControls({ tenantId, initialStatus, plans, initialSubscription }: {
  tenantId: string; initialStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED"; plans: Plan[]; initialSubscription: Subscription;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [planId, setPlanId] = useState(initialSubscription?.planId ?? "");
  const [subscriptionStatus, setSubscriptionStatus] = useState<NonNullable<Subscription>["status"]>(initialSubscription?.status ?? "TRIAL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function update(payload: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/platform/tenants/${tenantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(body.error || "Unable to save");
      else {
        if (body.tenant?.status) setStatus(body.tenant.status);
        if (body.subscription?.status) setSubscriptionStatus(body.subscription.status);
        setMessage("Saved");
      }
    } finally { setBusy(false); }
  }
  const next = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  return <div className="flex min-w-[180px] flex-col gap-2"><button type="button" disabled={busy || status === "ARCHIVED"} onClick={() => void update({ status: next })} className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-xs font-medium disabled:opacity-50">{busy ? "Saving…" : status === "ACTIVE" ? "Suspend" : "Reactivate"}</button><div className="flex gap-1"><select aria-label="SaaS plan" value={planId} onChange={(event) => setPlanId(event.target.value)} className="min-w-0 flex-1 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1 py-1 text-xs"><option value="">Plan…</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.price} {plan.currency}</option>)}</select><select aria-label="Subscription status" value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value as NonNullable<Subscription>["status"])} className="rounded border border-[var(--color-border)] bg-[var(--color-background)] px-1 py-1 text-xs"><option value="TRIAL">Trial</option><option value="ACTIVE">Active</option><option value="PAST_DUE">Past due</option><option value="CANCELED">Canceled</option><option value="EXPIRED">Expired</option></select></div><button type="button" disabled={busy || !planId} onClick={() => void update({ subscription: { planId, status: subscriptionStatus } })} className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Set subscription</button>{message ? <p className="text-xs text-[var(--color-muted)]" role="status">{message}</p> : null}</div>;
}
