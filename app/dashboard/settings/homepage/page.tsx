import { redirect } from "next/navigation";

/** Website editing is owned by the tenant website builder (/dashboard/website). */
export default function DashboardHomepageSettingsPage() {
  redirect("/dashboard/website");
}
