import { Prisma, TenantSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdministrator, type PlatformActor } from "@/modules/platform/authorization";

export const SAAS_FEATURE_KEYS = ["customDomain", "multiTeacher", "advancedAnalytics", "websiteTemplate", "advancedWebsiteBuilder"] as const;
export type SaaSFeatureKey = (typeof SAAS_FEATURE_KEYS)[number];
export const SAAS_LIMIT_KEYS = ["maxStudents", "maxCourses", "maxTeachers", "maxStorage"] as const;
export type SaaSLimitKey = (typeof SAAS_LIMIT_KEYS)[number];

export type SaaSFeatureFlags = Partial<Record<SaaSFeatureKey, boolean>>;
/** null represents an intentionally unlimited limit; omitted inherits unlimited. */
export type SaaSLimits = Partial<Record<SaaSLimitKey, number | null>>;

export const DEFAULT_SAAS_FEATURE_FLAGS: Required<SaaSFeatureFlags> = {
  customDomain: false,
  multiTeacher: false,
  advancedAnalytics: false,
  websiteTemplate: true,
  advancedWebsiteBuilder: false,
};
export const DEFAULT_SAAS_LIMITS: Required<SaaSLimits> = {
  maxStudents: null,
  maxCourses: null,
  maxTeachers: null,
  maxStorage: null,
};

export type SaaSPlanInput = {
  code: string;
  name: string;
  description?: string;
  currency?: string;
  price?: number;
  billingIntervalMonths?: number;
  trialMonths?: number;
  featureFlags?: SaaSFeatureFlags;
  limits?: SaaSLimits;
  isActive?: boolean;
  sortOrder?: number;
};

type JsonRecord = Record<string, unknown>;
function object(value: Prisma.JsonValue | null | undefined): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function featureOverrides(value: unknown): SaaSFeatureFlags {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
  const result: SaaSFeatureFlags = {};
  for (const key of SAAS_FEATURE_KEYS) {
    if (input[key] !== undefined && typeof input[key] !== "boolean") throw new Error("INVALID_SAAS_FEATURE_FLAGS");
    if (typeof input[key] === "boolean") result[key] = input[key] as boolean;
  }
  return result;
}

function normalizeLimits(value: unknown): Required<SaaSLimits> {
  return { ...DEFAULT_SAAS_LIMITS, ...limitOverrides(value) };
}

function limitOverrides(value: unknown): SaaSLimits {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
  const result: SaaSLimits = {};
  for (const key of SAAS_LIMIT_KEYS) {
    const candidate = input[key];
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate !== "number" || !Number.isSafeInteger(candidate) || candidate < 0) throw new Error("INVALID_SAAS_LIMITS");
    result[key] = candidate;
  }
  return result;
}

function normalizeFeatureFlags(value: unknown): Required<SaaSFeatureFlags> {
  return { ...DEFAULT_SAAS_FEATURE_FLAGS, ...featureOverrides(value) };
}

function validatePlanInput(input: SaaSPlanInput) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.code)) throw new Error("INVALID_SAAS_PLAN_CODE");
  if (!input.name.trim()) throw new Error("SAAS_PLAN_NAME_REQUIRED");
  if (input.currency !== undefined && !/^[A-Za-z]{3}$/.test(input.currency)) throw new Error("INVALID_SAAS_CURRENCY");
  if (input.price !== undefined && (!Number.isFinite(input.price) || input.price < 0)) throw new Error("INVALID_SAAS_PRICE");
  if (input.billingIntervalMonths !== undefined && (!Number.isSafeInteger(input.billingIntervalMonths) || input.billingIntervalMonths < 1 || input.billingIntervalMonths > 36)) throw new Error("INVALID_BILLING_INTERVAL");
  if (input.trialMonths !== undefined && (!Number.isSafeInteger(input.trialMonths) || input.trialMonths < 0 || input.trialMonths > 24)) throw new Error("INVALID_TRIAL_PERIOD");
  normalizeFeatureFlags(input.featureFlags);
  normalizeLimits(input.limits);
}

export async function listSaaSPlans(activeOnly = false) {
  return prisma.saaSPlan.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function upsertSaaSPlan(args: { actor: PlatformActor; input: SaaSPlanInput }) {
  requirePlatformAdministrator(args.actor);
  validatePlanInput(args.input);
  const input = args.input;
  const data = {
    name: input.name.trim().slice(0, 120),
    description: (input.description ?? "").trim().slice(0, 4_000),
    currency: (input.currency ?? "EGP").toUpperCase(),
    price: input.price ?? 0,
    billingIntervalMonths: input.billingIntervalMonths ?? 1,
    trialMonths: input.trialMonths ?? 0,
    featureFlags: normalizeFeatureFlags(input.featureFlags),
    limits: normalizeLimits(input.limits),
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  } satisfies Prisma.SaaSPlanUpdateInput;
  return prisma.saaSPlan.upsert({ where: { code: input.code }, create: { code: input.code, ...data }, update: data });
}

export async function setTenantSubscription(args: {
  actor: PlatformActor;
  tenantId: string;
  planId: string;
  status: TenantSubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
  featureFlagOverrides?: SaaSFeatureFlags;
  limitOverrides?: SaaSLimits;
}) {
  requirePlatformAdministrator(args.actor);
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: args.tenantId }, select: { id: true } }),
    prisma.saaSPlan.findUnique({ where: { id: args.planId }, select: { id: true, trialMonths: true } }),
  ]);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  if (!plan) throw new Error("SAAS_PLAN_NOT_FOUND");
  const currentPeriodStart = args.currentPeriodStart ?? new Date();
  if (args.currentPeriodEnd && args.currentPeriodEnd <= currentPeriodStart) throw new Error("INVALID_SUBSCRIPTION_PERIOD");
  const defaultTrialEnd = new Date(currentPeriodStart);
  defaultTrialEnd.setUTCMonth(defaultTrialEnd.getUTCMonth() + plan.trialMonths);
  const trialEndsAt = args.status === "TRIAL" ? (args.trialEndsAt ?? defaultTrialEnd) : args.trialEndsAt ?? null;
  if (args.status === "TRIAL" && (!trialEndsAt || trialEndsAt <= currentPeriodStart)) throw new Error("INVALID_TRIAL_PERIOD");
  const featureFlagOverrides = featureOverrides(args.featureFlagOverrides);
  const limitOverrideValues = limitOverrides(args.limitOverrides);
  const data = {
    status: args.status,
    currentPeriodStart,
    currentPeriodEnd: args.currentPeriodEnd ?? null,
    trialEndsAt,
    canceledAt: args.status === "CANCELED" ? new Date() : null,
    featureFlagOverrides,
    limitOverrides: limitOverrideValues,
  } satisfies Omit<Prisma.TenantSubscriptionUpdateInput, "plan">;
  return prisma.tenantSubscription.upsert({
    where: { tenantId: args.tenantId },
    create: { tenantId: args.tenantId, planId: args.planId, ...data },
    update: { ...data, plan: { connect: { id: args.planId } } },
  });
}

function isSubscriptionUsable(subscription: { status: TenantSubscriptionStatus; currentPeriodEnd: Date | null; trialEndsAt: Date | null }, now: Date) {
  if (subscription.status !== "ACTIVE" && subscription.status !== "TRIAL") return false;
  if (subscription.status === "TRIAL" && subscription.trialEndsAt && subscription.trialEndsAt <= now) return false;
  return !subscription.currentPeriodEnd || subscription.currentPeriodEnd > now;
}

export async function getTenantSaaSCapabilities(tenantId: string, now = new Date()) {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: { select: { id: true, code: true, name: true, featureFlags: true, limits: true } } },
  });
  if (!subscription) return { subscription: null, active: false, features: { ...DEFAULT_SAAS_FEATURE_FLAGS }, limits: { ...DEFAULT_SAAS_LIMITS } };
  const features = { ...DEFAULT_SAAS_FEATURE_FLAGS, ...featureOverrides(object(subscription.plan.featureFlags)), ...featureOverrides(object(subscription.featureFlagOverrides)) };
  const limits = { ...DEFAULT_SAAS_LIMITS, ...limitOverrides(object(subscription.plan.limits)), ...limitOverrides(object(subscription.limitOverrides)) };
  return { subscription, active: isSubscriptionUsable(subscription, now), features, limits };
}

export async function tenantHasSaaSFeature(tenantId: string, feature: SaaSFeatureKey, now = new Date()) {
  const capabilities = await getTenantSaaSCapabilities(tenantId, now);
  return capabilities.active && capabilities.features[feature];
}
