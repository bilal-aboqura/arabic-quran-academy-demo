import Link from "next/link";
import { headers } from "next/headers";
import { unstable_noStore } from "next/cache";
import { notFound } from "next/navigation";
import { getTenantActor } from "@/modules/tenants/actor";
import { resolveTenantFromHostname } from "@/modules/tenants/repository";
import { findPublishedCourseMarketingBySlugForTenant } from "@/modules/courses/repository";
import { getAccessibleQuizForTenant } from "@/modules/quizzes/repository";
import { QuizPageClient } from "./QuizPageClient";

type Props = { params: Promise<{ slug: string; quizId: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;
function decoded(value: string) { try { return decodeURIComponent(value); } catch { return value; } }

/** Server gate for the secure quiz UI. The client obtains its question DTO
 * from the tenant-bound API; this page never serializes answer keys. */
export default async function QuizPage({ params }: Props) {
  unstable_noStore();
  const [{ slug, quizId }, requestHeaders] = await Promise.all([params, headers()]);
  const tenant = await resolveTenantFromHostname(requestHeaders.get("host"));
  if (!tenant) notFound();
  const actor = await getTenantActor(tenant);
  if (!actor) notFound();
  const course = await findPublishedCourseMarketingBySlugForTenant(tenant.tenantId, decoded(slug));
  if (!course) notFound();
  const quiz = await getAccessibleQuizForTenant({ tenantId: tenant.tenantId, quizId, actor });
  if (!quiz || quiz.courseId !== course.id) notFound();

  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <Link href={`/courses/${encodeURIComponent(course.slug)}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">← Back to {course.titleAr || course.title}</Link>
    <QuizPageClient quizId={quiz.id} />
  </main>;
}
