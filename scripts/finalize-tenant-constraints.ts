/**
 * Validates the migration's tenant checks and turns them into physical NOT
 * NULL columns. It refuses DATABASE_URL so finalization is always an explicit,
 * reviewed operation. A remote production target additionally requires an
 * acknowledgement variable; it is never selected accidentally.
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.TENANT_CONSTRAINTS_DATABASE_URL;
if (!url) throw new Error("TENANT_CONSTRAINTS_DATABASE_URL is required; refusing to use DATABASE_URL.");

const parsed = new URL(url);
const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase();
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
const explicitProductionFinalize = process.env.TENANT_CONSTRAINTS_ALLOW_PRODUCTION_FINALIZE === "true";
if (!isLocal && !/(?:^|[_-])(test|testing|ci|staging)(?:[_-]|$)/.test(databaseName) && !explicitProductionFinalize) {
  throw new Error("Remote production finalization requires TENANT_CONSTRAINTS_ALLOW_PRODUCTION_FINALIZE=true.");
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const columns = [
  ["Category", "tenant_id"], ["Course", "tenant_id"],
  ["Enrollment", "tenant_id"], ["Enrollment", "student_membership_id"],
  ["ActivationCode", "tenant_id"],
  ["QuizAttempt", "tenant_id"], ["QuizAttempt", "student_membership_id"],
  ["Payment", "tenant_id"], ["LiveStream", "tenant_id"], ["Review", "tenant_id"],
  ["HomeworkSubmission", "tenant_id"], ["Conversation", "tenant_id"],
  ["Message", "tenant_id"], ["StoreProduct", "tenant_id"],
  ["UserStorePurchase", "tenant_id"], ["SubscriptionPlan", "tenant_id"],
  ["UserPlatformSubscription", "tenant_id"], ["LessonRating", "tenant_id"],
  ["LessonPlaybackAttempt", "tenant_id"],
] as const;

const expectedTenant = [
  ["Course", "category_id", "Category"],
  ["Enrollment", "course_id", "Course"], ["ActivationCode", "course_id", "Course"],
  ["Payment", "course_id", "Course"], ["LiveStream", "course_id", "Course"],
  ["HomeworkSubmission", "course_id", "Course"], ["LessonRating", "course_id", "Course"],
  ["UserStorePurchase", "product_id", "StoreProduct"], ["UserPlatformSubscription", "plan_id", "SubscriptionPlan"],
] as const;

async function scalar(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const violations: string[] = [];
  for (const [table, column] of columns) {
    const count = await scalar(`SELECT COUNT(*)::bigint AS count FROM "${table}" WHERE "${column}" IS NULL`);
    if (count) violations.push(`${table}.${column}: ${count} NULL row(s)`);
  }
  for (const [child, foreignKey, parent] of expectedTenant) {
    const count = await scalar(`SELECT COUNT(*)::bigint AS count FROM "${child}" child JOIN "${parent}" parent ON parent.id = child."${foreignKey}" WHERE child."${foreignKey}" IS NOT NULL AND child.tenant_id <> parent.tenant_id`);
    if (count) violations.push(`${child}.${foreignKey}: ${count} cross-tenant row(s)`);
  }
  const inheritedTenantChecks: Array<[string, string]> = [
    ["QuizAttempt", 'JOIN "Quiz" quiz ON quiz.id = attempt.quiz_id JOIN "Course" course ON course.id = quiz.course_id WHERE attempt.tenant_id <> course.tenant_id'],
    ["Message", 'JOIN "Conversation" conversation ON conversation.id = message.conversation_id WHERE message.tenant_id <> conversation.tenant_id'],
    ["LessonPlaybackAttempt", 'JOIN "Lesson" lesson ON lesson.id = attempt.lesson_id JOIN "Course" course ON course.id = lesson.course_id WHERE attempt.tenant_id <> course.tenant_id'],
    ["HomeworkSubmission", 'JOIN "Lesson" lesson ON lesson.id = submission.lesson_id JOIN "Course" course ON course.id = lesson.course_id WHERE submission.lesson_id IS NOT NULL AND submission.course_id <> lesson.course_id'],
    ["LessonRating", 'JOIN "Lesson" lesson ON lesson.id = rating.lesson_id WHERE rating.course_id <> lesson.course_id'],
  ];
  const aliases: Record<string, string> = {
    QuizAttempt: "attempt", Message: "message", LessonPlaybackAttempt: "attempt", HomeworkSubmission: "submission", LessonRating: "rating",
  };
  for (const [table, joinAndWhere] of inheritedTenantChecks) {
    const count = await scalar(`SELECT COUNT(*)::bigint AS count FROM "${table}" ${aliases[table]} ${joinAndWhere}`);
    if (count) violations.push(`${table}: ${count} inherited-parent tenant mismatch(es)`);
  }
  const membershipMismatches = await scalar(
    'SELECT COUNT(*)::bigint AS count FROM "Enrollment" enrollment JOIN "TenantMembership" membership ON membership.id = enrollment.student_membership_id WHERE enrollment.tenant_id <> membership.tenant_id',
  ) + await scalar(
    'SELECT COUNT(*)::bigint AS count FROM "QuizAttempt" attempt JOIN "TenantMembership" membership ON membership.id = attempt.student_membership_id WHERE attempt.tenant_id <> membership.tenant_id',
  );
  if (membershipMismatches) violations.push(`membership tenant mismatch: ${membershipMismatches} row(s)`);
  if (violations.length) throw new Error(`Tenant constraint finalization refused:\n- ${violations.join("\n- ")}`);

  await prisma.$transaction(async (tx) => {
    for (const [table, column] of columns) {
      const constraint = `${table}_${column}_required`;
      await tx.$executeRawUnsafe(`ALTER TABLE "${table}" VALIDATE CONSTRAINT "${constraint}"`);
      await tx.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL`);
      await tx.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT "${constraint}"`);
    }
  });
  console.log(JSON.stringify({ status: "passed", constraints: columns.length }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
