"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  FileCheck,
  Clock,
  BarChart3,
  Key,
  MessageSquare,
  Radio,
  Wallet,
  ShoppingBag,
  User,
  Users,
  GraduationCap,
  Folder,
  Award,
  Globe,
  Settings,
} from "lucide-react";
import { useT } from "@/components/LocaleProvider";

function NavLink({
  href,
  icon: Icon,
  label,
  exact = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
        isActive
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-xs"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-foreground)]"
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-[var(--color-muted)]"}`} />
      <span>{label}</span>
    </Link>
  );
}

export function DashboardNav({
  isAdmin,
  isAssistant,
  isTeacher,
  showWebsite,
}: {
  isAdmin: boolean;
  isAssistant: boolean;
  isTeacher: boolean;
  showWebsite: boolean;
}) {
  const t = useT();
  const isStaff = isAdmin || isAssistant;

  // 1. Teacher Persona Navigation
  if (isTeacher) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <NavLink href="/dashboard" icon={LayoutDashboard} label={t("dashboardNav.overview", "لوحة التحكم")} exact />
        <NavLink href="/dashboard/courses" icon={BookOpen} label={t("dashboardNav.manageMyCourses", "دوراتي")} />
        <NavLink href="/dashboard/courses/new" icon={PlusCircle} label={t("dashboardNav.createCourse", "إضافة دورة")} exact />
        <NavLink href="/dashboard/categories" icon={Folder} label={t("dashboardNav.categories", "الأقسام")} />
        <NavLink href="/dashboard/assignments" icon={FileCheck} label={t("dashboardNav.assignments", "الواجبات والتصحيح")} />
        <NavLink href="/dashboard/quizzes" icon={Clock} label={t("dashboardNav.quizzes", "الامتحانات والنتائج")} />
        <NavLink href="/dashboard/statistics" icon={BarChart3} label={t("dashboardNav.studentStats", "الإحصائيات")} />
        <NavLink href="/dashboard/codes" icon={Key} label={t("dashboardNav.createCodes", "أكواد التفعيل")} />
        <NavLink href="/dashboard/messages" icon={MessageSquare} label={t("dashboardNav.contactMyStudents", "رسائل الطلاب")} />
        <NavLink href="/dashboard/live-streams" icon={Radio} label={t("dashboardNav.liveStreams", "البث المباشر")} />
        {showWebsite && <NavLink href="/dashboard/website" icon={Globe} label={t("dashboardNav.website", "موقعي")} />}
      </div>
    );
  }

  // 2. Student Persona Navigation
  if (!isStaff) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <NavLink href="/dashboard" icon={LayoutDashboard} label={t("dashboardNav.overview", "لوحة التحكم")} exact />
        <NavLink href="/courses" icon={BookOpen} label={t("dashboardNav.availableCourses", "الدورات التعليمية")} />
        <NavLink href="/dashboard/assignments" icon={FileCheck} label={t("dashboardNav.assignments", "واجباتي")} />
        <NavLink href="/dashboard/add-balance" icon={Wallet} label={t("dashboardNav.wallet", "المحفظة والشحن")} />
        <NavLink href="/store" icon={ShoppingBag} label={t("dashboardNav.store", "المتجر الرقمي")} />
        <NavLink href="/dashboard/messages" icon={MessageSquare} label={t("dashboardNav.inbox", "الرسائل")} />
        <NavLink href="/dashboard/profile" icon={User} label={t("dashboardNav.profile", "الملف الشخصي")} />
      </div>
    );
  }

  // 3. Academy Staff / Admin Persona Navigation
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <NavLink href="/dashboard" icon={LayoutDashboard} label={t("dashboardNav.overview", "الرئيسية")} exact />
      <NavLink href="/dashboard/courses" icon={BookOpen} label={t("dashboardNav.courses", "الدورات")} />
      <NavLink href="/dashboard/categories" icon={Folder} label={t("dashboardNav.categories", "الأقسام")} />
      <NavLink href="/dashboard/students" icon={Users} label={t("dashboardNav.students", "الطلاب والحسابات")} />
      {isAdmin && <NavLink href="/dashboard/teachers" icon={GraduationCap} label={t("dashboardNav.teachers", "المدرسون")} />}
      <NavLink href="/dashboard/assignments" icon={FileCheck} label={t("dashboardNav.assignments", "الواجبات")} />
      <NavLink href="/dashboard/quizzes" icon={Clock} label={t("dashboardNav.quizzes", "الامتحانات")} />
      <NavLink href="/dashboard/codes" icon={Key} label={t("dashboardNav.codes", "الأكواد")} />
      <NavLink href="/dashboard/store" icon={ShoppingBag} label={t("dashboardNav.store", "المتجر")} />
      <NavLink href="/dashboard/subscriptions" icon={Award} label={t("dashboardNav.subscriptions", "الاشتراكات")} />
      <NavLink href="/dashboard/messages" icon={MessageSquare} label={t("dashboardNav.messages", "الرسائل")} />
      <NavLink href="/dashboard/statistics" icon={BarChart3} label={t("dashboardNav.analytics", "الإحصائيات")} />
      {showWebsite && <NavLink href="/dashboard/website" icon={Globe} label={t("dashboardNav.website", "موقعي")} />}
      {isAdmin && <NavLink href="/dashboard/settings" icon={Settings} label={t("dashboardNav.settings", "الإعدادات")} />}
    </div>
  );
}
