import Link from "next/link";
import { GraduationCap, ShieldCheck, Lock, Award } from "lucide-react";
import { getServerTranslator } from "@/lib/i18n/server";

export async function Footer({
  footerTitle,
  footerTagline,
  footerCopyright,
}: {
  footerTitle?: string;
  footerTagline?: string;
  footerCopyright?: string;
}) {
  const t = await getServerTranslator();
  const defaultTitle = t("footer.defaultTitle", "المنصة التعليمية");
  const defaultTagline = t("footer.defaultTagline", "تعليم أكاديمي متقن ومنهجية واضحة تصنع التفوق");
  const defaultCopyright = t("footer.defaultCopyright", "جميع الحقوق محفوظة.");
  const year = new Date().getFullYear();
  const copyrightText = footerCopyright?.trim() || defaultCopyright;

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Mission */}
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-black tracking-tight">
                {footerTitle?.trim() || defaultTitle}
              </span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
              {footerTagline?.trim() || defaultTagline}
            </p>
          </div>

          {/* Quick Academic Navigation */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--color-muted)]">
              {t("common.navigation", "التنقل السريع")}
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-[var(--color-muted)] transition hover:text-[var(--color-primary)]"
                >
                  {t("common.home", "الرئيسية")}
                </Link>
              </li>
              <li>
                <Link
                  href="/courses"
                  className="text-[var(--color-muted)] transition hover:text-[var(--color-primary)]"
                >
                  {t("common.courses", "الدورات والمناهج")}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-[var(--color-muted)] transition hover:text-[var(--color-primary)]"
                >
                  {t("header.dashboard", "لوحة الطالب")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Trust Guarantees */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--color-muted)]">
              {t("footer.trustTitle", "معايير المنصة")}
            </p>
            <ul className="space-y-2.5 text-xs text-[var(--color-muted)]">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>محتوى تعليمي معتمد ومُراجع</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-blue-500" />
                <span>حماية مشفرة لبيانات الطلاب</span>
              </li>
              <li className="flex items-center gap-2">
                <Award className="h-4 w-4 shrink-0 text-amber-500" />
                <span>متابعة تفاعلية واختبارات دورية</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-[var(--color-border)]/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-muted)]">
          <p>
            © {year} {footerTitle?.trim() || defaultTitle}. {copyrightText}
          </p>
          <div className="flex items-center gap-4">
            <span>منظومة إدارة التعلم الأكاديمي</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
