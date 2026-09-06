import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { requireDashboardTenantActor } from "@/modules/tenants/dashboard-context";
import { getTenantSettingsForAdmin } from "@/modules/settings/admin.repository";

export default async function DashboardSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const actor = await requireDashboardTenantActor("MANAGE_TENANT");
  const settings = await getTenantSettingsForAdmin(actor.tenantId);

  const sections = [
    {
      title: "الموقع التعريفي والصفحات",
      titleEn: "Website Builder & Pages",
      desc: "تخصيص الواجهة الرئيسية، وتصميم الأقسام، وبناء الصفحات التعريفية لمنصتك.",
      href: "/dashboard/website",
      icon: "🌐",
      badge: "أساسي",
    },
    {
      title: "إعدادات شحن الرصيد",
      titleEn: "Add Balance & Wallet",
      desc: "تعديل أرقام فودافون كاش، وتعليمات الدفع، وطرق شحن المحفظة للطلاب.",
      href: "/dashboard/settings/add-balance",
      icon: "💳",
      badge: null,
    },
    {
      title: "علامة حقوق الملكية والفيديو",
      titleEn: "Copyright Watermark",
      desc: "التحكم في ظهور كود الطالب العائم وحماية محتوى الفيديوهات من التسجيل.",
      href: "/dashboard/settings/copyright-overlay",
      icon: "🛡️",
      badge: null,
    },
    {
      title: "إدارة المدرسين والمدربين",
      titleEn: "Teachers & Staff",
      desc: "تفعيل قسم المدرسين، وإضافة حسابات الكادر التعليمي، وترتيبهم في الصفحة الرئيسية.",
      href: "/dashboard/teachers",
      icon: "👨‍🏫",
      badge: null,
    },
    {
      title: "المتجر والمنتجات الرقمية",
      titleEn: "Digital Store",
      desc: "إدارة المنتجات، والكتب والمذكرات الرقمية، وإعدادات المتجر العامة.",
      href: "/dashboard/store",
      icon: "🛍️",
      badge: null,
    },
    {
      title: "خطط الاشتراكات الشهرية",
      titleEn: "Subscription Plans",
      desc: "إنشاء وتعديل باقات الاشتراك للطلاب، وتحديد الأسعار وفترات التجديد.",
      href: "/dashboard/subscriptions",
      icon: "⭐",
      badge: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">إعدادات المنصة</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          التحكم الكامل في إعدادات وهوية الأكاديمية: {settings?.platformName || "منصتك التعليمية"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex flex-col justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition hover:border-[var(--color-primary)] hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-3xl">{item.icon}</span>
                {item.badge ? (
                  <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <h2 className="mt-4 text-base font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                {item.title}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">{item.desc}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[var(--color-primary)]">
              <span>فتح الإعدادات</span>
              <span className="transition group-hover:translate-x-[-4px] rtl:group-hover:translate-x-[-4px] ltr:group-hover:translate-x-[4px]">
                ←
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
