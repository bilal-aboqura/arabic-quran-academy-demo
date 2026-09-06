"use client";

import { useState } from "react";
import Link from "next/link";

type InvoiceRow = {
  id: string;
  tenantId: string;
  planId: string | null;
  amount: string | number;
  currency: string;
  status: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  provider: string;
  transactionId: string | null;
  notes: string | null;
  createdAt: string | Date;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  plan: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type TenantOption = {
  id: string;
  name: string;
};

export function BillingManager({
  initialInvoices,
  tenants,
}: {
  initialInvoices: InvoiceRow[];
  tenants: TenantOption[];
}) {
  const [invoices] = useState(initialInvoices);
  const [search, setSearch] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || "");
  const [amount, setAmount] = useState(3990);
  const [periodMonths, setPeriodMonths] = useState(3);
  const [provider, setProvider] = useState("MANUAL");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filtered = invoices.filter((inv) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inv.tenant.name.toLowerCase().includes(q) ||
        inv.tenant.slug.toLowerCase().includes(q) ||
        (inv.transactionId && inv.transactionId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  async function handleRecordInvoice(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/platform/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          amount: Number(amount),
          periodMonths: Number(periodMonths),
          provider,
          transactionId: transactionId.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record SaaS invoice");

      setIsOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error recording invoice");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by academy or transaction ID..."
          className="min-w-[260px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
        />

        <button
          onClick={() => {
            setError("");
            setIsOpen(true);
          }}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        >
          + Record SaaS Payment
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <th className="p-4">Invoice ID / Date</th>
              <th className="p-4">Academy</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Covered Period</th>
              <th className="p-4">Method / Reference</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-[var(--color-muted)]">
                  No SaaS invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-[var(--color-border)]/20">
                  <td className="p-4">
                    <p className="font-mono text-xs font-semibold text-[var(--color-foreground)]">
                      {inv.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/platform-admin/tenants/${inv.tenantId}`}
                      className="font-semibold text-xs text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                    >
                      {inv.tenant.name}
                    </Link>
                    <p className="text-[11px] text-[var(--color-muted)]">{inv.tenant.slug}</p>
                  </td>
                  <td className="p-4 text-xs font-medium text-[var(--color-foreground)]">
                    {inv.plan?.name || "Custom"}
                  </td>
                  <td className="p-4 text-xs">
                    <span className="font-black text-sm text-[var(--color-foreground)]">
                      {Number(inv.amount).toLocaleString()}
                    </span>{" "}
                    <span className="font-semibold text-[var(--color-muted)]">{inv.currency}</span>
                  </td>
                  <td className="p-4 text-xs text-[var(--color-muted)]">
                    {new Date(inv.periodStart).toLocaleDateString()} →{" "}
                    {new Date(inv.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-xs">
                    <p className="font-semibold text-[var(--color-foreground)]">{inv.provider}</p>
                    <p className="font-mono text-[11px] text-[var(--color-muted)]">
                      {inv.transactionId || "—"}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--color-foreground)]">
                Record NexaClass SaaS Payment
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

            <form onSubmit={handleRecordInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Select Academy *
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">
                    Amount (EGP) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-muted)]">
                    Period (Months) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={36}
                    value={periodMonths}
                    onChange={(e) => setPeriodMonths(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Payment Method
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                >
                  <option value="MANUAL">Manual / Bank Transfer / Cash</option>
                  <option value="VODAFONE_CASH">Vodafone Cash</option>
                  <option value="INSTAPAY">InstaPay</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="PAYMOB">Paymob</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Transaction / Receipt ID
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. TXN-99824"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)]">
                  Internal Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 3-month setup package collected"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                />
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
                  {isSubmitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
