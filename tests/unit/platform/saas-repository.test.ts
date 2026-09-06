import { describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  planFindMany: vi.fn(), planFindUnique: vi.fn(), planUpsert: vi.fn(),
  tenantFindUnique: vi.fn(), subscriptionFindUnique: vi.fn(), subscriptionUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {
  saaSPlan: { findMany: spies.planFindMany, findUnique: spies.planFindUnique, upsert: spies.planUpsert },
  tenant: { findUnique: spies.tenantFindUnique },
  tenantSubscription: { findUnique: spies.subscriptionFindUnique, upsert: spies.subscriptionUpsert },
} }));

import {
  getTenantSaaSCapabilities,
  listSaaSPlans,
  setTenantSubscription,
  tenantHasSaaSFeature,
  upsertSaaSPlan,
} from "@/modules/platform/saas.repository";

const platformAdmin = { userId: "platform-admin", administratorId: "grant-1" };

describe("platform SaaS repository", () => {
  it("does not derive platform authority from a tenant role", async () => {
    await expect(upsertSaaSPlan({ actor: null as never, input: { code: "launch", name: "Launch" } })).rejects.toThrow("PLATFORM_ADMIN_REQUIRED");
    expect(spies.planUpsert).not.toHaveBeenCalled();
  });

  it("stores configurable plan price, feature flags, and limits rather than hard-coding an offer", async () => {
    spies.planUpsert.mockResolvedValue({ id: "plan-1" });
    await upsertSaaSPlan({ actor: platformAdmin, input: {
      code: "launch", name: "Launch", price: 180, billingIntervalMonths: 1, trialMonths: 3,
      featureFlags: { customDomain: true, multiTeacher: true }, limits: { maxStudents: 500, maxStorage: 25 },
    } });
    expect(spies.planUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { code: "launch" },
      create: expect.objectContaining({ price: 180, trialMonths: 3, featureFlags: { customDomain: true, multiTeacher: true, advancedAnalytics: false, websiteTemplate: true, advancedWebsiteBuilder: false }, limits: expect.objectContaining({ maxStudents: 500, maxStorage: 25 }) }),
    }));
  });

  it("assigns an academy subscription only after checking both platform records", async () => {
    spies.tenantFindUnique.mockResolvedValue({ id: "alpha" });
    spies.planFindUnique.mockResolvedValue({ id: "plan-1", trialMonths: 3 });
    spies.subscriptionUpsert.mockResolvedValue({ id: "sub-1" });
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-02-01T00:00:00.000Z");
    await setTenantSubscription({ actor: platformAdmin, tenantId: "alpha", planId: "plan-1", status: "ACTIVE", currentPeriodStart: start, currentPeriodEnd: end, featureFlagOverrides: { advancedAnalytics: true } });
    expect(spies.tenantFindUnique).toHaveBeenCalledWith({ where: { id: "alpha" }, select: { id: true } });
    expect(spies.planFindUnique).toHaveBeenCalledWith({ where: { id: "plan-1" }, select: { id: true, trialMonths: true } });
    expect(spies.subscriptionUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: "alpha" }, create: expect.objectContaining({ tenantId: "alpha", planId: "plan-1", featureFlagOverrides: { advancedAnalytics: true } }),
      update: expect.objectContaining({ plan: { connect: { id: "plan-1" } } }),
    }));
  });

  it("derives a trial end from the plan instead of creating an unlimited trial", async () => {
    spies.tenantFindUnique.mockResolvedValue({ id: "alpha" });
    spies.planFindUnique.mockResolvedValue({ id: "plan-1", trialMonths: 3 });
    spies.subscriptionUpsert.mockResolvedValue({ id: "sub-1" });
    await setTenantSubscription({ actor: platformAdmin, tenantId: "alpha", planId: "plan-1", status: "TRIAL", currentPeriodStart: new Date("2026-01-15T00:00:00.000Z") });
    expect(spies.subscriptionUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ trialEndsAt: new Date("2026-04-15T00:00:00.000Z") }),
    }));
  });

  it("merges a plan with explicit tenant overrides and refuses expired capabilities", async () => {
    spies.subscriptionFindUnique.mockResolvedValue({
      status: "ACTIVE", currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"), trialEndsAt: null,
      featureFlagOverrides: { advancedAnalytics: true }, limitOverrides: { maxStudents: 750 },
      plan: { id: "plan-1", code: "launch", name: "Launch", featureFlags: { customDomain: true }, limits: { maxStudents: 500, maxCourses: 20 } },
    });
    const capabilities = await getTenantSaaSCapabilities("alpha", new Date("2026-01-10T00:00:00.000Z"));
    expect(capabilities).toMatchObject({ active: true, features: { customDomain: true, multiTeacher: false, advancedAnalytics: true }, limits: { maxStudents: 750, maxCourses: 20 } });
    expect(await tenantHasSaaSFeature("alpha", "customDomain", new Date("2026-03-01T00:00:00.000Z"))).toBe(false);
  });

  it("only exposes active plans in the tenant-facing catalogue", async () => {
    spies.planFindMany.mockResolvedValue([]);
    await listSaaSPlans(true);
    expect(spies.planFindMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  });
});
