import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Seeding is disabled in production environments. Set ALLOW_PRODUCTION_SEED=true if you explicitly intend to seed."
    );
  }

  console.log("Seeding database...");

  // 1. Default Tenant
  const tenantId = "c-default-academy";
  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      id: tenantId,
      slug: "default",
      name: "Default Academy",
      nameAr: "منصة أستاذ عصام محي",
      status: "ACTIVE",
    },
  });

  // 2. Domains
  for (const hostname of ["localhost", "127.0.0.1"]) {
    await prisma.tenantDomain.upsert({
      where: { hostname },
      update: { tenantId: tenant.id, status: "ACTIVE" },
      create: {
        tenantId: tenant.id,
        hostname,
        kind: "CUSTOM",
        status: "ACTIVE",
        isPrimary: hostname === "localhost",
        verifiedAt: new Date(),
      },
    });
  }

  // 3. Tenant Settings
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      platformName: "منصة أستاذ عصام محي",
      platformNameEn: "Essam Mohy Platform",
      primaryColor: "#0f766e",
      contactDetails: {
        whatsapp: "966553612356",
        facebook: "https://www.facebook.com/profile.php?id=61562686209159",
      },
    },
  });

  // 4. Admin Users
  const adminPassword = await hash("123456", 12);
  const assistantPassword = await hash("123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      email: "admin@gmail.com",
      password: adminPassword,
      name: "ادمن",
      role: "ADMIN",
    },
  });

  const assistant = await prisma.user.upsert({
    where: { email: "assistant@gmail.com" },
    update: {},
    create: {
      email: "assistant@gmail.com",
      password: assistantPassword,
      name: "مساعد ادمن",
      role: "ASSISTANT_ADMIN",
    },
  });

  // 5. Memberships
  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: admin.id } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      userId: admin.id,
      role: "OWNER",
      status: "ACTIVE",
      displayName: "ادمن",
    },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: assistant.id } },
    update: { role: "ASSISTANT", status: "ACTIVE" },
    create: {
      tenantId: tenant.id,
      userId: assistant.id,
      role: "ASSISTANT",
      status: "ACTIVE",
      displayName: "مساعد ادمن",
    },
  });

  // 5.1 Platform Administrator (NexaClass Owner Authority)
  await prisma.platformAdministrator.upsert({
    where: { userId: admin.id },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: {
      userId: admin.id,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  // 5.2 NexaClass SaaS Plans
  const launchPlan = await prisma.saaSPlan.upsert({
    where: { code: "launch-3990" },
    update: {},
    create: {
      code: "launch-3990",
      name: "NexaClass Launch Offer (عرض الانطلاق)",
      description: "3990 EGP launch offer with first 3 months included, then 180 EGP monthly.",
      currency: "EGP",
      price: 3990,
      billingIntervalMonths: 3,
      trialMonths: 3,
      featureFlags: { customDomain: true, multiTeacher: true, advancedAnalytics: true, websiteTemplate: true, advancedWebsiteBuilder: false },
      limits: { maxStudents: 500, maxCourses: 20, maxTeachers: 5, maxStorage: 50 },
      isActive: true,
      sortOrder: 1,
    },
  });

  await prisma.saaSPlan.upsert({
    where: { code: "starter" },
    update: {},
    create: {
      code: "starter",
      name: "Starter Plan (الباقة الأساسية)",
      description: "Standard monthly subscription for single teacher academy.",
      currency: "EGP",
      price: 180,
      billingIntervalMonths: 1,
      trialMonths: 0,
      featureFlags: { customDomain: false, multiTeacher: false, advancedAnalytics: false, websiteTemplate: true, advancedWebsiteBuilder: false },
      limits: { maxStudents: 200, maxCourses: 10, maxTeachers: 1, maxStorage: 20 },
      isActive: true,
      sortOrder: 2,
    },
  });

  await prisma.saaSPlan.upsert({
    where: { code: "pro-growth" },
    update: {},
    create: {
      code: "pro-growth",
      name: "Academy Pro (باقة الأكاديميات الكبرى)",
      description: "Full features, custom domain, multiple teachers, advanced analytics, unlimited scale.",
      currency: "EGP",
      price: 450,
      billingIntervalMonths: 1,
      trialMonths: 0,
      featureFlags: { customDomain: true, multiTeacher: true, advancedAnalytics: true, websiteTemplate: true, advancedWebsiteBuilder: false },
      limits: { maxStudents: null, maxCourses: null, maxTeachers: null, maxStorage: null },
      isActive: true,
      sortOrder: 3,
    },
  });

  // 5.3 Tenant SaaS Subscription
  const threeMonthsLater = new Date();
  threeMonthsLater.setUTCMonth(threeMonthsLater.getUTCMonth() + 3);

  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: { planId: launchPlan.id, status: "ACTIVE", currentPeriodEnd: threeMonthsLater },
    create: {
      tenantId: tenant.id,
      planId: launchPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: threeMonthsLater,
      trialEndsAt: threeMonthsLater,
    },
  });

  // 5.4 SaaS Invoice
  const existingInvoice = await prisma.saaSInvoice.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!existingInvoice) {
    await prisma.saaSInvoice.create({
      data: {
        tenantId: tenant.id,
        planId: launchPlan.id,
        amount: 3990,
        currency: "EGP",
        status: "PAID",
        periodStart: new Date(),
        periodEnd: threeMonthsLater,
        provider: "MANUAL",
        transactionId: "NC-LAUNCH-001",
        notes: "NexaClass initial 3-month launch setup package.",
      },
    });
  }

  // 6. Categories
  const programmingCategory = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "programming" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Programming",
      nameAr: "البرمجة",
      slug: "programming",
      description: "دورات البرمجة وتطوير البرمجيات",
      order: 1,
    },
  });

  // 7. Sample Course
  const course = await prisma.course.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "nextjs-basics" } },
    update: {},
    create: {
      tenantId: tenant.id,
      categoryId: programmingCategory.id,
      createdById: admin.id,
      title: "Next.js من الصفر",
      titleAr: "Next.js من الصفر",
      slug: "nextjs-basics",
      description: "تعلم بناء تطبيقات ويب حديثة باستخدام Next.js و React.",
      shortDesc: "تعلم Next.js و React خطوة بخطوة",
      price: 0,
      isPublished: true,
    },
  });

  // 8. Sample Lessons
  await prisma.lesson.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "intro-nextjs" } },
    update: {},
    create: {
      courseId: course.id,
      title: "مقدمة إلى Next.js",
      titleAr: "مقدمة إلى Next.js",
      slug: "intro-nextjs",
      content: "نظرة عامة على الإطار وكيفية إعداد المشروع.",
      order: 1,
    },
  });

  console.log("Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
