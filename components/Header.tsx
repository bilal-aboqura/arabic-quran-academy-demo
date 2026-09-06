"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useT, useLocalizedEnumValue } from "@/components/LocaleProvider";

function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  const adminRoleLabel = useLocalizedEnumValue("ADMIN", "header.role", "Admin");
  const assistantAdminRoleLabel = useLocalizedEnumValue("ASSISTANT_ADMIN", "header.role", "Assistant admin");
  const studentRoleLabel = useLocalizedEnumValue("STUDENT", "header.role", "Student");
  const teacherRoleLabel = useLocalizedEnumValue("TEACHER", "header.role", "Teacher");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status !== "authenticated" || !session?.user) return null;

  const roleLabel: Record<UserRole, string> = {
    ADMIN: adminRoleLabel,
    ASSISTANT_ADMIN: assistantAdminRoleLabel,
    STUDENT: studentRoleLabel,
    TEACHER: teacherRoleLabel,
  };

  const initial = session.user.name?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-foreground)] shadow-xs transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-elevated)]"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-xs font-bold text-[var(--color-primary)]">
          {initial}
        </div>
        <span className="max-w-[100px] truncate sm:max-w-[130px]">{session.user.name}</span>
        <ChevronDown className={`h-4 w-4 text-[var(--color-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-dropdown)] z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-[var(--color-border)] px-3 py-2.5">
            <p className="text-xs font-semibold text-[var(--color-foreground)] truncate">{session.user.name}</p>
            <span className="inline-block mt-0.5 rounded-md bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
              {roleLabel[session.user.role]}
            </span>
          </div>

          <div className="py-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/40 hover:text-[var(--color-primary)]"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4 text-[var(--color-muted)]" />
              <span>{t("header.dashboard", "Dashboard")}</span>
            </Link>

            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/40 hover:text-[var(--color-primary)]"
              onClick={() => setOpen(false)}
            >
              <UserIcon className="h-4 w-4 text-[var(--color-muted)]" />
              <span>{t("header.editAccount", "Edit account")}</span>
            </Link>
          </div>

          <div className="border-t border-[var(--color-border)] pt-1">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-xs font-semibold text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
              onClick={async () => {
                setOpen(false);
                try {
                  await fetch("/api/auth/clear-session", { method: "POST", credentials: "include" });
                } catch {
                  /* ignore network error */
                }
                signOut({ callbackUrl: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>{t("header.logout", "Log out")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header({
  platformName,
  headerLogoUrl,
  platformSubscriptionExpiryLabel,
}: {
  platformName?: string | null;
  headerLogoUrl?: string | null;
  platformSubscriptionExpiryLabel?: string | null;
}) {
  const { data: session, status } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const t = useT();
  const trimmedName = platformName?.trim() ?? "";
  const displayName = trimmedName;
  const linkTitle = trimmedName || t("header.homePage", "Homepage");

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Identity */}
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 text-lg font-black tracking-tight text-[var(--color-foreground)] transition hover:opacity-95 sm:text-xl"
            title={linkTitle}
          >
            {headerLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headerLogoUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] object-cover p-0.5 shadow-xs"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-xs">
                <GraduationCap className="h-5 w-5" />
              </div>
            )}
            {displayName ? <span className="min-w-0 truncate">{displayName}</span> : null}
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-bold text-[var(--color-muted)] transition hover:text-[var(--color-primary)]"
            >
              {t("common.home", "Home")}
            </Link>
            <Link
              href="/courses"
              className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-muted)] transition hover:text-[var(--color-primary)]"
            >
              <BookOpen className="h-4 w-4" />
              <span>{t("common.courses", "Courses")}</span>
            </Link>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />

            {status === "loading" ? (
              <div className="h-9 w-20 animate-pulse rounded-xl bg-[var(--color-border)]/50" />
            ) : session ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-bold text-[var(--color-foreground)] shadow-xs transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-border)]/30"
                >
                  {t("header.login", "Log in")}
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--color-primary-hover)] active:scale-98"
                >
                  {t("header.register", "Create account")}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            {session ? (
              <UserMenu />
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-white shadow-xs"
              >
                {t("header.login", "Log in")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)]"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileNavOpen && (
          <div className="sm:hidden border-t border-[var(--color-border)] py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]/50">
              <span className="text-xs font-bold text-[var(--color-muted)]">اللغة / Language:</span>
              <LanguageToggle />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-bold text-[var(--color-foreground)]"
              >
                {t("common.home", "Home")}
              </Link>
              <Link
                href="/courses"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 text-xs font-bold text-[var(--color-foreground)]"
              >
                <BookOpen className="h-4 w-4" />
                <span>{t("common.courses", "Courses")}</span>
              </Link>
            </div>

            {!session && (
              <div className="pt-2">
                <Link
                  href="/register"
                  onClick={() => setMobileNavOpen(false)}
                  className="block w-full text-center rounded-xl bg-[var(--color-primary)] py-2 text-xs font-bold text-white shadow-xs"
                >
                  {t("header.register", "Create account")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subscription Active Ribbon */}
      {platformSubscriptionExpiryLabel ? (
        <div className="border-t border-teal-500/30 bg-gradient-to-r from-teal-950/90 via-slate-900 to-teal-950/90 py-2 text-center text-xs font-medium text-teal-100 sm:text-sm">
          <span className="font-bold text-teal-300">
            {t("header.platformSubscriptionActive", "You are subscribed to the platform subscription")}
          </span>
          {" — "}
          <span>
            {t("header.endsAt", "Expires at:")} <time className="font-bold text-white">{platformSubscriptionExpiryLabel}</time>
          </span>
        </div>
      ) : null}
    </header>
  );
}
