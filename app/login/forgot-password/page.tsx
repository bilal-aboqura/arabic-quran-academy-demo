"use client";

import Link from "next/link";
import { useT } from "@/components/LocaleProvider";

/**
 * The former admin-mediated reset flow retained passwords in plaintext. It is
 * intentionally unavailable until the token-based reset flow is deployed.
 */
export default function ForgotPasswordPage() {
  const t = useT();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          {t("auth.forgot.title", "Password reset")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          خدمة إعادة تعيين كلمة المرور الآمنة قيد التفعيل. لا ترسل كلمة المرور الحالية أو كلمة مرور جديدة عبر النماذج أو الرسائل.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Secure self-service password reset is being activated. Do not send a current or new password through forms or messages.
        </p>
        <Link
          href="/login"
          className="mt-6 block w-full rounded-[var(--radius-btn)] bg-[var(--color-primary)] py-2.5 text-center font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          {t("auth.forgot.backToLogin", "Back to login")}
        </Link>
      </div>
    </div>
  );
}
