import { describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({ findFirst: vi.fn(), access: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: { quiz: { findFirst: spies.findFirst } } }));
vi.mock("@/modules/courses/repository", () => ({ getTenantCourseContentAccess: spies.access }));

import { getAccessibleQuizForTenant } from "@/modules/quizzes/repository";

describe("tenant quiz repository", () => {
  it("always scopes opaque quiz IDs through their course tenant", async () => {
    spies.findFirst.mockResolvedValue(null);
    await getAccessibleQuizForTenant({
      tenantId: "tenant-alpha",
      quizId: "quiz-beta",
      actor: { tenantId: "tenant-alpha", tenantSlug: "alpha", hostname: "alpha.test", domainKind: "DEVELOPMENT", userId: "student-alpha", membershipId: "membership-alpha", role: "STUDENT" },
    });
    expect(spies.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "quiz-beta", course: { tenantId: "tenant-alpha" } },
    }));
    expect(spies.access).not.toHaveBeenCalled();
  });
});
