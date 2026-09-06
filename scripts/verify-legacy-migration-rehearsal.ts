/**
 * A destructive, local-only proof of the legacy -> NexaClass migration path.
 *
 * This intentionally starts with the *legacy baseline* rather than an empty
 * current schema. It creates representative historical records, applies the
 * remaining Prisma migrations, runs the guarded backfill twice, and verifies
 * both preservation and tenant-local duplicate slugs/codes.
 *
 * It never reads DATABASE_URL. See prisma/MIGRATION_DEPLOYMENT.md for usage.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { assertDisposableRehearsalDatabaseUrl } from "./lib/disposable-postgres";

const root = process.cwd();
const migrationName = "20260901190000_legacy_baseline";
const baselineFile = join(root, "prisma", "migrations", migrationName, "migration.sql");
const url = assertDisposableRehearsalDatabaseUrl(
  process.env.NEXACLASS_REHEARSAL_DATABASE_URL,
  process.env.NEXACLASS_REHEARSAL_CONFIRM,
);
const prisma = new PrismaClient({ datasources: { db: { url } } });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Migration rehearsal assertion failed: ${message}`);
}

type EnvironmentOverrides = Record<string, string | undefined>;

function run(command: string, args: string[], extraEnv: EnvironmentOverrides = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error([
      `${command} ${args.join(" ")} failed with status ${result.status}.`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }
}

function prismaCli(args: string[], extraEnv: EnvironmentOverrides = {}) {
  const cli = join(root, "node_modules", "prisma", "build", "index.js");
  if (!existsSync(cli)) throw new Error("Prisma CLI is not installed. Run npm install first.");
  run(process.execPath, [cli, ...args], extraEnv);
}

function tsxScript(script: string, extraEnv: EnvironmentOverrides) {
  const cli = join(root, "node_modules", "tsx", "dist", "cli.mjs");
  if (!existsSync(cli)) throw new Error("tsx is not installed. Run npm install first.");
  run(process.execPath, [cli, script], extraEnv);
}

async function execute(statement: string) {
  await prisma.$executeRawUnsafe(statement);
}

async function scalar(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ value: bigint | number | string }>>(sql);
  assert(rows.length === 1, `expected one row from ${sql}`);
  return Number(rows[0].value);
}

async function seedRepresentativeLegacyState() {
  // Every statement targets tables from the baseline migration only. Do not
  // insert tenant IDs here: the backfill must be the code that assigns them.
  await execute(`INSERT INTO "User" ("id", "email", "password_hash", "name", "role", "balance", "created_at", "updated_at") VALUES
    ('legacy-owner', 'owner@legacy.test', '$2b$12$legacy-owner-password-hash', 'Legacy Owner', 'ADMIN', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('legacy-student', 'student@legacy.test', '$2b$12$legacy-student-password-hash', 'Legacy Student', 'STUDENT', 125.50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "HomepageSetting" ("id", "platform_name", "platform_name_en", "primary_color", "updated_at") VALUES
    ('default', 'Legacy Academy', 'Legacy Academy', '#123456', CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Category" ("id", "name", "slug", "created_at", "updated_at") VALUES
    ('legacy-category', 'Secondary', 'secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Course" ("id", "title", "slug", "description", "price", "category_id", "created_by_id", "is_published", "created_at", "updated_at") VALUES
    ('legacy-course', 'Legacy Physics', 'physics', 'A retained legacy course', 125.50, 'legacy-category', 'legacy-owner', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Lesson" ("id", "title", "slug", "course_id", "order", "created_at", "updated_at") VALUES
    ('legacy-lesson', 'Legacy Lesson', 'lesson-one', 'legacy-course', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Quiz" ("id", "title", "course_id", "created_at", "updated_at") VALUES
    ('legacy-quiz', 'Legacy Quiz', 'legacy-course', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Question" ("id", "type", "question_text", "quiz_id", "created_at", "updated_at") VALUES
    ('legacy-question', 'MULTIPLE_CHOICE', 'What is 2 + 2?', 'legacy-quiz', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "QuestionOption" ("id", "text", "is_correct", "question_id", "created_at", "updated_at") VALUES
    ('legacy-option', '4', true, 'legacy-question', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Enrollment" ("id", "user_id", "course_id", "enrolled_at") VALUES
    ('legacy-enrollment', 'legacy-student', 'legacy-course', CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "ActivationCode" ("id", "course_id", "code", "created_at") VALUES
    ('legacy-code', 'legacy-course', 'START100', CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "QuizAttempt" ("id", "user_id", "quiz_id", "score", "total_questions", "created_at", "updated_at") VALUES
    ('legacy-attempt', 'legacy-student', 'legacy-quiz', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Payment" ("id", "user_id", "course_id", "amount", "created_at") VALUES
    ('legacy-payment', 'legacy-student', 'legacy-course', 125.50, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "HomeworkSubmission" ("id", "course_id", "user_id", "lesson_id", "submission_type", "link_url", "created_at") VALUES
    ('legacy-homework', 'legacy-course', 'legacy-student', 'legacy-lesson', 'LINK', 'https://example.test/homework', CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Conversation" ("id", "staff_user_id", "student_user_id", "created_at", "updated_at") VALUES
    ('legacy-conversation', 'legacy-owner', 'legacy-student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Message" ("id", "conversation_id", "sender_id", "message_type", "content", "created_at") VALUES
    ('legacy-message', 'legacy-conversation', 'legacy-student', 'TEXT', 'Legacy message', CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "StoreProduct" ("id", "title", "description", "price", "cost_price", "is_active", "created_at", "updated_at") VALUES
    ('legacy-product', 'Legacy Workbook', 'Retained store item', 30, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "UserStorePurchase" ("id", "user_id", "product_id", "price_paid", "created_at") VALUES
    ('legacy-store-purchase', 'legacy-student', 'legacy-product', 30, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "SubscriptionPlan" ("id", "name", "description", "duration_kind", "price", "is_active", "created_at", "updated_at") VALUES
    ('legacy-plan', 'Legacy Monthly', 'Retained subscription', 'month', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "UserPlatformSubscription" ("id", "user_id", "plan_id", "price_paid", "expires_at", "created_at") VALUES
    ('legacy-subscription', 'legacy-student', 'legacy-plan', 50, CURRENT_TIMESTAMP + INTERVAL '30 days', CURRENT_TIMESTAMP)`);
}

async function verifyPreservationAndBackfill() {
  const legacyTenant = await prisma.tenant.findUnique({
    where: { slug: "legacy-platform" },
    select: { id: true },
  });
  assert(legacyTenant, "legacy tenant created");
  const legacyTenantId = legacyTenant.id;
  const checks: Array<[string, string]> = [
    ["users and password hashes", `SELECT COUNT(*)::bigint AS value FROM "User" WHERE ("id" = 'legacy-owner' AND "password_hash" = '$2b$12$legacy-owner-password-hash' AND "role" = 'ADMIN') OR ("id" = 'legacy-student' AND "password_hash" = '$2b$12$legacy-student-password-hash' AND "role" = 'STUDENT' AND "balance" = 125.50)`],
    ["owner and student memberships", `SELECT COUNT(*)::bigint AS value FROM "TenantMembership" WHERE "tenant_id" = '${legacyTenantId}' AND (("user_id" = 'legacy-owner' AND "role" = 'OWNER') OR ("user_id" = 'legacy-student' AND "role" = 'STUDENT'))`],
    ["legacy tenant settings", `SELECT COUNT(*)::bigint AS value FROM "TenantSettings" WHERE "tenant_id" = '${legacyTenantId}' AND "platform_name" = 'Legacy Academy'`],
    ["course/category", `SELECT COUNT(*)::bigint AS value FROM "Course" WHERE "id" = 'legacy-course' AND "tenant_id" = '${legacyTenantId}'`],
    ["lesson", `SELECT COUNT(*)::bigint AS value FROM "Lesson" WHERE "id" = 'legacy-lesson'`],
    ["quiz", `SELECT COUNT(*)::bigint AS value FROM "Quiz" WHERE "id" = 'legacy-quiz'`],
    ["enrollment", `SELECT COUNT(*)::bigint AS value FROM "Enrollment" WHERE "id" = 'legacy-enrollment' AND "tenant_id" = '${legacyTenantId}' AND "student_membership_id" IS NOT NULL`],
    ["activation code", `SELECT COUNT(*)::bigint AS value FROM "ActivationCode" WHERE "id" = 'legacy-code' AND "tenant_id" = '${legacyTenantId}'`],
    ["quiz attempt", `SELECT COUNT(*)::bigint AS value FROM "QuizAttempt" WHERE "id" = 'legacy-attempt' AND "tenant_id" = '${legacyTenantId}'`],
    ["payment", `SELECT COUNT(*)::bigint AS value FROM "Payment" WHERE "id" = 'legacy-payment' AND "tenant_id" = '${legacyTenantId}'`],
    ["homework", `SELECT COUNT(*)::bigint AS value FROM "HomeworkSubmission" WHERE "id" = 'legacy-homework' AND "tenant_id" = '${legacyTenantId}'`],
    ["messages", `SELECT COUNT(*)::bigint AS value FROM "Message" WHERE "id" = 'legacy-message' AND "tenant_id" = '${legacyTenantId}'`],
    ["store", `SELECT COUNT(*)::bigint AS value FROM "UserStorePurchase" WHERE "id" = 'legacy-store-purchase' AND "tenant_id" = '${legacyTenantId}'`],
    ["subscriptions", `SELECT COUNT(*)::bigint AS value FROM "UserPlatformSubscription" WHERE "id" = 'legacy-subscription' AND "tenant_id" = '${legacyTenantId}'`],
    ["legacy wallet opening balance", `SELECT COUNT(*)::bigint AS value FROM "TenantBalanceTransaction" WHERE "tenant_id" = '${legacyTenantId}' AND "student_membership_id" = (SELECT "id" FROM "TenantMembership" WHERE "tenant_id" = '${legacyTenantId}' AND "user_id" = 'legacy-student') AND "kind" = 'LEGACY_OPENING_BALANCE' AND "amount" = 125.50`],
  ];
  for (const [label, query] of checks) assert(await scalar(query) === (label === "users and password hashes" || label === "owner and student memberships" ? 2 : 1), `preserved ${label}`);
}

async function verifyTenantLocalUniqueness() {
  await execute(`INSERT INTO "Tenant" ("id", "slug", "name", "status", "created_at", "updated_at") VALUES
    ('rehearsal-alpha', 'rehearsal-alpha', 'Alpha', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rehearsal-beta', 'rehearsal-beta', 'Beta', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Category" ("id", "tenant_id", "name", "slug", "created_at", "updated_at") VALUES
    ('rehearsal-alpha-category', 'rehearsal-alpha', 'Secondary', 'secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rehearsal-beta-category', 'rehearsal-beta', 'Secondary', 'secondary', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "Course" ("id", "tenant_id", "category_id", "title", "slug", "description", "price", "is_published", "created_at", "updated_at") VALUES
    ('rehearsal-alpha-course', 'rehearsal-alpha', 'rehearsal-alpha-category', 'Alpha Physics', 'physics', 'Alpha course', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rehearsal-beta-course', 'rehearsal-beta', 'rehearsal-beta-category', 'Beta Physics', 'physics', 'Beta course', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await execute(`INSERT INTO "ActivationCode" ("id", "tenant_id", "course_id", "code", "created_at") VALUES
    ('rehearsal-alpha-code', 'rehearsal-alpha', 'rehearsal-alpha-course', 'START100', CURRENT_TIMESTAMP),
    ('rehearsal-beta-code', 'rehearsal-beta', 'rehearsal-beta-course', 'START100', CURRENT_TIMESTAMP)`);
  assert(await scalar(`SELECT COUNT(*)::bigint AS value FROM "Course" WHERE "slug" = 'physics' AND "tenant_id" IN ('rehearsal-alpha', 'rehearsal-beta')`) === 2, "Alpha and Beta physics coexist");
  assert(await scalar(`SELECT COUNT(*)::bigint AS value FROM "Category" WHERE "slug" = 'secondary' AND "tenant_id" IN ('rehearsal-alpha', 'rehearsal-beta')`) === 2, "Alpha and Beta secondary coexist");
  assert(await scalar(`SELECT COUNT(*)::bigint AS value FROM "ActivationCode" WHERE "code" = 'START100' AND "tenant_id" IN ('rehearsal-alpha', 'rehearsal-beta')`) === 2, "Alpha and Beta START100 coexist");
}

async function main() {
  // The explicit URL/name/confirmation gate was checked before this point.
  await execute('DROP SCHEMA public CASCADE');
  await execute('CREATE SCHEMA public');
  prismaCli(["db", "execute", "--url", url, "--file", baselineFile]);
  await seedRepresentativeLegacyState();
  prismaCli(["migrate", "resolve", "--applied", migrationName, "--schema", "prisma/schema.prisma"], { DATABASE_URL: url });
  prismaCli(["migrate", "deploy", "--schema", "prisma/schema.prisma"], { DATABASE_URL: url });

  const backfillEnvironment = {
    DATABASE_URL: url,
    RUN_LEGACY_TENANT_BACKFILL: "true",
    NEXACLASS_LEGACY_TENANT_SLUG: "legacy-platform",
    NEXACLASS_LEGACY_TENANT_NAME: "Legacy Academy",
    NEXACLASS_LEGACY_TENANT_OWNER_EMAIL: "owner@legacy.test",
    NEXACLASS_LEGACY_HOSTNAME: "legacy.localhost",
  };
  tsxScript("scripts/backfill-legacy-tenant.ts", backfillEnvironment);
  tsxScript("scripts/backfill-legacy-tenant.ts", backfillEnvironment);
  tsxScript("scripts/finalize-tenant-constraints.ts", {
    TENANT_CONSTRAINTS_DATABASE_URL: url,
  });

  await verifyPreservationAndBackfill();
  await verifyTenantLocalUniqueness();
  console.log(JSON.stringify({ status: "passed", database: "local disposable rehearsal", backfillRuns: 2, tenantLocalUniqueness: true }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
