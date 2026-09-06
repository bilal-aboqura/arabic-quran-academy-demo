import { prisma } from "@/lib/prisma";
import { TenantStatus, TenantSubscriptionStatus, PlatformAdminRole, type Prisma } from "@prisma/client";
import { requirePlatformAdministrator, type PlatformActor } from "./authorization";
import { logPlatformAction } from "./audit";

export async function getPlatformOverviewMetrics() {
  const [
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    totalTeachers,
    totalStudents,
    totalCourses,
    totalSubscriptions,
    subscriptions,
    invoices,
    recentTenants,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { saasSubscription: { status: "TRIAL" } } }),
    prisma.tenant.count({ where: { status: "SUSPENDED" } }),
    prisma.tenantMembership.count({ where: { role: "TEACHER", status: "ACTIVE" } }),
    prisma.tenantMembership.count({ where: { role: "STUDENT", status: "ACTIVE" } }),
    prisma.course.count(),
    prisma.tenantSubscription.count(),
    prisma.tenantSubscription.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      include: { plan: { select: { price: true, billingIntervalMonths: true } } },
    }),
    prisma.saaSInvoice.findMany({
      where: { status: "PAID" },
      select: { amount: true },
    }),
    prisma.tenant.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        domains: { where: { isPrimary: true }, select: { hostname: true } },
        saasSubscription: { include: { plan: { select: { name: true } } } },
        memberships: {
          where: { role: "OWNER" },
          take: 1,
          include: { user: { select: { name: true, email: true } } },
        },
      },
    }),
  ]);

  // Calculate MRR from active subscriptions
  let mrr = 0;
  for (const sub of subscriptions) {
    const price = Number(sub.plan.price);
    const interval = Math.max(1, sub.plan.billingIntervalMonths);
    mrr += price / interval;
  }
  const arr = mrr * 12;

  // Calculate total SaaS revenue
  const totalSaaSRevenue = invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);

  // New tenants this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newTenantsThisMonth = await prisma.tenant.count({
    where: { createdAt: { gte: startOfMonth } },
  });

  // Upcoming renewals (within next 14 days)
  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingRenewals = await prisma.tenantSubscription.count({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { gte: now, lte: fourteenDaysLater },
    },
  });

  // Expired / overdue subscriptions
  const expiredSubscriptions = await prisma.tenantSubscription.count({
    where: {
      OR: [
        { status: { in: ["EXPIRED", "PAST_DUE"] } },
        { status: "ACTIVE", currentPeriodEnd: { lt: now } },
      ],
    },
  });

  return {
    totalTenants,
    activeTenants,
    trialTenants,
    suspendedTenants,
    totalTeachers,
    totalStudents,
    totalCourses,
    totalSubscriptions,
    mrr: Math.round(mrr),
    arr: Math.round(arr),
    totalSaaSRevenue: Math.round(totalSaaSRevenue),
    newTenantsThisMonth,
    upcomingRenewals,
    expiredSubscriptions,
    recentTenants,
  };
}

export async function listTenantsWithFilters(options?: {
  search?: string;
  status?: string;
  planId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(100, Math.max(1, options?.limit ?? 25));
  const skip = (page - 1) * limit;

  const where: Prisma.TenantWhereInput = {};

  const subWhere: Prisma.TenantSubscriptionWhereInput = {};
  if (options?.status === "TRIAL") {
    subWhere.status = "TRIAL";
  } else if (options?.status && options.status !== "ALL") {
    where.status = options.status as TenantStatus;
  }

  if (options?.planId && options.planId !== "ALL") {
    subWhere.planId = options.planId;
  }

  if (Object.keys(subWhere).length > 0) {
    where.saasSubscription = subWhere;
  }

  if (options?.search?.trim()) {
    const term = options.search.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { nameAr: { contains: term, mode: "insensitive" } },
      { slug: { contains: term, mode: "insensitive" } },
      {
        memberships: {
          some: {
            role: "OWNER",
            user: {
              OR: [
                { email: { contains: term, mode: "insensitive" } },
                { name: { contains: term, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    ];
  }

  const [total, tenants] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        domains: { select: { hostname: true, isPrimary: true, status: true } },
        saasSubscription: { include: { plan: true } },
        memberships: {
          where: { role: "OWNER" },
          take: 1,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: {
          select: {
            courses: true,
            memberships: true,
          },
        },
      },
    }),
  ]);

  return {
    tenants,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTenantDetail(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      domains: true,
      settings: true,
      site: { include: { template: true, pages: { where: { isHome: true }, select: { isPublished: true } } } },
      saasSubscription: { include: { plan: true } },
      saasInvoices: { orderBy: { createdAt: "desc" }, take: 10 },
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      },
      _count: {
        select: {
          courses: true,
          enrollments: true,
          activationCodes: true,
          messages: true,
          storeProducts: true,
          assignments: true,
          quizAttempts: true,
        },
      },
    },
  });

  if (!tenant) return null;

  const ownerMembership = tenant.memberships.find((m) => m.role === "OWNER");
  const teachersCount = tenant.memberships.filter((m) => m.role === "TEACHER").length;
  const studentsCount = tenant.memberships.filter((m) => m.role === "STUDENT").length;

  return {
    ...tenant,
    owner: ownerMembership?.user ?? null,
    teachersCount,
    studentsCount,
  };
}

export async function updateTenantDetails(args: {
  actor: PlatformActor;
  tenantId: string;
  name?: string;
  nameAr?: string;
  status?: TenantStatus;
  planId?: string;
  subscriptionStatus?: TenantSubscriptionStatus;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
  featureFlagOverrides?: Record<string, boolean>;
  limitOverrides?: Record<string, number | null>;
}) {
  requirePlatformAdministrator(args.actor);

  const tenant = await prisma.tenant.findUnique({ where: { id: args.tenantId } });
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  // Update tenant basics
  const updatedTenant = await prisma.tenant.update({
    where: { id: args.tenantId },
    data: {
      ...(args.name ? { name: args.name.trim() } : {}),
      ...(args.nameAr ? { nameAr: args.nameAr.trim() } : {}),
      ...(args.status ? { status: args.status } : {}),
    },
  });

  // Update subscription if provided
  if (args.planId || args.subscriptionStatus || args.currentPeriodEnd !== undefined || args.featureFlagOverrides || args.limitOverrides) {
    const existingSub = await prisma.tenantSubscription.findUnique({
      where: { tenantId: args.tenantId },
    });

    const planId = args.planId ?? existingSub?.planId;
    if (planId) {
      await prisma.tenantSubscription.upsert({
        where: { tenantId: args.tenantId },
        update: {
          planId,
          ...(args.subscriptionStatus ? { status: args.subscriptionStatus } : {}),
          ...(args.currentPeriodEnd !== undefined ? { currentPeriodEnd: args.currentPeriodEnd } : {}),
          ...(args.trialEndsAt !== undefined ? { trialEndsAt: args.trialEndsAt } : {}),
          ...(args.featureFlagOverrides ? { featureFlagOverrides: args.featureFlagOverrides } : {}),
          ...(args.limitOverrides ? { limitOverrides: args.limitOverrides } : {}),
        },
        create: {
          tenantId: args.tenantId,
          planId,
          status: args.subscriptionStatus ?? "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: args.currentPeriodEnd ?? null,
          trialEndsAt: args.trialEndsAt ?? null,
          featureFlagOverrides: args.featureFlagOverrides ?? {},
          limitOverrides: args.limitOverrides ?? {},
        },
      });
    }
  }

  await logPlatformAction({
    actor: args.actor,
    action: "UPDATE_TENANT",
    targetType: "TENANT",
    targetId: args.tenantId,
    metadata: {
      status: args.status,
      planId: args.planId,
      subscriptionStatus: args.subscriptionStatus,
    },
  });

  return updatedTenant;
}

export async function createTenantWithPlan(args: {
  actor: PlatformActor;
  name: string;
  nameAr?: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
  planId: string;
  trialDays?: number;
}) {
  requirePlatformAdministrator(args.actor);

  const cleanSlug = args.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();
  if (!cleanSlug) throw new Error("INVALID_SLUG");

  const existingSlug = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existingSlug) throw new Error("SLUG_ALREADY_EXISTS");

  const plan = await prisma.saaSPlan.findUnique({ where: { id: args.planId } });
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  // Find or create owner user
  let owner = await prisma.user.findUnique({ where: { email: args.ownerEmail.trim().toLowerCase() } });
  if (!owner) {
    const { hash } = await import("bcryptjs");
    const { randomBytes } = await import("node:crypto");
    // No reusable provisioning credential. The normal password-reset flow is
    // used to deliver access to newly invited owners.
    const defaultPassword = await hash(randomBytes(48).toString("base64url"), 12);
    owner = await prisma.user.create({
      data: {
        email: args.ownerEmail.trim().toLowerCase(),
        name: args.ownerName.trim() || args.ownerEmail.split("@")[0],
        password: defaultPassword,
        role: "ADMIN",
      },
    });
  }

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug: cleanSlug,
      name: args.name.trim(),
      nameAr: args.nameAr?.trim() || args.name.trim(),
      status: "ACTIVE",
      settings: {
        create: {
          platformName: args.name.trim(),
          platformNameEn: args.name.trim(),
          primaryColor: "#0f766e",
        },
      },
      domains: {
        create: {
          hostname: `${cleanSlug}.localhost`,
          isPrimary: true,
          status: "ACTIVE",
          kind: "SUBDOMAIN",
        },
      },
      memberships: {
        create: {
          userId: owner.id,
          role: "OWNER",
          status: "ACTIVE",
          displayName: owner.name,
        },
      },
    },
  });

  // Attach SaaS Subscription
  const trialDays = args.trialDays ?? (plan.trialMonths * 30);
  const now = new Date();
  const trialEndsAt = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;
  const currentPeriodEnd = new Date(now);
  currentPeriodEnd.setUTCMonth(currentPeriodEnd.getUTCMonth() + plan.billingIntervalMonths);

  await prisma.tenantSubscription.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      status: trialDays > 0 ? "TRIAL" : "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd,
      trialEndsAt,
    },
  });

  await logPlatformAction({
    actor: args.actor,
    action: "CREATE_TENANT",
    targetType: "TENANT",
    targetId: tenant.id,
    metadata: {
      slug: cleanSlug,
      planCode: plan.code,
      ownerEmail: owner.email,
    },
  });

  return tenant;
}

export async function recordTenantSaaSPayment(args: {
  actor: PlatformActor;
  tenantId: string;
  planId?: string;
  amount: number;
  currency?: string;
  periodMonths?: number;
  provider?: string;
  transactionId?: string;
  notes?: string;
}) {
  requirePlatformAdministrator(args.actor);

  const tenant = await prisma.tenant.findUnique({
    where: { id: args.tenantId },
    include: { saasSubscription: true },
  });
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  const now = new Date();
  const months = Math.max(1, args.periodMonths ?? 1);
  const periodEnd = new Date(now);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + months);

  const invoice = await prisma.saaSInvoice.create({
    data: {
      tenantId: args.tenantId,
      planId: args.planId ?? tenant.saasSubscription?.planId,
      amount: args.amount,
      currency: args.currency ?? "EGP",
      status: "PAID",
      periodStart: now,
      periodEnd,
      provider: args.provider ?? "MANUAL",
      transactionId: args.transactionId ?? `NC-TX-${Date.now()}`,
      notes: args.notes,
    },
  });

  // Extend or activate subscription
  if (tenant.saasSubscription) {
    const newEnd = tenant.saasSubscription.currentPeriodEnd && tenant.saasSubscription.currentPeriodEnd > now
      ? new Date(tenant.saasSubscription.currentPeriodEnd)
      : new Date(now);
    newEnd.setUTCMonth(newEnd.getUTCMonth() + months);

    await prisma.tenantSubscription.update({
      where: { tenantId: args.tenantId },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: newEnd,
      },
    });
  }

  await logPlatformAction({
    actor: args.actor,
    action: "RECORD_SAAS_PAYMENT",
    targetType: "SAAS_INVOICE",
    targetId: invoice.id,
    metadata: {
      tenantId: args.tenantId,
      amount: args.amount,
      periodMonths: months,
    },
  });

  return invoice;
}

export async function listPlatformAdministrators() {
  return prisma.platformAdministrator.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function grantPlatformAdministratorRole(args: {
  actor: PlatformActor;
  email: string;
  role: PlatformAdminRole;
}) {
  requirePlatformAdministrator(args.actor);

  const user = await prisma.user.findUnique({
    where: { email: args.email.trim().toLowerCase() },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const grant = await prisma.platformAdministrator.upsert({
    where: { userId: user.id },
    update: { role: args.role, isActive: true },
    create: { userId: user.id, role: args.role, isActive: true },
    include: { user: { select: { email: true, name: true } } },
  });

  await logPlatformAction({
    actor: args.actor,
    action: "GRANT_PLATFORM_ADMIN",
    targetType: "USER",
    targetId: user.id,
    metadata: { role: args.role, email: user.email },
  });

  return grant;
}

export async function togglePlatformAdministratorStatus(args: {
  actor: PlatformActor;
  adminId: string;
  isActive: boolean;
}) {
  requirePlatformAdministrator(args.actor);

  const admin = await prisma.platformAdministrator.findUnique({
    where: { id: args.adminId },
  });
  if (!admin) throw new Error("ADMIN_NOT_FOUND");

  // Prevent disabling oneself
  if (admin.userId === args.actor.userId) {
    throw new Error("CANNOT_MODIFY_OWN_STATUS");
  }

  const updated = await prisma.platformAdministrator.update({
    where: { id: args.adminId },
    data: { isActive: args.isActive },
  });

  await logPlatformAction({
    actor: args.actor,
    action: args.isActive ? "ACTIVATE_PLATFORM_ADMIN" : "DEACTIVATE_PLATFORM_ADMIN",
    targetType: "PLATFORM_ADMIN",
    targetId: args.adminId,
    metadata: { isActive: args.isActive },
  });

  return updated;
}
