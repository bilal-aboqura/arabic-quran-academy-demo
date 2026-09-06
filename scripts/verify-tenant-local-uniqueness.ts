/**
 * PostgreSQL-level proof that values unique within a tenant can be duplicated
 * by another tenant. This never reads DATABASE_URL and only touches a
 * locally-named rehearsal database through the shared safety contract.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { assertDisposableRehearsalDatabaseUrl } from "./lib/disposable-postgres";

const url = assertDisposableRehearsalDatabaseUrl(
  process.env.NEXACLASS_REHEARSAL_DATABASE_URL,
  process.env.NEXACLASS_REHEARSAL_CONFIRM,
);
const prisma = new PrismaClient({ datasources: { db: { url } } });
const prefix = `tenant-uniqueness-${randomUUID().replaceAll("-", "")}`;
const id = (suffix: string) => `${prefix}-${suffix}`;
const slug = (suffix: string) => `${prefix}-${suffix}`.slice(0, 63);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tenant-local uniqueness assertion failed: ${message}`);
}

async function count(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ value: bigint }>>(sql);
  return Number(rows[0]?.value ?? 0);
}

async function main() {
  const alphaTenant = id("alpha");
  const betaTenant = id("beta");
  const alphaCategory = id("alpha-category");
  const betaCategory = id("beta-category");
  const alphaCourse = id("alpha-course");
  const betaCourse = id("beta-course");
  const alphaCode = id("alpha-code");
  const betaCode = id("beta-code");

  // The three values intentionally match between Alpha and Beta. Only their
  // tenant ownership differs; PostgreSQL must accept all six rows.
  await prisma.$executeRawUnsafe(`INSERT INTO "Tenant" ("id", "slug", "name", "status", "created_at", "updated_at") VALUES
    ('${alphaTenant}', '${slug("alpha")}', 'Alpha', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('${betaTenant}', '${slug("beta")}', 'Beta', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await prisma.$executeRawUnsafe(`INSERT INTO "Category" ("id", "tenant_id", "name", "slug", "created_at", "updated_at") VALUES
    ('${alphaCategory}', '${alphaTenant}', 'Secondary', 'secondary-${prefix}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('${betaCategory}', '${betaTenant}', 'Secondary', 'secondary-${prefix}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await prisma.$executeRawUnsafe(`INSERT INTO "Course" ("id", "tenant_id", "category_id", "title", "slug", "description", "price", "is_published", "created_at", "updated_at") VALUES
    ('${alphaCourse}', '${alphaTenant}', '${alphaCategory}', 'Alpha Physics', 'physics-${prefix}', 'Alpha physics course', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('${betaCourse}', '${betaTenant}', '${betaCategory}', 'Beta Physics', 'physics-${prefix}', 'Beta physics course', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
  await prisma.$executeRawUnsafe(`INSERT INTO "ActivationCode" ("id", "tenant_id", "course_id", "code", "created_at") VALUES
    ('${alphaCode}', '${alphaTenant}', '${alphaCourse}', 'START100-${prefix}', CURRENT_TIMESTAMP),
    ('${betaCode}', '${betaTenant}', '${betaCourse}', 'START100-${prefix}', CURRENT_TIMESTAMP)`);

  assert(await count(`SELECT COUNT(*)::bigint AS value FROM "Category" WHERE "slug" = 'secondary-${prefix}'`) === 2, "Alpha/Beta secondary coexist");
  assert(await count(`SELECT COUNT(*)::bigint AS value FROM "Course" WHERE "slug" = 'physics-${prefix}'`) === 2, "Alpha/Beta physics coexist");
  assert(await count(`SELECT COUNT(*)::bigint AS value FROM "ActivationCode" WHERE "code" = 'START100-${prefix}'`) === 2, "Alpha/Beta START100 coexist");
  console.log(JSON.stringify({ status: "passed", alpha: { physics: true, secondary: true, START100: true }, beta: { physics: true, secondary: true, START100: true } }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    // All IDs originate in this invocation. Remove children before parents so
    // the check leaves the explicitly supplied test database unchanged.
    await prisma.$executeRawUnsafe(`DELETE FROM "ActivationCode" WHERE "id" LIKE '${prefix}-%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Course" WHERE "id" LIKE '${prefix}-%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Category" WHERE "id" LIKE '${prefix}-%'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE "id" LIKE '${prefix}-%'`);
    await prisma.$disconnect();
  });
