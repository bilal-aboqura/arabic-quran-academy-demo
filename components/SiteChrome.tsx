"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteChrome({ managedHome, managedPublicPage, header, footer, children }: { managedHome: boolean; managedPublicPage?: ReactNode; header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  if (managedHome && pathname === "/") return <div className="flex-1">{children}</div>;
  const publicRoute = ["/courses", "/teachers", "/store", "/login", "/register"].some(route => pathname === route || pathname.startsWith(`${route}/`));
  if (managedHome && managedPublicPage && publicRoute) return <div className="flex-1">{managedPublicPage}</div>;
  return <>{header}<main className="flex-1">{children}</main>{footer}</>;
}
