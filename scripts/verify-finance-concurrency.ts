/**
 * Real PostgreSQL verification for the tenant wallet. This deliberately does
 * not default to DATABASE_URL: it can only run against an explicitly supplied
 * isolated test database. It creates a uniquely prefixed fixture and removes
 * only that fixture on completion.
 *
 * Usage (after deploying migrations to an isolated database):
 *   FINANCE_TEST_DATABASE_URL=postgresql://.../nexaclass_test npm run test:finance:integration
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const url = process.env.FINANCE_TEST_DATABASE_URL;
if (!url) {
  throw new Error("FINANCE_TEST_DATABASE_URL is required; refusing to use DATABASE_URL.");
}

const parsed = new URL(url);
const databaseName = parsed.pathname.replace(/^\//, "").toLowerCase();
const localHost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
if (!localHost && !/(?:^|[_-])(test|testing|ci|staging)(?:[_-]|$)/.test(databaseName)) {
  throw new Error("FINANCE_TEST_DATABASE_URL must point to a local or explicitly named test/staging database.");
}

// tenant-wallet imports the shared Prisma singleton. Set this before its
// dynamic import so production DATABASE_URL is never selected accidentally.
process.env.DATABASE_URL = url;

const prefix = `finance-it-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const id = (name: string) => `${prefix}-${name}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function expectOneSuccess<T>(operations: Array<Promise<T>>, label: string) {
  const results = await Promise.allSettled(operations);
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  assert(fulfilled.length === 1, `${label}: expected exactly one success, got ${fulfilled.length}: ${JSON.stringify(results.map((r) => r.status))}`);
}

async function main() {
  const wallet = await import("../modules/commerce/tenant-wallet");
  const alpha = id("alpha");
  const beta = id("beta");
  const userId = id("student");
  const alphaMembershipId = id("alpha-student");
  const betaMembershipId = id("beta-student");

  await prisma.user.create({ data: { id: userId, email: `${prefix}@example.test`, password: "test-hash", name: "Finance Test Student", role: "STUDENT", balance: 999999 } });
  await prisma.tenant.createMany({ data: [
    { id: alpha, slug: id("alpha").slice(0, 63), name: "Alpha" },
    { id: beta, slug: id("beta").slice(0, 63), name: "Beta" },
  ] });
  await prisma.tenantMembership.createMany({ data: [
    { id: alphaMembershipId, tenantId: alpha, userId, role: "STUDENT", status: "ACTIVE" },
    { id: betaMembershipId, tenantId: beta, userId, role: "STUDENT", status: "ACTIVE" },
  ] });
  await prisma.tenantStudentAccount.createMany({ data: [
    { tenantId: alpha, studentMembershipId: alphaMembershipId, balance: 500 },
    { tenantId: beta, studentMembershipId: betaMembershipId, balance: 100 },
  ] });

  const alphaCategory = await prisma.category.create({ data: { id: id("category"), tenantId: alpha, name: "Secondary", slug: id("secondary").slice(0, 63) } });
  const course = await prisma.course.create({ data: { id: id("course"), tenantId: alpha, categoryId: alphaCategory.id, title: "Course", slug: id("course-slug").slice(0, 63), description: "test", price: 500, isPublished: true } });

  // Same global user holds Alpha and Beta wallets. An Alpha purchase must not
  // consume the Beta wallet nor read legacy User.balance.
  await expectOneSuccess([
    wallet.purchaseCourseWithTenantBalance({ tenantId: alpha, userId, courseId: course.id, idempotencyKey: id("course-a") }),
    wallet.purchaseCourseWithTenantBalance({ tenantId: alpha, userId, courseId: course.id, idempotencyKey: id("course-b") }),
  ], "course concurrency");
  const courseAccount = await prisma.tenantStudentAccount.findUniqueOrThrow({ where: { studentMembershipId: alphaMembershipId } });
  const betaAccount = await prisma.tenantStudentAccount.findUniqueOrThrow({ where: { studentMembershipId: betaMembershipId } });
  assert(courseAccount.balance.equals(0), "course purchase debits Alpha exactly once to zero");
  assert(betaAccount.balance.equals(100), "Alpha purchase leaves Beta wallet at exactly 100");
  assert(await prisma.enrollment.count({ where: { tenantId: alpha, userId, courseId: course.id } }) === 1, "one enrollment exists");
  assert(await prisma.tenantBalanceTransaction.count({ where: { tenantId: alpha, kind: "COURSE_PURCHASE", referenceId: course.id } }) === 1, "one course debit ledger exists");
  assert(await prisma.payment.count({ where: { tenantId: alpha, userId, courseId: course.id } }) === 1, "one course payment exists");

  await prisma.tenantStudentAccount.update({ where: { studentMembershipId: alphaMembershipId }, data: { balance: 500 } });
  const product = await prisma.storeProduct.create({ data: { id: id("product"), tenantId: alpha, title: "Product", description: "test", price: 500, costPrice: 0, isActive: true } });
  await expectOneSuccess([
    wallet.purchaseStoreProductWithTenantBalance({ tenantId: alpha, userId, productId: product.id, idempotencyKey: id("store-a") }),
    wallet.purchaseStoreProductWithTenantBalance({ tenantId: alpha, userId, productId: product.id, idempotencyKey: id("store-b") }),
  ], "store concurrency");
  const storeAccount = await prisma.tenantStudentAccount.findUniqueOrThrow({ where: { studentMembershipId: alphaMembershipId } });
  assert(storeAccount.balance.equals(0), "store purchase debits exactly once");
  assert(await prisma.userStorePurchase.count({ where: { tenantId: alpha, userId, productId: product.id } }) === 1, "one store purchase exists");
  assert(await prisma.tenantBalanceTransaction.count({ where: { tenantId: alpha, kind: "STORE_PURCHASE", referenceId: product.id } }) === 1, "one store debit ledger exists");

  await prisma.tenantStudentAccount.update({ where: { studentMembershipId: alphaMembershipId }, data: { balance: 500 } });
  const plan = await prisma.subscriptionPlan.create({ data: { id: id("plan"), tenantId: alpha, name: "Plan", description: "test", durationKind: "month", price: 500, isActive: true } });
  await expectOneSuccess([
    wallet.purchaseTenantSubscriptionWithBalance({ tenantId: alpha, userId, planId: plan.id, idempotencyKey: id("plan-a") }),
    wallet.purchaseTenantSubscriptionWithBalance({ tenantId: alpha, userId, planId: plan.id, idempotencyKey: id("plan-b") }),
  ], "subscription concurrency");
  const subscriptionAccount = await prisma.tenantStudentAccount.findUniqueOrThrow({ where: { studentMembershipId: alphaMembershipId } });
  assert(subscriptionAccount.balance.equals(0), "subscription purchase debits exactly once");
  assert(await prisma.userPlatformSubscription.count({ where: { tenantId: alpha, userId, planId: plan.id } }) === 1, "one subscription exists");
  assert(await prisma.tenantBalanceTransaction.count({ where: { tenantId: alpha, kind: "SUBSCRIPTION_PURCHASE", referenceId: plan.id } }) === 1, "one subscription debit ledger exists");

  // Force the final Payment write to fail after debit/enrollment would have
  // occurred. PostgreSQL must roll back the whole serializable transaction.
  await prisma.tenantStudentAccount.update({ where: { studentMembershipId: alphaMembershipId }, data: { balance: 500 } });
  const failingCourse = await prisma.course.create({ data: { id: id("failing-course"), tenantId: alpha, title: "Failure course", slug: id("failure-slug").slice(0, 63), description: "test", price: 500, isPublished: true } });
  const triggerName = `finance_payment_fail_${prefix.replaceAll("-", "_")}`;
  const functionName = `${triggerName}_fn`;
  await prisma.$executeRawUnsafe(`CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.course_id = '${failingCourse.id}' THEN RAISE EXCEPTION 'forced finance integration failure'; END IF; RETURN NEW; END; $$;`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "Payment" FOR EACH ROW EXECUTE FUNCTION "${functionName}"();`);
  let failed = false;
  try {
    await wallet.purchaseCourseWithTenantBalance({ tenantId: alpha, userId, courseId: failingCourse.id, idempotencyKey: id("forced-failure") });
  } catch {
    failed = true;
  } finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "Payment";`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"();`);
  }
  assert(failed, "forced post-debit payment failure rejects the purchase");
  const rolledBackAccount = await prisma.tenantStudentAccount.findUniqueOrThrow({ where: { studentMembershipId: alphaMembershipId } });
  assert(rolledBackAccount.balance.equals(500), "failure rolls wallet back to pre-purchase balance");
  assert(await prisma.enrollment.count({ where: { tenantId: alpha, userId, courseId: failingCourse.id } }) === 0, "failure leaves no enrollment");
  assert(await prisma.tenantBalanceTransaction.count({ where: { tenantId: alpha, referenceId: failingCourse.id } }) === 0, "failure leaves no debit ledger");
  assert(await prisma.payment.count({ where: { tenantId: alpha, courseId: failingCourse.id } }) === 0, "failure leaves no payment");

  console.log(JSON.stringify({
    status: "passed",
    alphaBalanceAfterCourse: "0.00",
    betaBalanceAfterAlphaCourse: "100.00",
    courseEnrollments: 1,
    courseDebitLedgers: 1,
    storePurchases: 1,
    subscriptionPurchases: 1,
    rollbackBalance: "500.00",
  }));
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => {
    // Tenant relations on a few legacy bridge models use SET NULL. Delete the
    // fixture-owned parents first so this verification never leaves orphaned
    // test courses/categories/products/plans behind. All ids are generated by
    // this invocation and the database was explicitly safety-gated above.
    await prisma.course.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.storeProduct.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.subscriptionPlan.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.category.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.tenant.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });
