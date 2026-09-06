"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/platform-admin", label: "Overview", icon: "📊", exact: true },
  { href: "/platform-admin/tenants", label: "Tenants / Academies", icon: "🏢" },
  { href: "/platform-admin/templates", label: "Website Templates", icon: "🖼️" },
  { href: "/platform-admin/plans", label: "SaaS Plans", icon: "📦" },
  { href: "/platform-admin/subscriptions", label: "SaaS Subscriptions", icon: "💳" },
  { href: "/platform-admin/admins", label: "Platform Admins", icon: "👥" },
  { href: "/platform-admin/features", label: "Feature Flags", icon: "🚩" },
  { href: "/platform-admin/usage", label: "Platform Usage", icon: "📈" },
  { href: "/platform-admin/billing", label: "SaaS Billing", icon: "💰" },
  { href: "/platform-admin/audit-logs", label: "Audit Logs", icon: "📜" },
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <div className="border-t border-[var(--color-border)]/50 bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 rtl:space-x-reverse">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/30"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-border)]/50 hover:text-[var(--color-foreground)]"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
