import { describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  courseCount: vi.fn(), enrollmentFindMany: vi.fn(), quizAttemptFindMany: vi.fn(), paymentAggregate: vi.fn(),
  homeworkCount: vi.fn(), storeAggregate: vi.fn(), subscriptionAggregate: vi.fn(), membershipFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {
  course: { count: spies.courseCount }, enrollment: { findMany: spies.enrollmentFindMany },
  quizAttempt: { findMany: spies.quizAttemptFindMany }, payment: { aggregate: spies.paymentAggregate },
  homeworkSubmission: { count: spies.homeworkCount }, userStorePurchase: { aggregate: spies.storeAggregate },
  userPlatformSubscription: { aggregate: spies.subscriptionAggregate }, tenantMembership: { findMany: spies.membershipFindMany },
} }));

import { getTenantAnalytics } from "@/modules/analytics/repository";
import type { TenantActor } from "@/modules/tenants/types";

const admin: TenantActor = { tenantId: "alpha", tenantSlug: "alpha", hostname: "alpha.test", domainKind: "DEVELOPMENT", userId: "admin-a", membershipId: "membership-a", role: "ADMIN" };
const teacher: TenantActor = { ...admin, userId: "teacher-a", role: "TEACHER" };

function mockEmptyResults() {
  spies.courseCount.mockResolvedValue(0);
  spies.enrollmentFindMany.mockResolvedValue([]);
  spies.quizAttemptFindMany.mockResolvedValue([]);
  spies.paymentAggregate.mockResolvedValue({ _sum: { amount: 0 } });
  spies.homeworkCount.mockResolvedValue(0);
  spies.storeAggregate.mockResolvedValue({ _sum: { pricePaid: 0 } });
  spies.subscriptionAggregate.mockResolvedValue({ _sum: { pricePaid: 0 } });
  spies.membershipFindMany.mockResolvedValue([]);
}

describe("tenant analytics repository", () => {
  it("adds alpha to every staff aggregate instead of aggregating global rows", async () => {
    mockEmptyResults();
    await getTenantAnalytics("alpha", admin);
    expect(spies.courseCount).toHaveBeenCalledWith({ where: { tenantId: "alpha" } });
    expect(spies.paymentAggregate).toHaveBeenCalledWith({ where: { tenantId: "alpha", course: { tenantId: "alpha" } }, _sum: { amount: true } });
    expect(spies.storeAggregate).toHaveBeenCalledWith({ where: { tenantId: "alpha" }, _sum: { pricePaid: true } });
    expect(spies.subscriptionAggregate).toHaveBeenCalledWith({ where: { tenantId: "alpha" }, _sum: { pricePaid: true } });
    expect(spies.membershipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "alpha", role: "STUDENT", status: "ACTIVE" } }));
  });

  it("limits teacher reporting to courses created by that teacher in the active tenant", async () => {
    mockEmptyResults();
    await getTenantAnalytics("alpha", teacher);
    const expectedCourse = { tenantId: "alpha", createdById: "teacher-a" };
    expect(spies.courseCount).toHaveBeenCalledWith({ where: expectedCourse });
    expect(spies.paymentAggregate).toHaveBeenCalledWith({ where: { tenantId: "alpha", course: expectedCourse }, _sum: { amount: true } });
    expect(spies.quizAttemptFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "alpha", quiz: { course: expectedCourse } } }));
  });
});
