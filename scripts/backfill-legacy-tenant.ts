import "dotenv/config";
import { Prisma, type TenantRole } from "@prisma/client";
import { prisma } from "../lib/prisma";

const RUN_GUARD = "RUN_LEGACY_TENANT_BACKFILL";
const enabled = process.env[RUN_GUARD] === "true";

function normalizedSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    throw new Error("NEXACLASS_LEGACY_TENANT_SLUG must be a valid DNS-style slug.");
  }
  return slug;
}

function normalizedHostname(value: string): string {
  const hostname = value.trim().toLowerCase().replace(/\.$/, "");
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/.test(hostname)) {
    throw new Error("NEXACLASS_LEGACY_HOSTNAME must be a hostname without protocol, path, or port.");
  }
  return hostname;
}

function membershipRole(legacyRole: string, isOwner: boolean): TenantRole {
  if (legacyRole === "ADMIN") return isOwner ? "OWNER" : "ADMIN";
  if (legacyRole === "ASSISTANT_ADMIN") return "ASSISTANT";
  if (legacyRole === "TEACHER") return "TEACHER";
  return "STUDENT";
}

async function main() {
  if (!enabled) {
    throw new Error(
      `${RUN_GUARD}=true is required. This command writes a legacy tenant and memberships; run it only after a tested backup/staging restore.`,
    );
  }

  const slug = normalizedSlug(process.env.NEXACLASS_LEGACY_TENANT_SLUG || "legacy-platform");
  const tenantName = process.env.NEXACLASS_LEGACY_TENANT_NAME?.trim() || "Legacy Platform";
  const configuredOwnerEmail = process.env.NEXACLASS_LEGACY_TENANT_OWNER_EMAIL?.trim().toLowerCase() || null;
  const configuredHostname = process.env.NEXACLASS_LEGACY_HOSTNAME?.trim() || null;

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  if (users.length === 0) throw new Error("No legacy users were found; create a tenant through onboarding instead.");

  const admins = users.filter((user) => user.role === "ADMIN");
  const owner = configuredOwnerEmail
    ? admins.find((user) => user.email.toLowerCase() === configuredOwnerEmail)
    : admins[0];
  if (!owner) {
    throw new Error("A legacy ADMIN is required. Set NEXACLASS_LEGACY_TENANT_OWNER_EMAIL to a legacy ADMIN email.");
  }

  const legacyHomepage = await prisma.homepageSetting.findUnique({ where: { id: "default" } });
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug },
      update: { name: tenantName, status: "ACTIVE" },
      create: { slug, name: tenantName, status: "ACTIVE" },
    });

    for (const user of users) {
      await tx.tenantMembership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
        update: {
          role: membershipRole(user.role, user.id === owner.id),
          status: "ACTIVE",
          displayName: user.name,
          studentNumber: user.studentNumber,
          guardianNumber: user.guardianNumber,
          teacherSubject: user.teacherSubject,
          teacherAvatarUrl: user.teacherAvatarUrl,
          copyrightCode: user.copyrightCode,
        },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          role: membershipRole(user.role, user.id === owner.id),
          status: "ACTIVE",
          displayName: user.name,
          studentNumber: user.studentNumber,
          guardianNumber: user.guardianNumber,
          teacherSubject: user.teacherSubject,
          teacherAvatarUrl: user.teacherAvatarUrl,
          copyrightCode: user.copyrightCode,
        },
      });
    }

    await tx.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        platformName: legacyHomepage?.platformName ?? tenantName,
        platformNameEn: legacyHomepage?.platformNameEn ?? null,
        primaryColor: legacyHomepage?.primaryColor ?? null,
        socialLinks: legacyHomepage
          ? {
              youtube: legacyHomepage.youtubeUrl,
              linkedin: legacyHomepage.linkedinUrl,
              whatsapp: legacyHomepage.whatsappUrl,
              facebook: legacyHomepage.facebookUrl,
              telegram: legacyHomepage.telegramUrl,
            }
          : Prisma.JsonNull,
      },
    });

    if (configuredHostname) {
      const hostname = normalizedHostname(configuredHostname);
      const existingDomain = await tx.tenantDomain.findUnique({
        where: { hostname },
        select: { tenantId: true },
      });
      if (existingDomain && existingDomain.tenantId !== tenant.id) {
        throw new Error(`Refusing to reassign hostname ${hostname} from another tenant.`);
      }
      await tx.tenantDomain.upsert({
        where: { hostname },
        update: { tenantId: tenant.id, kind: "CUSTOM", status: "ACTIVE", isPrimary: true, verifiedAt: new Date() },
        create: { tenantId: tenant.id, hostname, kind: "CUSTOM", status: "ACTIVE", isPrimary: true, verifiedAt: new Date() },
      });
    }

    // Every update is limited to rows that are still legacy/unassigned. This
    // makes reruns safe and prevents this one-time bridge from overwriting data
    // already created under a different tenant.
    await tx.$executeRaw`
      UPDATE "Category" SET "tenant_id" = ${tenant.id}
      WHERE "tenant_id" IS NULL
    `;
    await tx.$executeRaw`
      UPDATE "Course" SET "tenant_id" = ${tenant.id}
      WHERE "tenant_id" IS NULL
    `;
    await tx.$executeRaw`
      UPDATE "Enrollment" AS enrollment
      SET "tenant_id" = ${tenant.id},
          "student_membership_id" = membership.id
      FROM "TenantMembership" AS membership
      WHERE membership."tenant_id" = ${tenant.id}
        AND membership."user_id" = enrollment."user_id"
        AND (enrollment."tenant_id" IS NULL OR enrollment."student_membership_id" IS NULL)
        AND (enrollment."tenant_id" IS NULL OR enrollment."tenant_id" = ${tenant.id})
    `;
    await tx.$executeRaw`
      UPDATE "ActivationCode" SET "tenant_id" = ${tenant.id}
      WHERE "tenant_id" IS NULL
    `;
    await tx.$executeRaw`
      UPDATE "QuizAttempt" AS attempt
      SET "tenant_id" = course."tenant_id",
          "student_membership_id" = membership."id"
      FROM "Quiz" AS quiz
      JOIN "Course" AS course ON course."id" = quiz."course_id"
      JOIN "TenantMembership" AS membership ON membership."tenant_id" = course."tenant_id"
      WHERE quiz."id" = attempt."quiz_id"
        AND membership."user_id" = attempt."user_id"
        AND (attempt."tenant_id" IS NULL OR attempt."student_membership_id" IS NULL)
        AND course."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "Payment" AS payment
      SET "tenant_id" = course."tenant_id"
      FROM "Course" AS course
      WHERE course."id" = payment."course_id"
        AND payment."tenant_id" IS NULL
        AND course."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "LiveStream" AS stream
      SET "tenant_id" = course."tenant_id"
      FROM "Course" AS course
      WHERE course."id" = stream."course_id"
        AND stream."tenant_id" IS NULL
        AND course."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "HomeworkSubmission" AS submission
      SET "tenant_id" = course."tenant_id"
      FROM "Course" AS course
      WHERE course."id" = submission."course_id"
        AND submission."tenant_id" IS NULL
        AND course."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "Conversation" SET "tenant_id" = ${tenant.id}
      WHERE "tenant_id" IS NULL
    `;
    await tx.$executeRaw`
      UPDATE "Message" AS message
      SET "tenant_id" = conversation."tenant_id"
      FROM "Conversation" AS conversation
      WHERE conversation."id" = message."conversation_id"
        AND message."tenant_id" IS NULL
        AND conversation."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "StoreProduct" SET "tenant_id" = ${tenant.id}
      WHERE "tenant_id" IS NULL
    `;
    await tx.$executeRaw`
      UPDATE "UserStorePurchase" AS purchase
      SET "tenant_id" = product."tenant_id"
      FROM "StoreProduct" AS product
      WHERE product."id" = purchase."product_id"
        AND purchase."tenant_id" IS NULL
        AND product."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "SubscriptionPlan" SET "tenant_id" = ${tenant.id}
      WHERE "tenant_id" IS NULL
    `;
    await tx.$executeRaw`
      UPDATE "UserPlatformSubscription" AS subscription
      SET "tenant_id" = ${tenant.id}
      FROM "SubscriptionPlan" AS plan
      WHERE plan."id" = subscription."plan_id"
        AND subscription."tenant_id" IS NULL
        AND plan."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "UserPlatformSubscription"
      SET "tenant_id" = ${tenant.id}
      WHERE "tenant_id" IS NULL AND "plan_id" IS NULL
    `;
    await tx.$executeRaw`
      UPDATE "LessonRating" AS rating
      SET "tenant_id" = course."tenant_id"
      FROM "Course" AS course
      WHERE course."id" = rating."course_id"
        AND rating."tenant_id" IS NULL
        AND course."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "LessonPlaybackAttempt" AS attempt
      SET "tenant_id" = course."tenant_id"
      FROM "Lesson" AS lesson
      JOIN "Course" AS course ON course."id" = lesson."course_id"
      WHERE lesson."id" = attempt."lesson_id"
        AND attempt."tenant_id" IS NULL
        AND course."tenant_id" = ${tenant.id}
    `;
    await tx.$executeRaw`
      UPDATE "Review" SET "tenant_id" = ${tenant.id}
      WHERE "tenant_id" IS NULL
    `;

    // User.balance was global in the legacy application. It represents only
    // the automatically-created legacy tenant, never a credit that may be
    // copied into future memberships. The account/ledger insert is guarded by
    // an immutable opening-balance row, so a rerun cannot credit twice.
    const legacyStudents = await tx.tenantMembership.findMany({
      where: { tenantId: tenant.id, role: "STUDENT", status: "ACTIVE" },
      select: { id: true, userId: true },
    });
    for (const membership of legacyStudents) {
      const legacyUser = users.find((user) => user.id === membership.userId);
      const account = await tx.tenantStudentAccount.upsert({
        where: { studentMembershipId: membership.id },
        update: {},
        create: { tenantId: tenant.id, studentMembershipId: membership.id, balance: legacyUser?.balance ?? 0 },
        select: { id: true },
      });
      const alreadyMigrated = await tx.tenantBalanceTransaction.findFirst({
        where: { tenantId: tenant.id, studentMembershipId: membership.id, kind: "LEGACY_OPENING_BALANCE" },
        select: { id: true },
      });
      if (!alreadyMigrated) {
        await tx.tenantBalanceTransaction.create({
          data: {
            tenantId: tenant.id,
            studentMembershipId: membership.id,
            accountId: account.id,
            kind: "LEGACY_OPENING_BALANCE",
            amount: legacyUser?.balance ?? 0,
            referenceType: "LEGACY_USER_BALANCE",
            referenceId: legacyUser?.id ?? membership.userId,
          },
        });
      }
    }
  });

  console.log(`Legacy tenant backfill complete: ${users.length} memberships mapped to ${slug}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Legacy tenant backfill failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
