import { prisma } from "@/lib/prisma";
import { BillingManager } from "./BillingManager";

export default async function PlatformAdminBillingPage() {
  const [invoices, tenants] = await Promise.all([
    prisma.saaSInvoice.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalCollected = invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            NexaClass SaaS Billing & Invoices
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Official SaaS license invoices, setup fees, and platform renewal billing. Strictly isolated from student course commerce.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-right">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Total SaaS Revenue
          </span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {totalCollected.toLocaleString()} EGP
          </p>
        </div>
      </div>

      <BillingManager initialInvoices={invoices.map((invoice) => ({ ...invoice, amount: Number(invoice.amount) }))} tenants={tenants} />
    </div>
  );
}
