import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore } from "next/cache";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { listPublicTeachersForTenant } from "@/modules/tenants/public-teachers.repository";
import { TeachersBrowseClient } from "./TeachersBrowseClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "اختر المدرسين | منصتي التعليمية",
  description: "تصفح مدرسي المنصة والدورات المتاحة لكل مدرس",
};

export default async function TeachersPage() {
  unstable_noStore();
  const requestHeaders = await headers();
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) notFound();
  const teachers = await listPublicTeachersForTenant(tenant.tenantId).catch(() => []);

  return <TeachersBrowseClient initialTeachers={teachers} />;
}
